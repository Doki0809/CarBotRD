// supabase/functions/lookup-ghl-user/index.ts  (v2 — OAuth tokens)
// Supabase Edge Function — GHL Email Lookup using stored dealer OAuth tokens
// Deploy: supabase functions deploy lookup-ghl-user

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GHL_CLIENT_ID = Deno.env.get("GHL_CLIENT_ID") ?? "";
const GHL_CLIENT_SECRET = Deno.env.get("GHL_CLIENT_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Helper: refrescar token si expiró ─────────────────────────────────────
async function getValidToken(
    supabase: ReturnType<typeof createClient>,
    dealer: { id: string; ghl_access_token: string; ghl_refresh_token: string; ghl_token_expires_at: string }
): Promise<string | null> {
    const expiresAt = new Date(dealer.ghl_token_expires_at);
    const now = new Date();

    // Token aún vigente
    if (expiresAt > now) return dealer.ghl_access_token;

    // Token expirado → refrescar
    console.log(`Refreshing token for dealer ${dealer.id}...`);

    const refreshRes = await fetch("https://services.leadconnectorhq.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: GHL_CLIENT_ID,
            client_secret: GHL_CLIENT_SECRET,
            grant_type: "refresh_token",
            refresh_token: dealer.ghl_refresh_token,
        }),
    });

    if (!refreshRes.ok) {
        console.error("Token refresh failed:", await refreshRes.text());
        return null;
    }

    const { access_token, refresh_token, expires_in } = await refreshRes.json();
    const newExpiresAt = new Date(Date.now() + (expires_in - 300) * 1000);

    // Guardar nuevos tokens en la DB
    await supabase
        .from("dealers")
        .update({
            ghl_access_token: access_token,
            ghl_refresh_token: refresh_token,
            ghl_token_expires_at: newExpiresAt.toISOString(),
        })
        .eq("id", dealer.id);

    return access_token;
}

// ── Handler principal ─────────────────────────────────────────────────────
serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    try {
        const { email } = await req.json();

        if (!email || typeof email !== "string") {
            return errorResponse("INVALID_EMAIL", "El correo es requerido.", 400);
        }

        // ── 1. Verificar si ya existe en la DB local (usuarios) ────────
        // Los usuarios importados por el Auto-Onboarding masivo ya estarán aquí.
        const { data: userLocal, error: dbErrLocal } = await supabase
            .from("usuarios")
            .select("*, dealers!inner(id, nombre, ghl_location_id)")
            .eq("correo", email.trim().toLowerCase())
            .maybeSingle();

        if (userLocal && userLocal.dealers) {
            let needsPassword = false;
            const { data: authData } = await supabase.auth.admin.getUserById(userLocal.id);
            if (authData?.user && !authData.user.last_sign_in_at) {
                needsPassword = true;
            }

            return new Response(
                JSON.stringify({
                    found: true,
                    isNew: false,
                    needsPassword,
                    name: userLocal.nombre,
                    email: userLocal.correo,
                    locationId: userLocal.dealers.ghl_location_id,
                    dealerName: userLocal.dealers.nombre,
                    dealerId: userLocal.dealer_id,
                    role: userLocal.rol
                }),
                { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
            );
        }

        // ── 2. (Fallback) Buscar en todos los dealers activos con token ───────────────
        const { data: dealers, error: dbErr } = await supabase
            .from("dealers")
            .select("id, nombre, ghl_location_id, ghl_access_token, ghl_refresh_token, ghl_token_expires_at")
            .eq("activo", true)
            .not("ghl_access_token", "is", null);

        if (!dbErr && dealers?.length) {
            for (const dealer of dealers) {
                const token = await getValidToken(supabase, dealer);
                if (!token) continue; // skip si no se pudo refrescar

                // Consultar a /users/ en vez de /contacts/ porque son staff
                const ghlRes = await fetch(
                    `https://services.leadconnectorhq.com/users/?locationId=${dealer.ghl_location_id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Version: "2021-07-28",
                        },
                    }
                );

                if (!ghlRes.ok) {
                    console.warn(`GHL request failed for dealer ${dealer.id}:`, ghlRes.status);
                    continue;
                }

                const userData = await ghlRes.json();
                if (userData.users && Array.isArray(userData.users)) {
                    const matchedUser = userData.users.find(u => (u.email || '').toLowerCase() === email.trim().toLowerCase());
                    if (matchedUser) {
                        return new Response(
                            JSON.stringify({
                                found: true,
                                isNew: true,
                                name: matchedUser.name || `${matchedUser.firstName ?? ""} ${matchedUser.lastName ?? ""}`.trim(),
                                email: matchedUser.email,
                                locationId: dealer.ghl_location_id,
                                dealerName: dealer.nombre,
                                dealerId: dealer.id,
                            }),
                            { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
                        );
                    }
                }
            }
        }

        // No se encontró ni localmente ni en GHL Múltiple
        return errorResponse("USER_NOT_FOUND", "Usuario no encontrado en el sistema.", 404);

    } catch (err) {
        console.error("Unexpected error:", err);
        return errorResponse("SERVER_ERROR", "Error interno del servidor.", 500);
    }
});

function errorResponse(code: string, message: string, status: number) {
    return new Response(
        JSON.stringify({ found: false, error: { code, message } }),
        { status, headers: { ...CORS, "Content-Type": "application/json" } }
    );
}
