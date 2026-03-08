const admin = require('firebase-admin');
const path = require('path');

// Set the path to your service account key file
const serviceAccountPath = '/Users/jean/carbotSystem/serviceAccountKey.json';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath)),
        storageBucket: 'carbot-5d709.firebasestorage.app'
    });
}

const bucket = admin.storage().bucket();

async function listDealersSubfolders() {
    const [files, query, apiResponse] = await bucket.getFiles({ prefix: 'Dealers/', delimiter: '/' });

    console.log('Folders inside Dealers/:');
    apiResponse.prefixes.forEach(prefix => console.log(prefix));

    for (const prefix of apiResponse.prefixes) {
        console.log(`\nFiles in ${prefix}:`);
        const [subFiles] = await bucket.getFiles({ prefix: prefix, maxResults: 5 });
        subFiles.forEach(file => {
            if (!file.name.endsWith('/')) {
                console.log(` - ${file.name} (Modified: ${file.metadata.updated})`);
            }
        });
    }
}

listDealersSubfolders().catch(console.error);
