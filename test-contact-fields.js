import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    'https://lpiwkennlavpzisdvnnh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc4MTgxMSwiZXhwIjoyMDg3MzU3ODExfQ.qmn-nzsetrcn0EuykdAwq4Me_7ngEgToflVTSi9b6Xs'
);

async function testContact() {
    console.log("Starting...");
    const { data: dealer } = await supabaseAdmin.from('dealers').select('*').not('ghl_access_token', 'is', null).limit(1).single();
    const token = dealer.ghl_access_token;
    const locationId = dealer.ghl_location_id;

    // Fetch contacts
    const res = await fetch(`https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&query=Jean`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Version': '2021-07-28',
            'Accept': 'application/json'
        }
    });

    const data = await res.json();
    if (data.contacts && data.contacts.length > 0) {
        console.log("FIELDS FOR CONTACT:", JSON.stringify(data.contacts[0].customFields, null, 2));
    } else {
        console.log("NO CONTACTS FOUND");
    }
}

testContact();
