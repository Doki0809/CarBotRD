import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault()
        });
    } catch (e) {
        console.log("App default init failed");
    }
}

const db = admin.firestore();

async function verifyConfig() {
    const dealerId = 'DURAN FERNANDEZ AUTO SRL';
    const configPath = `Dealers/${dealerId}/:DATA BOT RN/CONFIG`;

    try {
        const doc = await db.doc(configPath).get();
        if (doc.exists) {
            console.log('✅ Document exists');
            console.log('Data:', JSON.stringify(doc.data(), null, 2));
        } else {
            console.log('❌ Document does not exist');
        }
    } catch (error) {
        console.error('❌ Error reading config:', error);
    }
}

verifyConfig();
