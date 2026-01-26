const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

const DEALER_ID = "dura-n-ferna-ndez-auto-srl"; // Standardized Slug to prevent phantoms

async function fixDataBot() {
    console.log(`🔧 Iniciando reparación para: ${DEALER_ID}`);

    const dealerRef = db.collection("Dealers").doc(DEALER_ID);
    const dealerSnap = await dealerRef.get();

    if (!dealerSnap.exists) {
        console.error("❌ El dealer NO existe. Verifica el ID exacto.");
        return;
    }

    console.log("✅ Dealer encontrado.");

    const botConfigRef = dealerRef.collection(":DATA BOT RN").doc("CONFIG");
    const botConfigSnap = await botConfigRef.get();

    if (botConfigSnap.exists) {
        console.log("⚠️ La configuración YA existe:", botConfigSnap.data());
    } else {
        console.log("🆕 Creando configuración faltante...");
        await botConfigRef.set({
            LINK_INVENTARIO_GHL: `https://inventarioia-gzhz2ynksa-uc.a.run.app/?dealer=${DEALER_ID.replace(/\s+/g, '%20')}`,
            // Nota: En URL real los espacios son %20, pero el backend maneja el ID crudo si es query param
            LINK_TIENDA: `https://carbot-5d709.web.app/inventory?dealer=${DEALER_ID.replace(/\s+/g, '%20')}`,
            bot_active: true,
            createdAt: new Date().toISOString(),
            fixedBy: "System Repair Script"
        });
        console.log("✅ Configuración creada con éxito.");
    }
}

fixDataBot().then(() => {
    console.log("Finalizado.");
    process.exit(0);
}).catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
