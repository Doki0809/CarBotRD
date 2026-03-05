import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    'https://lpiwkennlavpzisdvnnh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc4MTgxMSwiZXhwIjoyMDg3MzU3ODExfQ.qmn-nzsetrcn0EuykdAwq4Me_7ngEgToflVTSi9b6Xs'
);

async function runTest() {
    const { data: dealer } = await supabaseAdmin.from('dealers').select('*').not('ghl_access_token', 'is', null).limit(1).single();
    const token = dealer.ghl_access_token;
    const locationId = dealer.ghl_location_id;

    // We need a userId (an installer/user in that location). Just for the test, let's grab one if we can or use a dummy.
    // The previous logs from oauth-callback showed userId for the authorization.
    const userId = "b90zJ0hCHVwT02j61XIN"; // Jean's User ID from earlier logs or dummy

    const endpoint = 'https://services.leadconnectorhq.com/proposals/templates/send';

    // 1. First, search for a valid contact id in the location or just create a dummy template/contact ID test to see the 400 validation error
    // For a real test, let's try calling it and inspecting the response. I'll use fake IDs to see if the schema validation works.
    console.log("Testing:", endpoint);

    const payload = {
        templateId: "some-id",
        userId: userId,
        sendDocument: false,
        locationId: locationId,
        contactId: "some-contact"
    };

    console.log("Payload:", payload);

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log("Raw Response:", text);
}

runTest();
