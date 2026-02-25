// supabase/functions/oauth-ghl-callback/index.ts
// Supabase Edge Function — GHL OAuth 2.0 Callback Handler with Auto-Onboarding
// Deploy: supabase functions deploy oauth-ghl-callback

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GHL_CLIENT_ID = Deno.env.get("GHL_CLIENT_ID") ?? "";
const GHL_CLIENT_SECRET = Deno.env.get("GHL_CLIENT_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Cuántos segundos antes del vencimiento refrescamos el token (5 min margen)
const TOKEN_REFRESH_MARGIN_SECONDS = 300;

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

    // Use admin client for Auth & DB upserts
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        // GHL también envía el dealerId que guardamos como state en el authorize link
        const stateDealerId = url.searchParams.get("state") ?? null;

        if (!code) {
            return errorResponse("MISSING_CODE", "No se recibió authorization code de GHL.", 400);
        }

        // ── 1. Intercambiar code por tokens ────────────────────────────
        const tokenRes = await fetch("https://services.leadconnectorhq.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: GHL_CLIENT_ID,
                client_secret: GHL_CLIENT_SECRET,
                grant_type: "authorization_code",
                code,
                redirect_uri: `${SUPABASE_URL}/functions/v1/oauth-ghl-callback`,
            }),
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            console.error("Token exchange error:", err);
            return errorResponse("TOKEN_EXCHANGE_FAILED", "Error intercambiando el código OAuth.", 502);
        }

        const {
            access_token,
            refresh_token,
            expires_in,    // segundos
            locationId,
        } = await tokenRes.json();

        const expiresAt = new Date(Date.now() + (expires_in - TOKEN_REFRESH_MARGIN_SECONDS) * 1000);

        // ── 2. Obtener info del Location ─────────────────────────────
        let locationName = "Dealer";
        let locationPhone = null;
        let locationLogo = null;
        let locationAddress = null;
        let locationWebsite = null;

        const locRes = await fetch(`https://services.leadconnectorhq.com/locations/${locationId}`, {
            headers: { Authorization: `Bearer ${access_token}`, Version: "2021-07-28" }
        });

        if (locRes.ok) {
            const locData = await locRes.json();
            const loc = locData.location;
            if (loc) {
                locationName = loc.name ?? locationName;
                locationPhone = loc.phone ?? null;
                locationLogo = loc.logoUrl ?? null;
                locationWebsite = loc.website ?? null;
                if (loc.address || loc.city || loc.state) {
                    locationAddress = `${loc.address || ''}, ${loc.city || ''}, ${loc.state || ''} ${loc.postalCode || ''}`.trim().replace(/^,|,$/g, '');
                }
            }
        }

        // ── 3. Upsert en tabla dealers ─────────────────────────────────
        const dealerIdToUse = (stateDealerId && stateDealerId.length > 5 && stateDealerId !== 'undefined') ? stateDealerId : undefined;

        const { data: dealerData, error: upsertErr } = await admin
            .from("dealers")
            .upsert(
                {
                    id: dealerIdToUse, // si existe lo actualiza, sino genera UUID nuevo
                    nombre: locationName,
                    ghl_location_id: locationId,
                    ghl_access_token: access_token,
                    ghl_refresh_token: refresh_token,
                    ghl_token_expires_at: expiresAt.toISOString(),
                    phone: locationPhone,
                    logo_url: locationLogo,
                    address: locationAddress,
                    website: locationWebsite,
                    activo: true,
                },
                { onConflict: "ghl_location_id" }
            )
            .select()
            .single();

        if (upsertErr || !dealerData) {
            console.error("Supabase upsert error:", upsertErr);
            return errorResponse("DB_ERROR", "Error guardando datos del dealer.", 500);
        }

        const validDealerId = dealerData.id;

        // ── 4. Sincronización Masiva de Usuarios ───────────────────────
        try {
            const userRes = await fetch(`https://services.leadconnectorhq.com/users/?locationId=${locationId}`, {
                headers: { 'Authorization': `Bearer ${access_token}`, 'Version': '2021-07-28', 'Accept': 'application/json' }
            });

            if (userRes.ok) {
                const userData = await userRes.json();
                if (userData.users && Array.isArray(userData.users)) {

                    // Obtener usuarios existentes
                    const { data: existingUsers } = await admin.from('usuarios').select('id, correo').eq('dealer_id', validDealerId);
                    const existingMap = new Map((existingUsers || []).map((u: any) => [u.correo.toLowerCase(), u.id]));

                    const upsertBatch = [];

                    for (const u of userData.users) {
                        const uEmail = (u.email || '').trim().toLowerCase();
                        if (!uEmail) continue;

                        let userId = existingMap.get(uEmail);

                        // Si no existe, crearlo silenciosamente
                        if (!userId) {
                            const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
                                type: 'magiclink',
                                email: uEmail,
                                options: { data: { name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || uEmail.split('@')[0], ghl_location_id: locationId, source: 'ghl_sso_mass_callback' } }
                            });

                            if (linkData?.user) {
                                userId = linkData.user.id;
                                existingMap.set(uEmail, userId); // map to prevent duplicate loops
                            } else {
                                console.warn("Skip mass sync user", uEmail, linkErr?.message);
                                continue;
                            }
                        }

                        // Calcular Rol
                        const ghlRole = u.roles?.role || u.roles?.type || 'usuario';
                        let mappedRol = (ghlRole.toLowerCase().includes('admin') || ghlRole.toLowerCase().includes('agency')) ? 'admin' : 'vendedor';

                        // ⭐ FORZAR ADMIN AL CREADOR (Hardcode rule)
                        if (uEmail === 'jeancarlosgf1313@gmail.com') {
                            mappedRol = 'admin';
                        }

                        upsertBatch.push({
                            id: userId,
                            correo: uEmail,
                            nombre: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || uEmail.split('@')[0],
                            dealer_id: validDealerId,
                            phone: u.phone || null,
                            avatar_url: u.profilePhoto || null,
                            role_en_ghl: ghlRole,
                            rol: mappedRol
                        });
                    }

                    // Upsert masivo a la DB
                    if (upsertBatch.length > 0) {
                        const { error: bulkErr } = await admin.from('usuarios').upsert(upsertBatch, { onConflict: 'id' });
                        if (bulkErr) console.error("Mass upsert error:", bulkErr);
                        else console.log(`Mass sync done for ${upsertBatch.length} users.`);
                    }
                }
            } else {
                console.warn(`GHL Users fetch failed: ${userRes.status}`);
            }
        } catch (e) {
            console.error("Error fetching GHL users:", e);
        }

        // ── 5. Redirigir al usuario al dashboard ───────────────────────
        return Response.redirect("https://carbotsystem.com?oauth=success", 302);

    } catch (err) {
        console.error("Unexpected error:", err);
        return errorResponse("SERVER_ERROR", "Error interno del servidor.", 500);
    }
});

function errorResponse(code: string, message: string, status: number) {
    return new Response(
        JSON.stringify({ error: { code, message } }),
        { status, headers: { ...CORS, "Content-Type": "application/json" } }
    );
}
