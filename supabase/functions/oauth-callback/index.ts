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
                redirect_uri: `${SUPABASE_URL}/functions/v1/oauth-callback`,
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
            userId,        // GHL devuelve el ID del usuario que autorizó
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
        const dealerIdToUse = (stateDealerId && stateDealerId.length > 5 && stateDealerId !== 'undefined') ? stateDealerId : locationId;

        function toUuid(uid: string) {
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) return uid;
            let hex = '';
            for (let i = 0; i < uid.length; i++) {
                hex += uid.charCodeAt(i).toString(16).padStart(2, '0');
            }
            hex = hex.padEnd(32, '0').slice(0, 32);
            return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
        }

        const validUuid = toUuid(dealerIdToUse);

        const dealerPayload: any = {
            id: validUuid,
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
        };

        const { data: dealerData, error: upsertErr } = await admin
            .from("dealers")
            .upsert(dealerPayload, { onConflict: "id" })
            .select()
            .single();

        if (upsertErr || !dealerData) {
            console.error("Supabase upsert error:", upsertErr);
            return errorResponse("DB_ERROR", `Error guardando datos del dealer: ${upsertErr?.message || 'Unknown error'} | Detalles: ${upsertErr?.details || ''}`, 500);
        }

        const validDealerId = dealerData.id;

        // ── 4. Sincronización Masiva de Usuarios ───────────────────────
        let fetchedUserData: any = null;
        try {
            const userRes = await fetch(`https://services.leadconnectorhq.com/users/?locationId=${locationId}`, {
                headers: { 'Authorization': `Bearer ${access_token}`, 'Version': '2021-07-28', 'Accept': 'application/json' }
            });

            if (userRes.ok) {
                const userData = await userRes.json();
                fetchedUserData = userData;
                if (userData.users && Array.isArray(userData.users)) {

                    // Obtener TODOS los usuarios ya existentes en la DB (no solo del dealer actual)
                    const allEmails = userData.users.map((u: any) => (u.email || '').trim().toLowerCase()).filter(Boolean);
                    const { data: existingUsersAll } = await admin
                        .from('usuarios')
                        .select('id, correo, dealer_id')
                        .in('correo', allEmails);
                    // Mapa: email → { id, dealer_id }
                    const existingMap = new Map((existingUsersAll || []).map((u: any) => [u.correo.toLowerCase(), { id: u.id, dealer_id: u.dealer_id }]));

                    const upsertBatch = [];

                    for (const u of userData.users) {
                        const uEmail = (u.email || '').trim().toLowerCase();
                        if (!uEmail) continue;

                        const existing = existingMap.get(uEmail);
                        let userId = existing?.id;
                        // Si el usuario ya existe en OTRO dealer, no reasignar — solo actualizar perfil
                        const alreadyInOtherDealer = existing && existing.dealer_id && existing.dealer_id !== validDealerId;

                        // Si no existe en Auth, crearlo
                        if (!userId) {
                            const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
                                type: 'magiclink',
                                email: uEmail,
                                options: { data: { name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || uEmail.split('@')[0], ghl_location_id: locationId, source: 'ghl_sso_mass_callback' } }
                            });

                            if (linkData?.user) {
                                userId = linkData.user.id;
                                existingMap.set(uEmail, { id: userId, dealer_id: null });
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

                        const userRecord: any = {
                            id: userId,
                            correo: uEmail,
                            nombre: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || uEmail.split('@')[0],
                            phone: u.phone || null,
                            avatar_url: u.profilePhoto || null,
                            role_en_ghl: ghlRole,
                            rol: mappedRol
                        };

                        // Solo asignar dealer_id si el usuario no pertenece a ningún dealer aún
                        if (!alreadyInOtherDealer) {
                            userRecord.dealer_id = validDealerId;
                        }

                        upsertBatch.push(userRecord);
                    }

                    // Upsert masivo a la DB
                    if (upsertBatch.length > 0) {
                        const { error: bulkErr } = await admin.from('usuarios').upsert(upsertBatch, { onConflict: 'id' });
                        if (bulkErr) console.error("Mass upsert error:", bulkErr);
                        else console.log(`Mass sync done for ${upsertBatch.length} users (${upsertBatch.filter((u: any) => u.dealer_id).length} with dealer assigned).`);
                    }
                }
            } else {
                console.warn(`GHL Users fetch failed: ${userRes.status}`);
            }
        } catch (e) {
            console.error("Error fetching GHL users:", e);
        }

        // ── 5. Obtener email del admin instalador y redirigir con AutoLogin ──
        let installerEmail = '';
        let installerName = '';
        try {
            if (userId && fetchedUserData && fetchedUserData.users) {
                const installer = fetchedUserData.users.find((u: any) => u.id === userId);
                if (installer) {
                    installerEmail = (installer.email || '').trim().toLowerCase();
                    installerName = installer.name || `${installer.firstName || ''} ${installer.lastName || ''}`.trim() || '';
                }
            } else {
                // Fallback attempt (aunque /users/me falla con tokens de Location)
                const meRes = await fetch('https://services.leadconnectorhq.com/users/me', {
                    headers: { Authorization: `Bearer ${access_token}`, Version: '2021-07-28' }
                });
                if (meRes.ok) {
                    const meData = await meRes.json();
                    installerEmail = meData.email || meData.user?.email || '';
                    installerName = meData.name || meData.user?.name || `${meData.firstName || ''} ${meData.lastName || ''}`.trim() || '';
                }
            }
        } catch (e) {
            console.warn('Could not fetch installer user info:', e);
        }

        // Construir URL de redirección con params de AutoLogin
        const redirectBase = 'https://carbotsystem.com';
        const redirectParams = new URLSearchParams({
            oauth: 'success',
            location_id: locationId,
            location_name: locationName,
        });
        if (installerEmail) redirectParams.set('user_email', installerEmail);
        if (installerName) redirectParams.set('user_name', installerName);

        return Response.redirect(`${redirectBase}?${redirectParams.toString()}`, 302);

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
