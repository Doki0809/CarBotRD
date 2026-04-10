// supabase/functions/oauth-callback/index.ts
// Supabase Edge Function — GHL OAuth 2.0 Callback Handler with Auto-Onboarding
// Handles both Location-level and Company/Agency-level tokens
// Deploy: supabase functions deploy oauth-callback

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GHL_CLIENT_ID = Deno.env.get("GHL_CLIENT_ID") ?? "";
const GHL_CLIENT_SECRET = Deno.env.get("GHL_CLIENT_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const TOKEN_REFRESH_MARGIN_SECONDS = 300;

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Helper: process a single location (upsert dealer + sync users) ──
async function processLocation(
    admin: any,
    access_token: string,
    refresh_token: string,
    expires_in: number,
    locationId: string,
    ghlInstallerUserId: string | null,
    stateDealerId: string | null,
) {
    const expiresAt = new Date(Date.now() + (expires_in - TOKEN_REFRESH_MARGIN_SECONDS) * 1000);

    // ── Obtener info del Location ──
    let locationName = "Dealer";
    let locationPhone = null;
    let locationLogo = null;
    let locationAddress = null;
    let locationWebsite = null;

    try {
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
    } catch (e) {
        console.warn(`Error fetching location ${locationId}:`, e);
    }

    // ── Upsert dealer ──
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

    const { data: existingDealer } = await admin
        .from("dealers")
        .select("id")
        .eq("ghl_location_id", locationId)
        .maybeSingle();

    let dealerData: any = null;
    let upsertErr: any = null;

    if (existingDealer) {
        const { data, error } = await admin
            .from("dealers")
            .update({
                nombre: dealerPayload.nombre,
                ghl_access_token: dealerPayload.ghl_access_token,
                ghl_refresh_token: dealerPayload.ghl_refresh_token,
                ghl_token_expires_at: dealerPayload.ghl_token_expires_at,
                phone: dealerPayload.phone,
                logo_url: dealerPayload.logo_url,
                address: dealerPayload.address,
                website: dealerPayload.website,
                activo: true,
                updated_at: new Date().toISOString(),
            })
            .eq("id", existingDealer.id)
            .select()
            .single();
        dealerData = data;
        upsertErr = error;
    } else {
        const { data, error } = await admin
            .from("dealers")
            .insert(dealerPayload)
            .select()
            .single();
        dealerData = data;
        upsertErr = error;
    }

    if (upsertErr || !dealerData) {
        console.error(`Dealer upsert error for ${locationId}:`, upsertErr);
        return { success: false, locationId, locationName, error: upsertErr };
    }

    const validDealerId = dealerData.id;

    // ── Sync users ──
    let fetchedUserData: any = null;
    try {
        const userRes = await fetch(`https://services.leadconnectorhq.com/users/?locationId=${locationId}`, {
            headers: { 'Authorization': `Bearer ${access_token}`, 'Version': '2021-07-28', 'Accept': 'application/json' }
        });

        if (userRes.ok) {
            const userData = await userRes.json();
            fetchedUserData = userData;
            if (userData.users && Array.isArray(userData.users)) {
                const allEmails = userData.users.map((u: any) => (u.email || '').trim().toLowerCase()).filter(Boolean);
                const { data: existingUsersAll } = await admin
                    .from('usuarios')
                    .select('id, correo, dealer_id')
                    .in('correo', allEmails);
                const existingMap = new Map((existingUsersAll || []).map((u: any) => [u.correo.toLowerCase(), { id: u.id, dealer_id: u.dealer_id }]));

                const upsertBatch = [];

                for (const u of userData.users) {
                    const uEmail = (u.email || '').trim().toLowerCase();
                    if (!uEmail) continue;

                    const existing = existingMap.get(uEmail);
                    let userId = existing?.id;
                    const alreadyInOtherDealer = existing && existing.dealer_id && existing.dealer_id !== validDealerId;

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

                    const ghlRole = u.roles?.role || u.roles?.type || 'usuario';
                    let mappedRol = (ghlRole.toLowerCase().includes('admin') || ghlRole.toLowerCase().includes('agency')) ? 'admin' : 'vendedor';

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
                        ghl_user_id: u.id || null,
                        only_assigned_data: u.permissions?.onlyAssignedData === true,
                        rol: mappedRol
                    };

                    if (!alreadyInOtherDealer) {
                        userRecord.dealer_id = validDealerId;
                        userRecord.nombre_dealer = locationName;
                    }

                    upsertBatch.push(userRecord);
                }

                if (upsertBatch.length > 0) {
                    const { error: bulkErr } = await admin.from('usuarios').upsert(upsertBatch, { onConflict: 'id' });
                    if (bulkErr) console.error("Mass upsert error:", bulkErr);
                    else console.log(`Mass sync done for ${upsertBatch.length} users in ${locationName}.`);
                }
            }
        } else {
            console.warn(`GHL Users fetch failed for ${locationId}: ${userRes.status}`);
        }
    } catch (e) {
        console.error("Error fetching GHL users:", e);
    }

    return { success: true, locationId, locationName, dealerId: validDealerId, fetchedUserData };
}

