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

async function checkNormalizedFolders() {
    const [files, query, apiResponse] = await bucket.getFiles({ prefix: 'Dealers/', delimiter: '/' });
    console.log('Prefixes found:');
    apiResponse.prefixes.forEach(p => {
        if (p.toUpperCase().includes('DURAN')) {
            console.log(p);
        }
    });

    const [files2, query2, apiResponse2] = await bucket.getFiles({ prefix: 'dealers/', delimiter: '/' });
    console.log('dealers/ (lowercase) prefixes:');
    apiResponse2.prefixes?.forEach(p => console.log(p));
}

checkNormalizedFolders().catch(console.error);
