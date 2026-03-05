const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function walk(path, depth = 0) {
    if (depth > 5) return;
    const indent = "  ".repeat(depth);

    // Determine if path is a document or collection
    const parts = path.split('/').filter(p => p.length > 0);
    const isDoc = (parts.length % 2 === 0);

    if (isDoc) {
        const doc = await db.doc(path).get();
        if (doc.exists) {
            const data = doc.data();
            const keys = Object.keys(data);
            console.log(`${indent}📄 DOC: ${path} [Keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}]`);
            if (data.vehicle || data.vehiculo) console.log(`${indent}   🌟 VEHICLE DETECTED!`);

            const subcols = await db.doc(path).listCollections();
            for (const col of subcols) {
                await walk(`${path}/${col.id}`, depth + 1);
            }
        }
    } else {
        console.log(`${indent}📁 COL: ${path}`);
        const snap = await db.collection(path).limit(3).get();
        for (const doc of snap.docs) {
            await walk(`${path}/${doc.id}`, depth + 1);
        }
    }
}

async function run() {
    console.log("🚀 Walking Dealers/33723933-7372-4557-a143-447167647a78...");
    await walk("Dealers/33723933-7372-4557-a143-447167647a78");
}

run().catch(console.error);
