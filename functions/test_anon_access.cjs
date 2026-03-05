// Test the anon key access to Supabase — simulating what the Cloud Function does
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODE4MTEsImV4cCI6MjA4NzM1NzgxMX0.HMVGq8E2Lf5utJGxWsO8FEnJXCBzwSHVNEzeuoSm4y8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function testAnonAccess() {
    const dealerUuid = '33723933-7372-4557-a143-447167647a78';

    console.log(`📡 Testing anon key access for dealer: ${dealerUuid}`);

    const { data, error } = await supabase
        .from('vehiculos')
        .select('id, titulo_vehiculo, estado, color')
        .eq('dealer_id', dealerUuid);

    if (error) {
        console.error("❌ Error:", error);
    } else {
        console.log(`✅ Found ${data.length} vehicles:`);
        data.forEach(v => {
            console.log(`  [${v.estado}] ${v.titulo_vehiculo} | color: ${v.color}`);
        });
    }
}

testAnonAccess().catch(console.error);
