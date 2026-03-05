import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc4MTgxMSwiZXhwIjoyMDg3MzU3ODExfQ.kY_d6Xl0vS2j7h4x4RymA95t-E8-fUOhfA7_9kFvjDk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function checkUser() {
    const targetEmail = 'janilfernandez@hotmail.com';
    console.log(`Checking user '${targetEmail}'...`);
    const { data: user, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('correo', targetEmail)
        .maybeSingle();

    if (error) {
        console.error("Error fetching user:", error);
    } else {
        console.log("User record:", JSON.stringify(user, null, 2));
    }
}

checkUser();
