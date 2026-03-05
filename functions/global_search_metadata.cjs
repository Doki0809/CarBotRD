const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function searchGlobal(vId) {
    console.log(`🔍 Searching globally for ${vId}...`);

    // Check common collection names using collectionGroup
    const groups = ['items', 'contracts', 'quotes', 'vehiculos', 'inventario', 'snapshots', 'documentos'];

    for (const group of groups) {
        console.log(`  Checking group: ${group}...`);

        // Try different field variants
        const fields = ['vehicleId', 'vehiculo_id', 'idVehiculo', 'id_vehiculo'];

        for (const field of fields) {
            try {
                const snap = await db.collectionGroup(group).where(field, '==', vId).get();
                if (!snap.empty) {
                    console.log(`    🌟 FOUND ${snap.size} docs in group [${group}] with field [${field}]!`);
                    snap.forEach(doc => {
                        const data = doc.data();
                        console.log(`    📍 Path: ${doc.ref.path}`);
                        // Look for anything that looks like metadata
                        const keys = Object.keys(data);
                        const metaKeys = keys.filter(k => ['make', 'model', 'year', 'vin', 'marca', 'modelo', 'anio', 'chasis', 'color'].includes(k.toLowerCase()));
                        console.log(`    🔑 Relevant Keys: ${metaKeys.join(', ')}`);
                        if (data.vehicle || data.vehiculo) {
                            console.log(`    📦 NESTED VEHICLE FOUND!`);
                            console.log(`    Content: ${JSON.stringify(data.vehicle || data.vehiculo)}`);
                        }
                    });
                }
            } catch (e) {
                // Some group/field combos might need indexes, skip those
            }
        }
    }
}

const targetVId = 'cee7b7bb-61b9-49e8-9a96-bfe1f9a0fcbe';
searchGlobal(targetVId).catch(console.error);
