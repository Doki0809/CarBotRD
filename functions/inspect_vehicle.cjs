const admin = require("firebase-admin");

admin.initializeApp({
    projectId: "carbot-5d709"
});

const db = admin.firestore();

async function inspectVehicle() {
    console.log("Inspecting vehicles...");
    try {
        const folders = await db.collection("Dealers").listDocuments();
        for (const folder of folders) {
            const vSnap = await folder.collection("vehiculos").limit(1).get();
            if (!vSnap.empty) {
                console.log(`Dealer: ${folder.id}`);
                console.log(`Vehicle Fields:`, Object.keys(vSnap.docs[0].data()));
                console.log(`Sample Data:`, vSnap.docs[0].data());
                break;
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

inspectVehicle();
