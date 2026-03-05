import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    'https://lpiwkennlavpzisdvnnh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc4MTgxMSwiZXhwIjoyMDg3MzU3ODExfQ.qmn-nzsetrcn0EuykdAwq4Me_7ngEgToflVTSi9b6Xs'
);

async function guessFields3() {
    const { data: dealer } = await supabaseAdmin.from('dealers').select('*').not('ghl_access_token', 'is', null).limit(1).single();
    const token = dealer.ghl_access_token;
    const locationId = dealer.ghl_location_id;

    // Test multiple keys to see which ones stick
    const fieldsToTest = [
        "ao", "ao_1", "year", "year_of_manufacture", "vehicle_year", "ao_del_vehiculo",
        "precio", "price", "vehicle_price", "precio_del_vehiculo", "precio_de_venta",
        "a_que_quien_va_dirigida", "a_quien_va_dirigida", "a_quien_va_dirigido", "dirigido_a",
        "monto_a_financiar", "amount_to_finance", "financed_amount", "monto_financiar",
        "mensaje", "message", "what_can_we_help_with", "comments",
        "inicial", "down_payment", "pago_inicial",
        "tipo_de_combustible", "combustible",
    ];

    const customFieldsPayload = fieldsToTest.map(id => ({ id: id, field_value: id + "_FUZZ" }));

    const payload = {
        firstName: "Guess3",
        lastName: "Bot",
        email: "guess3@carbot.abc",
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

guessFields3();
