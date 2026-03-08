const admin = require('firebase-admin');

// Set the path to your service account key file
const serviceAccountPath = '/Users/jean/carbotSystem/serviceAccountKey.json';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath)),
        storageBucket: 'carbot-5d709.firebasestorage.app'
    });
}

const bucket = admin.storage().bucket();

async function cleanupStorage() {
    const foldersToDelete = [
        'Dealers/DURAN FERNANDEZ AUTO SRL/',
        'Dealers/DURÁN FERNÁNDEZ AUTO S.R.L/',
        'dealers/',
        'plantillas_imagenes/'
    ];

    for (const prefix of foldersToDelete) {
        console.log(`Cleaning up: ${prefix}...`);
        try {
            await bucket.deleteFiles({ prefix });
            console.log(`✅ Deleted: ${prefix}`);
        } catch (err) {
            console.error(`❌ Error deleting ${prefix}:`, err.message);
        }
    }
}

cleanupStorage().catch(console.error);
