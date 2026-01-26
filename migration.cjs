const admin = require('firebase-admin');

// IMPORTANT: Specify your project ID
admin.initializeApp({
    projectId: 'carbot-5d709'
});

const db = admin.firestore();

async function moveCollection(srcPath, destPath) {
    const srcRef = db.collection(srcPath);
    const destRef = db.collection(destPath);

    const snap = await srcRef.get();
    console.log(`Moving ${snap.size} documents from ${srcPath} to ${destPath}`);

    for (const doc of snap.docs) {
        await db.collection(destPath).doc(doc.id).set(doc.data(), { merge: true });

        // Recursive move for subcollections
        const subColls = await doc.ref.listCollections();
        for (const subColl of subColls) {
            await moveCollection(`${srcPath}/${doc.id}/${subColl.id}`, `${destPath}/${doc.id}/${subColl.id}`);
        }
    }
}

async function run() {
    try {
        const dealersSnap = await db.collection('Dealers').get();

        for (const doc of dealersSnap.docs) {
            const dealerId = doc.id;
            const data = doc.data();
            const locationId = data.ghlLocationId || data.locationId;

            console.log(`Checking dealer: ${dealerId}`);

            // If it has mojibake or it's a name-based ID and we have a locationId
            const isMojibake = /Ã|Â|\x81|\x82/.test(dealerId);
            const isNameBased = !/^[A-Za-z0-9_-]{10,}$/.test(dealerId) || dealerId.includes(' ');

            if (locationId && (isMojibake || isNameBased) && dealerId !== locationId) {
                console.log(`>>> MOVING DATA from ${dealerId} to ${locationId}`);

                // 1. Move main document data
                await db.collection('Dealers').doc(locationId).set(data, { merge: true });

                // 2. Move subcollections
                const subColls = await doc.ref.listCollections();
                for (const subColl of subColls) {
                    await moveCollection(`Dealers/${dealerId}/${subColl.id}`, `Dealers/${locationId}/${subColl.id}`);
                }

                // 3. Delete the old document (and its subcollections if possible)
                // Note: listCollections and recursive deletion is needed.
                console.log(`!!! DELETE candidate: ${dealerId}`);
            }
        }
        console.log('Migration logic finished.');
    } catch (e) {
        console.error('Error during migration:', e);
    }
}

run();
