const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugNesting() {
    const itemPath = "Dealers/33723933-7372-4557-a143-447167647a78/documentos/contratos/items/Contrato_JEAN_GOMEZ_HYUNDAI_ELNTRA_2130";
    console.log(`🔍 Inspecting ${itemPath}...`);

    // Split the path to find parents
    const parts = itemPath.split('/');
    // Dealers (0), {id} (1), documentos (2), contratos (3), items (4), {docId} (5)

    // Check parent document: Dealers/{id}/documentos/contratos
    const parentDocPath = parts.slice(0, 4).join('/');
    console.log(`  Parent Doc: ${parentDocPath}`);
    const parentDoc = await db.doc(parentDocPath).get();
    if (parentDoc.exists) {
        console.log(`    Exists! Keys: ${Object.keys(parentDoc.data()).join(', ')}`);
        if (parentDoc.data().vehicle) console.log(`    Vehicle found in parent!`);
    } else {
        console.log(`    Does not exist as a document (might be a collection).`);
    }

    // List collections under Dealer/{id}
    const dealerPath = `Dealers/33723933-7372-4557-a143-447167647a78`;
    const collections = await db.doc(dealerPath).listCollections();
    console.log(`  Collections under Dealer: ${collections.map(c => c.id).join(', ')}`);
}

debugNesting().catch(console.error);
