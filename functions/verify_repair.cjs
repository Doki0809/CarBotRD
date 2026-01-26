const admin = require('firebase-admin');

// Initialize with the project ID
admin.initializeApp({
    projectId: 'carbot-5d709'
});

const db = admin.firestore();
const DEALER_ID = '5YBWavjywU0Ay0Y85R9p';

async function verify() {
    console.log('Verifying data...');

    // 1. Check Dealer
    const dealerSnap = await db.collection('Dealers').doc(DEALER_ID).get();
    console.log('Dealer Exists:', dealerSnap.exists);
    if (dealerSnap.exists) {
        console.log('Dealer Data:', JSON.stringify(dealerSnap.data(), null, 2));
    }

    // 2. Check Bot Config
    const botConfigSnap = await db.collection('Dealers').doc(DEALER_ID).collection(':DATA BOT RN').doc('CONFIG').get();
    console.log('Bot Config Exists:', botConfigSnap.exists);
    if (botConfigSnap.exists) {
        console.log('Bot Data:', JSON.stringify(botConfigSnap.data(), null, 2));
    }
}

verify();
