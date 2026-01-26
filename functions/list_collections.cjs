const admin = require("firebase-admin");

admin.initializeApp({
    projectId: "carbot-5d709"
});

const db = admin.firestore();

async function listAllCollections() {
    console.log("🔍 Listing root collections...");
    const collections = await db.listCollections();
    console.log(`Found ${collections.length} root collections.`);
    for (const collection of collections) {
        const snap = await collection.limit(1).get();
        console.log(`- Collection ID: ${collection.id} (${snap.size} documents sample)`);
    }
}

listAllCollections().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
