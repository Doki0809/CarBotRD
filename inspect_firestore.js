const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function listDealers() {
    console.log("Listing Dealers...");
    const dealersSnap = await db.collection("Dealers").get();
    console.log(`Found ${dealersSnap.size} dealers in 'Dealers' collection.`);
    dealersSnap.forEach(doc => {
        console.log(`Dealer ID: ${doc.id}, Name: ${doc.data().nombre || doc.data().display_name}`);
    });

    if (dealersSnap.empty) {
        console.log("Trying 'dealers' collection...");
        const dealersSnap2 = await db.collection("dealers").get();
        console.log(`Found ${dealersSnap2.size} dealers in 'dealers' collection.`);
        dealersSnap2.forEach(doc => {
            console.log(`Dealer ID: ${doc.id}, Name: ${doc.data().nombre || doc.data().display_name}`);
        });
    }
}

listDealers().catch(console.error);
