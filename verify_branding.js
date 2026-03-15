/**
 * verification_test.js
 * Script para verificar la lógica de branding dinámico.
 * Simula la inserción de una subcuenta y consulta el endpoint.
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
// Usamos la anon key para el test público, pero necesitaremos service_role para insertar
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Error: Se requiere SUPABASE_SERVICE_ROLE_KEY para ejecutar la inserción de prueba.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TEST_LOCATION_ID = 'TEST_LOC_CARBOT_001';

async function verifyBranding() {
    console.log("🚀 Iniciando verificación de Branding Dinámico...");

    // 1. Insertar registro de prueba
    console.log(`\n1. Insertando subcuenta de prueba: ${TEST_LOCATION_ID}`);
    const { error: insertErr } = await supabase
        .from('branding_subaccounts')
        .upsert({
            location_id: TEST_LOCATION_ID,
            brand_id: 'carbot',
            brand_name: 'carbot',
            theme_name: 'carbot',
            app_installed: true,
            status: 'active'
        });

    if (insertErr) {
        console.error("❌ Error al insertar datos:", insertErr.message);
        if (insertErr.message.includes("relation \"branding_subaccounts\" does not exist")) {
            console.warn("⚠️  Aviso: La tabla aún no existe en Supabase. Aplica el SQL primero.");
        }
        return;
    }
    console.log("✅ Datos insertados correctamente.");

    // 2. Verificar RLS (Consultar con Anon Key si fuera posible, o simplemente verificar los datos)
    console.log(`\n2. Consultando datos de la subcuenta: ${TEST_LOCATION_ID}`);
    const { data: branding, error: queryErr } = await supabase
        .from('branding_subaccounts')
        .select('*')
        .eq('location_id', TEST_LOCATION_ID)
        .single();

    if (queryErr) {
        console.error("❌ Error al consultar datos:", queryErr.message);
    } else {
        console.log("✅ Datos recuperados:", JSON.stringify(branding, null, 2));
    }

    // 3. Instrucción para probar el endpoint
    console.log(`\n3. Verificación del Endpoint API:`);
    console.log(`   Una vez desplegado en Vercel, prueba con:`);
    console.log(`   curl -X GET "https://tu-dominio.vercel.app/api/get-branding?location_id=${TEST_LOCATION_ID}"`);
    console.log(`\n   La respuesta esperada es:`);
    console.log(JSON.stringify({
        locationId: TEST_LOCATION_ID,
        brand: "carbot",
        theme: "carbot",
        appInstalled: true
    }, null, 2));

    console.log("\n✨ Verificación completada.");
}

verifyBranding();
