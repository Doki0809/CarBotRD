const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODE4MTEsImV4cCI6MjA4NzM1NzgxMX0.HMVGq8E2Lf5utJGxWsO8FEnJXCBzwSHVNEzeuoSm4y8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function countVehicles() {
    const { count, error } = await supabase
        .from('vehiculos')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total vehicles in Supabase: ${count}`);
}

countVehicles().catch(console.error);