// ── Main handler ──
serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        const stateDealerId = url.searchParams.get("state") ?? null;

        if (!code) {
            return errorResponse("MISSING_CODE", "No se recibio authorization code de GHL.", 400);
        }

        // ── 1. Exchange code for tokens ──
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
            return errorResponse("TOKEN_EXCHANGE_FAILED", "Error intercambiando el codigo OAuth.", 502);
        }

        const tokenData = await tokenRes.json();
        console.log("Token response userType:", tokenData.userType, "locationId:", tokenData.locationId, "companyId:", tokenData.companyId);

        const access_token = tokenData.access_token;
        const refresh_token = tokenData.refresh_token;
        const expires_in = tokenData.expires_in;
        const ghlInstallerUserId = tokenData.userId;
        const userType = tokenData.userType;

        // ── 2. Determine flow: Location vs Company ──
        if (tokenData.locationId) {
            // ═══════════════════════════════════════════════════
            // LOCATION-LEVEL TOKEN: process single location
            // ═══════════════════════════════════════════════════
            console.log("Processing Location-level token for:", tokenData.locationId);
            const result = await processLocation(admin, access_token, refresh_token, expires_in, tokenData.locationId, ghlInstallerUserId, stateDealerId);

            if (!result.success) {
                return errorResponse("DB_ERROR", "Error guardando datos del dealer.", 500, result.error);
            }

            // Build redirect with installer info
            let installerEmail = '';
            let installerName = '';
            if (ghlInstallerUserId && result.fetchedUserData?.users) {
                const installer = result.fetchedUserData.users.find((u: any) => u.id === ghlInstallerUserId);
                if (installer) {
                    installerEmail = (installer.email || '').trim().toLowerCase();
                    installerName = installer.name || `${installer.firstName || ''} ${installer.lastName || ''}`.trim() || '';
                }
            }

            const redirectParams = new URLSearchParams({
                oauth: 'success',
                location_id: result.locationId,
                location_name: result.locationName,
            });
            if (installerEmail) redirectParams.set('user_email', installerEmail);
            if (installerName) redirectParams.set('user_name', installerName);

            return Response.redirect(`https://carbotsystem.com?${redirectParams.toString()}`, 302);

        } else if (tokenData.companyId) {
            // ═══════════════════════════════════════════════════
            // COMPANY-LEVEL TOKEN: get all locations, then
            // request a Location Access Token for each one
            // ═══════════════════════════════════════════════════
            console.log("Processing Company-level token for companyId:", tokenData.companyId);

            // Fetch all locations in the company
            const locsRes = await fetch(`https://services.leadconnectorhq.com/locations/search`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    Version: "2021-07-28",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ companyId: tokenData.companyId, limit: 100 }),
            });

            if (!locsRes.ok) {
                const errText = await locsRes.text();
                console.error("locations/search failed:", locsRes.status, errText);

                // Fallback: save company-level token with companyId as identifier
                // so at least the tokens are stored and can be used later
                console.log("Saving company-level token as fallback...");
                const companyId = tokenData.companyId;
                const expiresAt = new Date(Date.now() + (expires_in - TOKEN_REFRESH_MARGIN_SECONDS) * 1000);

                await admin.from("dealers").upsert({
                    ghl_location_id: companyId,
                    nombre: `Agency ${companyId}`,
                    ghl_access_token: access_token,
                    ghl_refresh_token: refresh_token,
                    ghl_token_expires_at: expiresAt.toISOString(),
                    activo: true,
                }, { onConflict: 'ghl_location_id' });

                return Response.redirect(`https://carbotsystem.com?oauth=success&company_id=${companyId}`, 302);
            }

            const locsData = await locsRes.json();
            const locations = locsData.locations || [];
            console.log(`Found ${locations.length} locations in company`);

            if (locations.length === 0) {
                // No locations — save company token as fallback
                return Response.redirect(`https://carbotsystem.com?oauth=success&company_id=${tokenData.companyId}&note=no_locations`, 302);
            }

            // Process each location: get a location-level access token and onboard
            let processedCount = 0;
            let lastLocationId = '';
            let lastLocationName = '';

            for (const loc of locations) {
                const locId = loc.id || loc._id;
                if (!locId) continue;

                console.log(`Processing location: ${locId} (${loc.name})`);

                // Get a Location Access Token from the Company token
                let locAccessToken = access_token;
                let locRefreshToken = refresh_token;
                try {
                    const locTokenRes = await fetch("https://services.leadconnectorhq.com/oauth/locationToken", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${access_token}`,
                            Version: "2021-07-28",
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: new URLSearchParams({
                            companyId: tokenData.companyId,
                            locationId: locId,
                        }),
                    });

                    if (locTokenRes.ok) {
                        const locTokenData = await locTokenRes.json();
                        locAccessToken = locTokenData.access_token || access_token;
                        locRefreshToken = locTokenData.refresh_token || refresh_token;
                        console.log(`Got location token for ${locId}`);
                    } else {
                        console.warn(`Failed to get location token for ${locId}: ${locTokenRes.status}`);
                    }
                } catch (e) {
                    console.warn(`Error getting location token for ${locId}:`, e);
                }

                const result = await processLocation(admin, locAccessToken, locRefreshToken, expires_in, locId, ghlInstallerUserId, null);
                if (result.success) {
                    processedCount++;
                    lastLocationId = result.locationId;
                    lastLocationName = result.locationName;
                }
            }

            console.log(`Company onboarding complete: ${processedCount}/${locations.length} locations processed`);

            const redirectParams = new URLSearchParams({
                oauth: 'success',
                company_id: tokenData.companyId,
                locations_processed: String(processedCount),
            });
            if (lastLocationId) redirectParams.set('location_id', lastLocationId);
            if (lastLocationName) redirectParams.set('location_name', lastLocationName);

            return Response.redirect(`https://carbotsystem.com?${redirectParams.toString()}`, 302);

        } else {
            // No locationId and no companyId — unexpected
            console.error("Token has neither locationId nor companyId:", JSON.stringify(tokenData));
            return errorResponse("MISSING_LOCATION", "GHL no devolvio locationId ni companyId.", 400, {
                userType, keys: Object.keys(tokenData)
            });
        }

    } catch (err) {
        console.error("Unexpected error:", err instanceof Error ? { message: err.message, stack: err.stack } : err);
        return errorResponse("SERVER_ERROR", "Error interno del servidor.", 500, err instanceof Error ? err.message : String(err));
    }
});

function errorResponse(code: string, message: string, status: number, details?: any) {
    return new Response(
        JSON.stringify({ error: { code, message, details } }),
        { status, headers: { ...CORS, "Content-Type": "application/json" } }
    );
}
