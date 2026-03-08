const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

async function checkUser(uid) {
    console.log("Checking UID:", uid);
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
        console.log("User Data:", JSON.stringify(doc.data(), null, 2));
    } else {
        console.log("User not found in 'users' collection.");
    }
}

// Check both possible UIDs for Jean
const uids = ['YrQX0pFF5HMb7ZstthmJB5PflAy2', 'WlieHf7dOYNo3S2bd1yxycQAENW2'];
Promise.all(uids.map(checkUser)).catch(console.error);
