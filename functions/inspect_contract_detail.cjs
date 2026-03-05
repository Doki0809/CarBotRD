const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function inspectContracts() {
    console.log("🔍 Extracting vehicle data from contracts...");

    const dealersSnap = await db.collection("Dealers").get();
    for (const dealerDoc of dealersSnap.docs) {
        const dealerId = dealerDoc.id;
        const collections = [
            db.collection("Dealers").doc(dealerId).collection("documentos").doc("contratos").collection("items"),
            db.collection("Dealers").doc(dealerId).collection("contracts")
        ];

        for (const coll of collections) {
            const snap = await coll.limit(3).get();
            if (!snap.empty) {
                console.log(`\n--- Dealer: ${dealerId} | Coll: ${coll.path} ---`);
                snap.forEach(d => {
                    const data = d.data();
                    const v = data.vehicle || data.vehiculo;
                    if (v) {
                        console.log(`Doc: ${d.id}`);
                        console.log(`Vehicle ID: ${data.vehicleId || data.vehiculo_id || 'N/A'}`);
                        console.log("Vehicle Object:", JSON.stringify(v, null, 2));
                    }
                });
            }
        }
    }
}

inspectContracts().then(() => process.exit(0));
