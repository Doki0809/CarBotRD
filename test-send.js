import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    'https://lpiwkennlavpzisdvnnh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc4MTgxMSwiZXhwIjoyMDg3MzU3ODExfQ.qmn-nzsetrcn0EuykdAwq4Me_7ngEgToflVTSi9b6Xs'
);

async function testGhl() {
    const { data: dealer } = await supabaseAdmin.from('dealers').select('*').not('ghl_access_token', 'is', null).limit(1).single();
    const token = dealer.ghl_access_token;
    const locationId = dealer.ghl_location_id;
    const templateId = dealer.ghl_template_id || "6940a916259505842d4ea631";

    // fetch users
    const usersRes = await fetch(`https://services.leadconnectorhq.com/users/?locationId=${locationId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Version': '2021-07-28', 'Accept': 'application/json' }
    });
    const usersData = await usersRes.json();
    const userId = usersData.users?.[0]?.id;

    console.log("Loc:", locationId, "User:", userId, "Template:", templateId);

    const endpoint = 'https://services.leadconnectorhq.com/proposals/templates/send';
    const reqBody = {
        templateId: templateId,
        contactId: "SQFwn20OMr2ANHZCXkdI",
        userId: userId,
        locationId: locationId,
        // name: "Contract", // We know 'name' causes 422
    };

    console.log("Sending:", reqBody);
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(reqBody)
    });
    console.log("Status:", res.status);
    console.log(await res.text());
}
testGhl();
