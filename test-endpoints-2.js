import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    'https://lpiwkennlavpzisdvnnh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc4MTgxMSwiZXhwIjoyMDg3MzU3ODExfQ.qmn-nzsetrcn0EuykdAwq4Me_7ngEgToflVTSi9b6Xs'
);

async function testGhl() {
    const { data: dealer } = await supabaseAdmin.from('dealers').select('*').not('ghl_access_token', 'is', null).limit(1).single();
    const token = dealer.ghl_access_token;
    console.log('Token starting with:', token.substr(0, 5));

    const endpointsToTest = [
        'https://services.leadconnectorhq.com/documents_contracts/sendLink',
        'https://services.leadconnectorhq.com/documents-contracts/sendLink',
        'https://services.leadconnectorhq.com/documents_contracts_template/sendLink',
        'https://services.leadconnectorhq.com/documents/contracts/sendLink',
        'https://services.leadconnectorhq.com/documents-contracts/templates/test-id/send',
        'https://services.leadconnectorhq.com/documents_contracts/templates/test-id/send'
    ];

    for (let endpoint of endpointsToTest) {
        console.log(`\nPOST ${endpoint}`);
        try {
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
            console.log(await res.text());
        } catch (e) { }
    }
}
testGhl();
