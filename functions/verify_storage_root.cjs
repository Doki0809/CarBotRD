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

async function listRoot() {
    const [files, query, apiResponse] = await bucket.getFiles({ delimiter: '/' });
    console.log('--- Current Storage Root ---');
    apiResponse.prefixes.forEach(prefix => console.log(`Folder: ${prefix}`));
    files.forEach(file => {
        if (!file.name.endsWith('/')) {
            console.log(`File: ${file.name}`);
        }
    });
}

listRoot().catch(console.error);
