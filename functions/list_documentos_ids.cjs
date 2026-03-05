const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
    const path = "Dealers/33723933-7372-4557-a143-447167647a78/documentos";
    console.log(`🔍 Listing ${path}...`);
    const snap = await db.collection(path).get();
    console.log(`Docs count: ${snap.size}`);
    for (const doc of snap.docs) {
        console.log(` 📄 ${doc.id}`);
        const subcols = await doc.ref.listCollections();
        console.log(`    Cols: ${subcols.map(c => c.id).join(', ')}`);
    }
}

run().catch(console.error);
