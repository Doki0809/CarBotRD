const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function checkDealerLogo() {
    const dealerDoc = await db.collection("Dealers").doc("33723933-7372-4557-a143-447167647a78").get();
    const data = dealerDoc.data();
    console.log("All dealer fields:");
    for (const [k, v] of Object.entries(data)) {
        const val = typeof v === 'string' ? v.substring(0, 200) : v;
        console.log(`  ${k}: ${JSON.stringify(val)}`);
    }
}
checkDealerLogo().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
