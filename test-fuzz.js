import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    'https://lpiwkennlavpzisdvnnh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc4MTgxMSwiZXhwIjoyMDg3MzU3ODExfQ.qmn-nzsetrcn0EuykdAwq4Me_7ngEgToflVTSi9b6Xs'
);

async function testGhl() {
    const { data: dealer } = await supabaseAdmin.from('dealers').select('*').not('ghl_access_token', 'is', null).limit(1).single();
    const token = dealer.ghl_access_token;

    const bases = [
        'https://services.leadconnectorhq.com'
    ];
    const paths = [
        '/documents', '/documents/templates', '/documents-contracts', '/contracts', '/proposals/document', '/proposals/templates',
        '/documents/proposals', '/documents/contracts', '/templates', '/documents/send', '/documents/generate',
        '/documents/contracts/send', '/documents-contracts/templates'
    ];

    console.log("Starting GET tests...");
    for (let b of bases) {
        for (let p of paths) {
            const endpoint = b + p;
            try {
                const res = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Version': '2021-07-28',
                        'locationId': dealer.ghl_location_id
                    }
                });
                if (res.status !== 404) {
                    console.log(`GET ${p} -> ${res.status}`);
                }
            } catch (e) { }
        }
    }
}
testGhl();
