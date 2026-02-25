// ghl-autologin — GHL iframe SSO with Auto-Onboarding
// Recibe: { email, name, location_id, location_name }
// Devuelve: { ok, hashed_token, dealer_id }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GHL_CLIENT_ID = Deno.env.get("GHL_CLIENT_ID") ?? "";
const GHL_CLIENT_SECRET = Deno.env.get("GHL_CLIENT_SECRET") ?? "";

// ── Helper: refrescar token si expiró ─────────────────────────────────────
async function getValidToken(
    supabase: ReturnType<typeof createClient>,
    dealer: any
): Promise<string | null> {
    if (!dealer.ghl_access_token || !dealer.ghl_refresh_token || !dealer.ghl_token_expires_at) return null;

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
Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

    try {
        const { email, name, location_id, location_name } = await req.json();

        if (!email || !location_id) {
            return Response.json(
                { error: 'email y location_id son requeridos' },
                { status: 400, headers: CORS },
            );
        }

        const normalizedEmail = email.trim().toLowerCase();

        // ── Admin client (service_role) ────────────────────────────────
        const admin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            { auth: { autoRefreshToken: false, persistSession: false } },
        );

        // ── 1. Evaluar Dealer existente o crear base ───────────────────
        let { data: dealer, error: errDealer } = await admin
            .from('dealers')
            .select('*')
            .eq('ghl_location_id', location_id)
            .maybeSingle();

        if (errDealer && errDealer.code !== 'PGRST116') {
            console.error("Dealer select error:", errDealer);
        }

        if (!dealer) {
            // El dealer no existe, crear registro base
            const encodedName = encodeURIComponent(location_name || location_id).replace(/'/g, "''");
            const catalogo_url = `https://inventarioia-gzhz2ynksa-uc.a.run.app/catalogo?dealerID=${encodedName}`;
            const ia_url = `https://inventarioia-gzhz2ynksa-uc.a.run.app/?dealer=${encodedName}`;

            const { data: newDealer, error: insertErr } = await admin
                .from('dealers')
                .insert({
                    ghl_location_id: location_id,
                    nombre: location_name || location_id,
                    catalogo_url,
                    ia_url
                })
                .select('*')
                .single();
            if (insertErr) {
                return Response.json({ error: `dealer insert: ${insertErr.message}` }, { status: 500, headers: CORS });
            }
            dealer = newDealer;
        }

        // ── 2. GHL API Auto-Onboarding (Sync Data) ─────────────────────
        let dealerPhone = null, dealerLogo = null, dealerAddress = null, dealerWebsite = null, dealerNameStr = location_name || location_id;
        let userPhone = null, userAvatar = null, userRole = null;

        const token = await getValidToken(admin, dealer);
        if (token) {
            // Fetch Location Data
            try {
                const locRes = await fetch(`https://services.leadconnectorhq.com/locations/${location_id}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Version': '2021-07-28', 'Accept': 'application/json' }
                });
                if (locRes.ok) {
                    const locData = await locRes.json();
                    const loc = locData.location;
                    if (loc) {
                        dealerPhone = loc.phone || null;
                        dealerLogo = loc.logoUrl || null;
                        dealerWebsite = loc.website || null;
                        if (loc.address || loc.city || loc.state) {
                            dealerAddress = `${loc.address || ''}, ${loc.city || ''}, ${loc.state || ''} ${loc.postalCode || ''}`.trim().replace(/^,|,$/g, '');
                        }
                        dealerNameStr = loc.name || dealerNameStr;

                        // Update Dealer in Supabase
                        await admin.from('dealers').update({
                            nombre: dealerNameStr,
                            phone: dealerPhone,
                            logo_url: dealerLogo,
                            address: dealerAddress,
                            website: dealerWebsite
                        }).eq('id', dealer.id);
                    }
                } else {
                    console.warn(`GHL Location fetch failed: ${locRes.status}`);
                }
            } catch (e) {
                console.error("Error fetching GHL location:", e);
            }

            // Fetch User Data for that specific email and MASS SYNC all others
            try {
                const userRes = await fetch(`https://services.leadconnectorhq.com/users/?locationId=${location_id}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Version': '2021-07-28', 'Accept': 'application/json' }
                });
                if (userRes.ok) {
                    const userData = await userRes.json();
                    if (userData.users && Array.isArray(userData.users)) {

                        // 1. Get existing users for this dealer to avoid "generateLink" overhead for everyone
                        const { data: existingUsers } = await admin.from('usuarios').select('id, correo').eq('dealer_id', dealer.id);
                        const existingMap = new Map((existingUsers || []).map((u: any) => [u.correo.toLowerCase(), u.id]));

                        const upsertBatch = [];

                        // 2. Process every user in the location
                        for (const u of userData.users) {
                            const uEmail = (u.email || '').trim().toLowerCase();
                            if (!uEmail) continue;

                            let userId = existingMap.get(uEmail);

                            // Capture current logging-in user details just in case
                            if (uEmail === normalizedEmail) {
                                userPhone = u.phone || null;
                                userAvatar = u.profilePhoto || null;
                                if (u.roles) {
                                    userRole = u.roles.role || u.roles.type || 'usuario';
                                }
                            }

                            // If not in DB, create silently in Auth to retrieve UUID
                            if (!userId) {
                                const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
                                    type: 'magiclink',
                                    email: uEmail,
                                    options: { data: { name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || uEmail.split('@')[0], ghl_location_id: location_id, source: 'ghl_sso_mass' } }
                                });
                                if (linkData?.user) {
                                    userId = linkData.user.id;
                                    existingMap.set(uEmail, userId); // map to prevent duplicate loops
                                } else {
                                    console.warn("Skip mass sync user", uEmail, linkErr?.message);
                                    continue;
                                }
                            }

                            const ghlRole = u.roles?.role || u.roles?.type || 'usuario';
                            const mappedRol = (ghlRole.toLowerCase().includes('admin') || ghlRole.toLowerCase().includes('agency')) ? 'admin' : 'vendedor';

                            upsertBatch.push({
                                id: userId,
                                correo: uEmail,
                                nombre: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || uEmail.split('@')[0],
                                dealer_id: dealer.id,
                                phone: u.phone || null,
                                avatar_url: u.profilePhoto || null,
                                role_en_ghl: ghlRole,
                                rol: mappedRol
                            });
                        }

                        // 3. Upsert masivo a la DB
                        if (upsertBatch.length > 0) {
                            const { error: bulkErr } = await admin.from('usuarios').upsert(upsertBatch, { onConflict: 'id' });
                            if (bulkErr) console.error("Mass upsert error:", bulkErr);
                        }
                    }
                } else {
                    console.warn(`GHL Users fetch failed: ${userRes.status}`);
                }
            } catch (e) {
                console.error("Error fetching GHL users:", e);
            }
        }

        // ── 3. Fallback Current User Creation ─────────────────────────
        const { error: createErr } = await admin.auth.admin.createUser({
            email: normalizedEmail,
            email_confirm: true,
            user_metadata: { name: name || normalizedEmail.split('@')[0], ghl_location_id: location_id, source: 'ghl_sso' },
        });

        if (createErr && !createErr.message.includes('already registered') && !createErr.message.includes('already exists')) {
            console.error("Fallback createUser warning:", createErr);
        }

        // ── 4. Generate magic-link token ──────────────────────────────
        const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
            type: 'magiclink',
            email: normalizedEmail,
        });

        if (linkErr) {
            return Response.json({ error: `link: ${linkErr.message}` }, { status: 500, headers: CORS });
        }

        const userId = linkData.user.id;

        // ── 5. Upsert logging-in usuario record safely ────────────────
        const currentPayload: any = {
            id: userId,
            correo: normalizedEmail,
            dealer_id: dealer.id,
        };
        // Solo sobrescribimos nombre si lo trae el frontend explícitamente y es fuerte, o usar GHL
        if (name) currentPayload.nombre = name;
        if (userPhone) currentPayload.phone = userPhone;
        if (userAvatar) currentPayload.avatar_url = userAvatar;
        if (userRole) {
            currentPayload.role_en_ghl = userRole;
            currentPayload.rol = (userRole.toLowerCase().includes('admin') || userRole.toLowerCase().includes('agency')) ? 'admin' : 'vendedor';
        }

        const { error: upsertErr } = await admin.from('usuarios').upsert(currentPayload, { onConflict: 'id' });

        if (upsertErr) {
            console.error("Error upserting current usuario:", upsertErr);
        }

        return Response.json(
            {
                ok: true,
                hashed_token: linkData.properties.hashed_token,
                dealer_id: dealer.id,
            },
            { headers: { ...CORS, 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        console.error('ghl-autologin error:', err);
        return Response.json({ error: String(err) }, { status: 500, headers: CORS });
    }
});
