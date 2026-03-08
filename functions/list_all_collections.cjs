const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function listCollections() {
    console.log("🔍 Listing all top-level collections...");
    const collections = await db.listCollections();

    if (collections.length === 0) {
        console.log("❌ No collections found.");
        return;
    }

    collections.forEach(collection => {
        console.log(`📂 Collection: ${collection.id}`);
    });
}

listCollections().catch(console.error);
