import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    'https://lpiwkennlavpzisdvnnh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc4MTgxMSwiZXhwIjoyMDg3MzU3ODExfQ.qmn-nzsetrcn0EuykdAwq4Me_7ngEgToflVTSi9b6Xs'
);

async function testGhl() {
    const { data: dealer } = await supabaseAdmin.from('dealers').select('*').not('ghl_access_token', 'is', null).limit(1).single();
    const token = dealer.ghl_access_token;

    const bases = [
        'https://services.leadconnectorhq.com',
        'https://services.leadconnectorhq.com/documents',
        'https://services.leadconnectorhq.com/documents-contracts',
        'https://services.leadconnectorhq.com/documents_contracts',
    ];
    const paths = [
        '/templates/send',
        '/documents/send',
        '/templates/test-id/send',
        '/sendLink',
    ];

    for (let b of bases) {
        for (let p of paths) {
            if (b === 'https://services.leadconnectorhq.com' && p === '/sendLink') continue;
            const endpoint = b + p;
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Version': '2021-07-28',
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        templateId: "some-id",
                        contactId: "some-contact",
                        locationId: dealer.ghl_location_id,
                        name: "Test Document"
                    })
                });
                if (res.status !== 404 && res.status !== 400 && res.status !== 401) {
                    console.log(`\nPOST ${endpoint} -> Status: ${res.status}`);
                    console.log(await res.text());
                } else if (res.status === 400 || res.status === 401 || res.status === 422) {
                    console.log(`\nPOST ${endpoint} -> Status: ${res.status} (Potential match!)`);
                    console.log(await res.text().catch(() => ''));
                }
            } catch (e) { }
        }
    }
}
testGhl();
