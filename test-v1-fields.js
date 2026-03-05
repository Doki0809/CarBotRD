import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    'https://lpiwkennlavpzisdvnnh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc4MTgxMSwiZXhwIjoyMDg3MzU3ODExfQ.qmn-nzsetrcn0EuykdAwq4Me_7ngEgToflVTSi9b6Xs'
);

async function fetchFieldsV1() {
    const { data: dealer } = await supabaseAdmin.from('dealers').select('*').not('ghl_access_token', 'is', null).limit(1).single();
    const token = dealer.ghl_access_token;

    // V1 API for custom fields
    const res = await fetch(`https://rest.gohighlevel.com/v1/custom-fields/`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

fetchFieldsV1();
