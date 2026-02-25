import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_ACCESS_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...etc"; 

const supabase = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc4MTgxMSwiZXhwIjoyMDg3MzU3ODExfQ.kY_d6Xl0vS2j7h4x4RymA95t-E8-fUOhfA7_9kFvjDk');

async function run() {
    const { data: users, error } = await supabase.from('usuarios').select('correo, dealer_id, dealers(nombre)');
    console.log(users || error);
}
run();
