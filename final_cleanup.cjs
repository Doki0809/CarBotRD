const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'carbot-5d709'
});

const db = admin.firestore();

async function deleteRecursive(docRef) {
    const subColls = await docRef.listCollections();
    for (const subColl of subColls) {
        const snap = await subColl.get();
        for (const d of snap.docs) {
            await deleteRecursive(d.ref);
        }
    }
    console.log(`Deleting: ${docRef.path}`);
    await docRef.delete();
}

async function run() {
    try {
        const snap = await db.collection('Dealers').get();
        console.log(`Found ${snap.size} dealers. Checking for ghosts...`);

        for (const doc of snap.docs) {
            const id = doc.id;
            const data = doc.data();
            const locationId = data.ghlLocationId || data.locationId;
            const hasMojibake = /Ã|Â|\x81|\x82/.test(id);

            // Si tiene mojibake O es un nombre con tildes y tenemos el ID técnico, migramos y borramos
            if (hasMojibake || (id.includes('Á') || id.includes('É') || id.includes('Í') || id.includes('Ó') || id.includes('Ú'))) {
                if (locationId && id !== locationId) {
                    console.log(`MIGRATING: ${id} -> ${locationId}`);
                    // Movemos subcolecciones primero
                    const subColls = await doc.ref.listCollections();
                    for (const subColl of subColls) {
                        const subSnap = await subColl.get();
                        for (const sd of subSnap.docs) {
                            await db.collection('Dealers').doc(locationId).collection(subColl.id).doc(sd.id).set(sd.data(), { merge: true });
                        }
                    }
                    // Movemos el documento principal
                    await db.collection('Dealers').doc(locationId).set(data, { merge: true });
                }

                console.log(`MATCHED FOR DELETION: ${id}`);
                await deleteRecursive(doc.ref);
            } else {
                console.log(`Keeping stable dealer: ${id}`);
            }
        }
        console.log('Cleanup finished.');
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
