const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODE4MTEsImV4cCI6MjA4NzM1NzgxMX0.HMVGq8E2Lf5utJGxWsO8FEnJXCBzwSHVNEzeuoSm4y8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function checkVehicles() {
    const { data, error } = await supabase
        .from('vehiculos')
        .select('*');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Vehicles: ${data.length}`);
    data.forEach(v => {
        console.log(`ID: ${v.id}, Marca: ${v.marca}, Fotos Count: ${v.fotos ? v.fotos.length : 0}`);
        if (v.fotos) v.fotos.forEach(url => console.log(` - ${url}`));
    });
}

checkVehicles().catch(console.error);
