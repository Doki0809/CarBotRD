const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // Provide if needed or use application default
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

async function run() {
  const doc = await db.collection("Dealers").doc("dura-n-ferna-ndez-auto-srl").collection("llave_ghl").doc("config").get();
  if (!doc.exists) {
     const doc2 = await db.collection("Dealers").doc("DURAN FERNANDEZ AUTO SRL").collection("llave_ghl").doc("config").get();
     console.log("DURAN FERNANDEZ AUTO SRL (spaces):", doc2.data());
  } else {
     console.log("dura-n-ferna-ndez-auto-srl:", doc.data());
  }
  const defaultDoc = await db.collection("Dealers").doc("default").collection("llave_ghl").doc("config").get();
  console.log("default config:", defaultDoc.data());
}
run().then(() => process.exit(0)).catch(e => console.error(e));
