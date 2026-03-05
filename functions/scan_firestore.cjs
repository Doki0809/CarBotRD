const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function scanFirestore() {
    console.log("🔍 Scanning Firestore for contracts...");

    const dealersSnap = await db.collection("Dealers").get();
    console.log(`Found ${dealersSnap.size} dealers.`);

    for (const dealerDoc of dealersSnap.docs) {
        const dealerId = dealerDoc.id;
        console.log(`\n--- Dealer: ${dealerId} ---`);

        const collections = [
            db.collection("Dealers").doc(dealerId).collection("documentos").doc("contratos").collection("items"),
            db.collection("Dealers").doc(dealerId).collection("contracts"),
            db.collection("Dealers").doc(dealerId).collection("documentos").doc("cotizaciones").collection("items"),
            db.collection("Dealers").doc(dealerId).collection("quotes")
        ];

        for (const coll of collections) {
            const snap = await coll.limit(5).get();
            if (!snap.empty) {
                console.log(`✅ Found ${snap.size} items in ${coll.path}`);
                snap.forEach(d => {
                    const data = d.data();
                    console.log(`  - Doc ID: ${d.id}`);
                    console.log(`    Vehicle ID: ${data.vehicleId || data.vehiculo_id || 'N/A'}`);
                    console.log(`    Client: ${data.clientName || data.nombre_cliente || 'N/A'}`);
                    if (data.vehicle || data.vehiculo) {
                        const v = data.vehicle || data.vehiculo;
                        console.log(`    Metadata Preview: ${v.year} ${v.make} ${v.model} (VIN: ${v.vin || v.chasis})`);
                    }
                });
            }
        }
    }
}

scanFirestore().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
