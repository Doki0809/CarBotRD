import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

// Initialize Firebase Admin
// Note: In a cloud function context, applicationDefault() works. 
// Locally, we might need a service account or to be logged in via `firebase login`.
// Assuming `firebase-admin` is installed in `node_modules`.

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault()
        });
    } catch (e) {
        console.log("Application default failed, trying to read serviceAccountKey if available (optional for local dev if logged in via CLI)");
        // Fallback or just re-throw if critical
    }
}

const db = admin.firestore();

async function updateConfig() {
    const dealerId = 'DURAN FERNANDEZ AUTO SRL';
    const configPath = `Dealers/${dealerId}/:DATA BOT RN/CONFIG`;
    const catalogLink = 'https://inventarioia-gzhz2ynksa-uc.a.run.app/catalogo?dealerID=DURAN%20FERNANDEZ%20AUTO%20SRL';

    console.log(`Updating ${configPath}...`);

    try {
        const configRef = db.doc(configPath);
        await configRef.set({
            LINK_CATALOGO: catalogLink
        }, { merge: true });

        console.log(`✅ Successfully updated CONFIG for ${dealerId}`);
        console.log(`🔗 Added LINK_CATALOGO: ${catalogLink}`);
    } catch (error) {
        console.error('❌ Error updating config:', error);
    }
}

updateConfig();
