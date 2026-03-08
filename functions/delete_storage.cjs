const admin = require('firebase-admin');
const serviceAccount = require('/Users/jean/carbotSystem/serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'carbot-5d709.firebasestorage.app'
});

async function deleteFolder(prefix) {
    const bucket = admin.storage().bucket();
    console.log(`Deleting all files with prefix: ${prefix}`);

    try {
        await bucket.deleteFiles({ prefix });
        console.log(`Successfully deleted folder/prefix: ${prefix}`);
    } catch (error) {
        console.error(`Error deleting folder ${prefix}:`, error);
    }
}

deleteFolder('dealers/').catch(console.error);
