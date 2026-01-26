const admin = require('firebase-admin');

// Initialize with the project ID
admin.initializeApp({
    projectId: 'carbot-5d709'
});

const db = admin.firestore();

const DEALER_ID = '5YBWavjywU0Ay0Y85R9p'; // The technical ID we want to fix
const DEALER_NAME = 'DURÁN FERNÁNDEZ AUTO S.R.L';

async function repair() {
    console.log(`Starting repair for Dealer ID: ${DEALER_ID}`);

    try {
        // 1. Fix the main Dealer document
        const dealerRef = db.collection('Dealers').doc(DEALER_ID);
        await dealerRef.set({
            name: DEALER_NAME,
            nombre: DEALER_NAME, // Ensure both fields exist
            ghlLocationId: DEALER_ID,
            status: 'active',
            lastRepair: new Date().toISOString()
        }, { merge: true });
        console.log('✅ Dealer main document updated (name/nombre).');

        // 2. Create/Fix the Data Bot configuration (Legacy name with colon)
        // Note: Use a variable for the collection name to ensure exact string matching
        const botCollectionName = ':DATA BOT RN';
        const configPath = `Dealers/${DEALER_ID}/${botCollectionName}/CONFIG`;

        // Construct links safely
        const linkInventario = `https://inventarioia-gzhz2ynksa-uc.a.run.app/?dealer=${encodeURIComponent(DEALER_ID)}`;
        const linkTienda = `https://carbot-5d709.web.app/inventory?dealer=${encodeURIComponent(DEALER_ID)}`;

        const botConfigRef = db.doc(configPath);
        await botConfigRef.set({
            LINK_INVENTARIO_GHL: linkInventario,
            LINK_TIENDA: linkTienda,
            bot_active: true,
            dealerName: DEALER_NAME,
            repairedBy: 'Manual Script'
        }, { merge: true });

        console.log(`✅ Bot Config created at ${configPath}`);
        console.log(`   Inventory Link: ${linkInventario}`);

    } catch (error) {
        console.error('❌ Error repairing dealer:', error);
    }
}

repair();
