const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkDealersFirestore() {
    const snapshot = await db.collection('Dealers').get();
    for (const doc of snapshot.docs) {
        const dealerData = doc.data();
        console.log(`Dealer ID: ${doc.id}, Name: ${dealerData.name || dealerData.nombre}`);

        // Check subcollection
        const configSnap = await db.collection('Dealers').doc(doc.id).collection(':DATA BOT RN').doc('CONFIG').get();
        if (configSnap.exists) {
            console.log(`  Config:`, configSnap.data());
        } else {
            console.log(`  Config: NOT FOUND`);
        }
    }
}
checkDealersFirestore().catch(console.error);
