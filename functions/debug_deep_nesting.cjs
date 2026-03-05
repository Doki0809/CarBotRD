const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function walk(path, depth = 0) {
    if (depth > 6) return;
    const indent = "  ".repeat(depth);
    const parts = path.split('/').filter(p => p.length > 0);
    const isDoc = (parts.length % 2 === 0);

    if (isDoc) {
        const docRef = db.doc(path);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            const keys = Object.keys(data);
            console.log(`${indent}📄 DOC: ${path} [Keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}]`);
            if (data.vehicle || data.vehiculo) {
                console.log(`${indent}   🌟 VEHICLE DETECTED in ${path}!`);
                console.log(`${indent}   Data: ${JSON.stringify(data.vehicle || data.vehiculo)}`);
            }
        } else {
            console.log(`${indent}📄 DOC: ${path} [VIRTUAL]`);
        }
        const subcols = await docRef.listCollections();
        for (const col of subcols) {
            await walk(`${path}/${col.id}`, depth + 1);
        }
    } else {
        console.log(`${indent}📁 COL: ${path}`);
        const colRef = db.collection(path);
        const docRefs = await colRef.listDocuments();
        for (const docRef of docRefs) {
            await walk(`${path}/${docRef.id}`, depth + 1);
        }
    }
}

async function run() {
    const dealerId = "33723933-7372-4557-a143-447167647a78";
    console.log(`🚀 Starting deep walk for Dealer ${dealerId}...`);
    await walk(`Dealers/${dealerId}/documentos`);
}

run().catch(console.error);
