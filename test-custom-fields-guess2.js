import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    'https://lpiwkennlavpzisdvnnh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc4MTgxMSwiZXhwIjoyMDg3MzU3ODExfQ.qmn-nzsetrcn0EuykdAwq4Me_7ngEgToflVTSi9b6Xs'
);

async function guessFields() {
    const { data: dealer } = await supabaseAdmin.from('dealers').select('*').not('ghl_access_token', 'is', null).limit(1).single();
    const token = dealer.ghl_access_token;
    const locationId = dealer.ghl_location_id;

    const possibleKeys = [
        "edicion", "edicin", "edition", "trim", "version",
        "ano", "ao", "year", "year_of_manufacture", "vehicle_year",
        "tipo_de_vehculo", "tipo_de_vehiculo", "tipo_vehiculo", "body_type", "type_of_vehicle", "vehicle_type", "tipo",
        "precio", "price", "vehicle_price", "precio_de_venta", "selling_price",
        "tipo_de_combustible", "tipo_combustible", "combustible", "fuel_type", "fuel",
        "a_quien_va_dirigida", "a_quien_va_dirigido", "dirigido_a", "banco", "bank", "financial_institution", "a_quien_va_dirigida_banco", // as per ghlService
        "monto_a_financiar", "monto_financiar", "amount_to_finance", "financed_amount", "monto", "amount",
        "precio_de_cotizacin", "precio_cotizacion", "quote_price", "inicial", "down_payment"
    ];

    const customFieldsPayload = possibleKeys.map(k => ({ id: k, field_value: k + "_TEST" }));

    const payload = {
        firstName: "Guess_Bot",
        lastName: "CarBot",
        email: "guess2@carbot.abc",
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

guessFields();
