const admin = require('firebase-admin');
const serviceAccount = require('/Users/jean/carbotSystem/serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'carbot-5d709.firebasestorage.app'
});

async function inspectFolders() {
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ prefix: 'Dealers/' });
    console.log(`--- Top Level in Dealers/ ---`);
    const dealers = new Set();
    files.forEach(f => dealers.add(f.name.split('/')[1]));
    dealers.forEach(d => console.log(d));

    const [files2] = await bucket.getFiles({ prefix: 'dealers/' });
    console.log(`--- Top Level in dealers/ ---`);
    files2.forEach(f => console.log(f.name));
}

inspectFolders().catch(console.error);
