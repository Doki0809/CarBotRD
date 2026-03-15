/**
 * register_carbot_subaccount.js
 * 
 * Uso: 
 * SUPABASE_SERVICE_ROLE_KEY=tu_key node register_carbot_subaccount.js <location_id> [agency_id]
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Error: Se requiere SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
}

const locationId = process.argv[2];
const agencyId = process.argv[3] || null;

if (!locationId) {
    console.error("❌ Error: Debes proveer un location_id como primer argumento.");
    console.log("Uso: node register_carbot_subaccount.js <location_id> [agency_id]");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function register() {
    console.log(`🚀 Registrando subcuenta en Branding v3: ${locationId}...`);

    const { data, error } = await supabase
        .from('branding_subaccounts')
        .upsert({
            location_id: locationId,
            agency_id: agencyId,
            brand_id: 'carbot',
            brand_name: 'carbot',
            theme_name: 'carbot',
            app_installed: true,
            status: 'active',
            updated_at: new Date().toISOString()
        }, { onConflict: 'location_id' });

    if (error) {
        console.error("❌ Error al registrar:", error.message);
    } else {
        console.log("✅ Subcuenta registrada exitosamente en branding_subaccounts.");
        console.log(`🔗 Verifica el API aquí: https://carbot-system.vercel.app/api/get-branding?locationId=${locationId}`);
    }
}

register();
