const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function checkDealerFirestore() {
    // Check all dealers in Firestore
    const dealersSnap = await db.collection("Dealers").get();
    dealersSnap.forEach(doc => {
        const data = doc.data();
        console.log(`\n📋 Dealer: ${doc.id}`);
        console.log(`  nombre: ${data.nombre}`);
        console.log(`  slug: ${data.slug}`);
        console.log(`  supabaseDealerId: ${data.supabaseDealerId || 'NOT SET'}`);
        console.log(`  ghlLocationId: ${data.ghlLocationId || 'NOT SET'}`);
    });
}

checkDealerFirestore().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
