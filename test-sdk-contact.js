import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    'https://lpiwkennlavpzisdvnnh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc4MTgxMSwiZXhwIjoyMDg3MzU3ODExfQ.qmn-nzsetrcn0EuykdAwq4Me_7ngEgToflVTSi9b6Xs'
);

async function testContactUpsert() {
    const { data: dealer } = await supabaseAdmin.from('dealers').select('*').not('ghl_access_token', 'is', null).limit(1).single();
    const token = dealer.ghl_access_token;
    const locationId = dealer.ghl_location_id;

    const payload = {
        firstName: "Test_Custom_Mapping",
        lastName: "CarBotTest",
        email: "test.mapping@carbot.abc",
        locationId: locationId,
        customFields: [
            { key: "contact.marca", field_value: "TOYOTA TEST" },
            { key: "contact.modelo", field_value: "COROLLA TEST" },
            { id: "marca", field_value: "TOYOTA TEST ID" } // Let's test if raw id works
        ]
    };

    const res = await fetch(`https://services.leadconnectorhq.com/contacts/upsert`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

testContactUpsert();
