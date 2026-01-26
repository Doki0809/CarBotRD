const admin = require("firebase-admin");

admin.initializeApp({
    projectId: "carbot-5d709"
});

const db = admin.firestore();

async function listDealers() {
    console.log("Listing dealers...");
    try {
        const snap = await db.collection("Dealers").get();
        console.log(`Found ${snap.size} documents.`);
        snap.forEach(doc => {
            console.log(`ID: "${doc.id}" | Fields: ${Object.keys(doc.data()).join(", ")}`);
        });
    } catch (err) {
        console.error("Error listing dealers:", err);
    }
}

listDealers();
