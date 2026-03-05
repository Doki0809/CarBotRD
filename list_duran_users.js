import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODE4MTEsImV4cCI6MjA4NzM1NzgxMX0.HMVGq8E2Lf5utJGxWsO8FEnJXCBzwSHVNEzeuoSm4y8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function listUsers() {
    const dealerId = '35594257-6176-4a79-a755-304179305938';
    console.log(`Listing users for dealer ${dealerId}...`);
    const { data: users, error } = await supabase
        .from('usuarios')
        .select('correo, nombre, dealer_id, nombre_dealer, rol')
        .eq('dealer_id', dealerId);

    if (error) {
        console.error("Error fetching users:", error);
    } else {
        console.log("Users found:", JSON.stringify(users, null, 2));
    }
}

listUsers();
