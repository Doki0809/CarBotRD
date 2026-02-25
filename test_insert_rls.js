import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://lpiwkennlavpzisdvnnh.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODE4MTEsImV4cCI6MjA4NzM1NzgxMX0.HMVGq8E2Lf5utJGxWsO8FEnJXCBzwSHVNEzeuoSm4y8";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function run() {
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'contacto@duranfernandezauto.com',
        password: 'password123'
    });

    if (authError || !user) {
        console.error("Auth error:", authError);
        return;
    }

    console.log("Logged in user:", user.id);

    // Verify their dealer
    const { data: userRow } = await supabase.from('usuarios').select('*').eq('id', user.id).single();
    console.log("User row:", userRow);

    const dealer_id = userRow?.dealer_id;
    if (!dealer_id) return;

    // Insert test
    const dataToSave = {
        dealer_id: dealer_id,
        titulo_vehiculo: "HONDA TEST RLS",
        estado: 'Disponible',
        precio: 1000,
    };

    const { data, error } = await supabase.from('vehiculos').insert([dataToSave]).select();
    console.log("Insert Error:", error);
    console.log("Insert Data:", data);

    // Select test
    const { data: fetchResult, error: fetchErr } = await supabase.from('vehiculos').select('*');
    console.log("Select Error:", fetchErr);
    console.log("Fetched vehicles count:", fetchResult?.length);
}
run();
