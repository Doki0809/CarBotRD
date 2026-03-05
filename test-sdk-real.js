import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    'https://lpiwkennlavpzisdvnnh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc4MTgxMSwiZXhwIjoyMDg3MzU3ODExfQ.qmn-nzsetrcn0EuykdAwq4Me_7ngEgToflVTSi9b6Xs'
);

async function runTest() {
    const { data: dealer } = await supabaseAdmin.from('dealers').select('*').not('ghl_access_token', 'is', null).limit(1).single();
    const token = dealer.ghl_access_token;
    const locationId = dealer.ghl_location_id;

    // Fetch users for this location    
    const userRes = await fetch(`https://services.leadconnectorhq.com/users/?locationId=${locationId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Version': '2021-07-28', 'Accept': 'application/json' }
    });
    const userData = await userRes.json();
    const firstUser = userData.users && userData.users[0];
    const userId = firstUser?.id;

    if (!userId) {
        console.error("Could not find any GHL users for this location");
        return;
    }

    console.log(`Using GHL userId: ${userId}`);

    // Fetch a real contact from the location to ensure proper custom value mapping
    const contactRes = await fetch(`https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=1`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Version': '2021-07-28', 'Accept': 'application/json' }
    });
    const contactData = await contactRes.json();
    const contactId = contactData.contacts && contactData.contacts[0]?.id;

    if (!contactId) {
        console.error("Could not find any GHL contacts for this location");
        return;
    }

    // Fetch a real template to avoid 'some-id' validation errors
    const tplRes = await fetch(`https://services.leadconnectorhq.com/proposals/templates?locationId=${locationId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Version': '2021-07-28', 'Accept': 'application/json' }
    });
    const tplData = await tplRes.json();
    const templateId = tplData.data && tplData.data[0]?._id;

    if (!templateId) {
        console.error("Could not find any GHL templates for this location");
        return;
    }

    const endpoint = 'https://services.leadconnectorhq.com/proposals/templates/send';

    const payload = {
        templateId: templateId,
        userId: userId,
        sendDocument: true, // Let's check if this evaluates variables
        locationId: locationId,
        contactId: contactId
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
    console.log("Raw Response:");
    console.log(text);
}

runTest();
