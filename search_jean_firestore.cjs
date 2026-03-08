const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function searchJean() {
    const email = "jeancarlosgf13@gmail.com";
    console.log(`🔍 Buscando ${email} en Firestore...`);

    const snapshots = await db.collectionGroup('usuarios').where('email', '==', email).get();

    if (snapshots.empty) {
        console.log("❌ No se encontró el usuario en Firestore.");
        return;
    }

    snapshots.forEach(doc => {
        console.log(`✅ Encontrado en: ${doc.ref.path}`);
        console.log("Datos:", JSON.stringify(doc.data(), null, 2));
    });
}

searchJean().catch(console.error);
