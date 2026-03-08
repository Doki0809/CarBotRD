const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkProposals() {
    console.log("🔍 Checking ghl_proposals collection...");
    const snapshot = await db.collection("ghl_proposals").orderBy("createdAt", "desc").limit(5).get();

    if (snapshot.empty) {
        console.log("❌ No proposals found.");
        return;
    }

    snapshot.forEach(doc => {
        console.log(`📄 ID: ${doc.id}`);
        console.log(`   Data: ${JSON.stringify(doc.data(), null, 2)}`);
    });
}

checkProposals().catch(console.error);
