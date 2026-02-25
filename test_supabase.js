import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODE4MTEsImV4cCI6MjA4NzM1NzgxMX0.HMVGq8E2Lf5utJGxWsO8FEnJXCBzwSHVNEzeuoSm4y8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
async function run() {
    const { data: users, error } = await supabase.from('usuarios').select('correo, dealer_id, dealers(nombre)').limit(10);
    console.log(users || error);
}
run();
