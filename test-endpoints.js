import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    'https://lpiwkennlavpzisdvnnh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc4MTgxMSwiZXhwIjoyMDg3MzU3ODExfQ.qmn-nzsetrcn0EuykdAwq4Me_7ngEgToflVTSi9b6Xs'
);

async function testGhl() {
    const { data: dealer, error } = await supabaseAdmin.from('dealers').select('*').not('ghl_access_token', 'is', null).limit(1).single();

    if (error || !dealer) {
        console.log('Error fetching dealer:', error);
        return;
    }

    const token = dealer.ghl_access_token;
    console.log('Token:', token.substring(0, 5) + '...');

    const endpointsToTest = [
        'https://services.leadconnectorhq.com/proposals/document',
        'https://services.leadconnectorhq.com/documents-contracts/documents',
        'https://services.leadconnectorhq.com/documents_contracts/documents',
        'https://services.leadconnectorhq.com/documents/contracts/generate',
        'https://services.leadconnectorhq.com/documents-contracts/templates/send'
    ];

    for (let endpoint of endpointsToTest) {
        try {
            console.log(`\nTesting POST ${endpoint}...`);
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Version': '2021-07-28',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    templateId: "some-id",
                    contactId: "some-contact",
                    locationId: dealer.ghl_location_id,
                    name: "Test Document"
                })
            });
            console.log(`Status: ${res.status}`);
            const text = await res.text();
            console.log(text);
        } catch (e) {
            console.log("Error:", e.message);
        }
    }
}
testGhl();
