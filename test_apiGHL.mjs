const fetch = require('node-fetch');

async function runTest() {
    const liveUrl = 'https://us-central1-carbot-5d709.cloudfunctions.net/apiGHL';

    // Usa los datos reales de prueba que el usuario estaba enviando
    const payload = {
        contactData: {
            firstName: 'Test',
            lastName: 'Webhook',
            email: 'testwebhook@example.com',
            phone: '8095551234',
            locationId: '3r93srEWACDqgdzxYKx4', // Gary Motors location ID de los logs
        },
        templateId: '6940a916259505842d4ea631',
        dealerId: 'GARY-MOTORS-SRL', // O DURAN-FERNANDEZ-AUTO-SRL
        vehicleData: {
            marca: 'Honda',
            modelo: 'Civic',
            ano: '2022',
            chasis_vin: 'TESTVIN1234567890'
        },
        financialData: {
            precio_venta: 25000,
            pago_inicial: 5000
        }
    };

    console.log("Enviando POST a:", liveUrl);
    console.log("Payload:", JSON.stringify(payload, null, 2));

    try {
        const res = await fetch(liveUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error en la solicitud:", error);
    }
}

runTest();
