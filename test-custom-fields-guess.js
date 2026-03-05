import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    'https://lpiwkennlavpzisdvnnh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc4MTgxMSwiZXhwIjoyMDg3MzU3ODExfQ.qmn-nzsetrcn0EuykdAwq4Me_7ngEgToflVTSi9b6Xs'
);

async function testGuess() {
    const { data: dealer } = await supabaseAdmin.from('dealers').select('*').not('ghl_access_token', 'is', null).limit(1).single();
    const token = dealer.ghl_access_token;
    const locationId = dealer.ghl_location_id;
    
    // Test multiple keys to see which ones stick
    const fieldsToTest = [
        "marca", "make", "vehicle_make", 
        "modelo", "model", "vehicle_model",
        "ano", "year", "vehicle_year",
        "color", "chasis", "vin", "precio"
    ];
    
    const customFieldsPayload = fieldsToTest.map(id => ({ id: id, field_value: id + "_VALUE" }));
    
    const payload = {
        firstName: "Test_Guess",
        lastName: "CarBot",
        email: "guess@carbot.abc",
        locationId: locationId,
        customFields: customFieldsPayload
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
    console.log("ACCEPTED FIELDS:", JSON.stringify(data.contact?.customFields || [], null, 2));
}

testGuess();
