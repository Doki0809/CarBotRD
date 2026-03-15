
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc4MTgxMSwiZXhwIjoyMDg3MzU3ODExfQ.kY_d6Xl0vS2j7h4x4RymA95t-E8-fUOhfA7_9kFvjDk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function syncAdminName() {
    const adminEmail = 'jeancarlosgf13@gmail.com';
    const newName = 'Jean Gomez';

    console.log(`Syncing name to "${newName}" for email ${adminEmail}...`);

    const { data, error } = await supabase
        .from('usuarios')
        .update({ nombre: newName })
        .eq('correo', adminEmail);

    if (error) {
        console.error('Error updating Supabase:', error);
    } else {
        console.log('Successfully updated Supabase usuarios table.');
    }
}

syncAdminName().catch(console.error);
