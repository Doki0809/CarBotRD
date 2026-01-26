const admin = require("firebase-admin");

// We assume we are in the environment where process.env has the project info
// or we can use the local firebase configuration.
// Since I don't have a serviceAccountKey.json, I'll use the default credential
// if I'm running in a context that has it, or I'll try to use the project ID.

admin.initializeApp({
    projectId: "carbot-5d709"
});

const db = admin.firestore();

// slugify function copied from functions/index.js
const slugify = (text) => {
    if (!text) return "";
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\./g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
};

async function initLinks() {
    console.log("🚀 Starting initialization of :DATA BOT RN links...");
    const dealersSnap = await db.collection("Dealers").get();
    console.log(`Found ${dealersSnap.size} dealers.`);

    let count = 0;
    for (const doc of dealersSnap.docs) {
        const data = doc.data();
        const dealerId = doc.id;
        const rawName = data.display_name || data.nombre || dealerId;
        const slug = slugify(rawName);

        console.log(`Processing Dealer: ${rawName} (${dealerId}) -> Slug: ${slug}`);

        const botLink = `https://inventarioia-gzhz2ynksa-uc.a.run.app/?dealerID=${slug}`;
        const shopLink = `https://inventarioia-gzhz2ynksa-uc.a.run.app/tienda?dealerID=${slug}`;

        const configRef = db.collection("Dealers").doc(dealerId).collection(":DATA BOT RN").doc("CONFIG");

        await configRef.set({
            LINK_INVENTARIO_GHL: botLink,
            LINK_TIENDA: shopLink,
            dealer_id: dealerId,
            dealer_name: rawName,
            slug: slug,
            status: "active",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Also update slug in dealer document for consistency
        await doc.ref.set({ slug: slug }, { merge: true });

        count++;
    }
    console.log(`✅ Successfully initialized ${count} dealers.`);
}

initLinks().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
