const admin = require("firebase-admin");
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const serviceAccount = require("../serviceAccountKey.json");
const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODE4MTEsImV4cCI6MjA4NzM1NzgxMX0.HMVGq8E2Lf5utJGxWsO8FEnJXCBzwSHVNEzeuoSm4y8';

// Initialize Adms
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function recoverData() {
    console.log('🚀 Iniciando Proceso de Recuperación de Datos...');

    // 1. Obtener vehículos de Supabase (Todos, para inspección profunda)
    const { data: allVehicles, error: fetchErr } = await supabase
        .from('vehiculos')
        .select('id, titulo_vehiculo, estado, detalles, dealer_id');

    if (fetchErr) {
        console.error('❌ Error al obtener vehículos de Supabase:', fetchErr);
        return;
    }

    // Filtrar los que realmente necesitan recuperación (detalles vacíos o sin campos clave)
    const targets = allVehicles.filter(v => {
        if (!v.detalles) return true;
        // Si no tiene marca o modelo en detalles, es candidato (el bug borraba casi todo)
        return !v.detalles.make || !v.detalles.model || !v.detalles.vin || !v.detalles.chasis;
    });

    console.log(`📊 Se encontraron ${targets.length} vehículos candidatos para recuperación.`);

    for (const vehicle of targets) {
        console.log(`\n🔍 Procesando Vehículo ID: ${vehicle.id} (${vehicle.titulo_vehiculo})`);

        // Intentar encontrar contratos en Firestore para este vehículo
        // Buscamos en TODOS los dealers (ya que no sabemos a qué dealer de Firestore corresponde el UUID de Supabase directamente sin un mapa)
        const dealersSnap = await db.collection("Dealers").get();
        let foundMetadata = null;

        for (const dealerDoc of dealersSnap.docs) {
            const dealerId = dealerDoc.id;

            // Colecciones posibles de documentos
            const collections = [
                db.collection("Dealers").doc(dealerId).collection("documentos").doc("contratos").collection("items"),
                db.collection("Dealers").doc(dealerId).collection("contracts"),
                db.collection("Dealers").doc(dealerId).collection("documentos").doc("cotizaciones").collection("items"),
                db.collection("Dealers").doc(dealerId).collection("quotes")
            ];

            for (const coll of collections) {
                const qSnap = await coll.where("vehicleId", "==", vehicle.id).get();
                if (!qSnap.empty) {
                    // Tomar el primer documento (snapshot) que tenga data útil
                    const docData = qSnap.docs[0].data();
                    const vehicleSnapshot = docData.vehicle || docData.vehiculo || docData;

                    if (vehicleSnapshot && (vehicleSnapshot.make || vehicleSnapshot.marca)) {
                        console.log(`✅ ¡Snapshot encontrado en Firestore! Dealer: ${dealerId}, Coll: ${coll.path}`);
                        foundMetadata = vehicleSnapshot;
                        break;
                    }
                }
            }
            if (foundMetadata) break;
        }

        if (foundMetadata) {
            // Normalizar metadatos encontrados
            const recoveredDetails = {
                ...vehicle.detalles, // Mantener lo poco que haya
                make: foundMetadata.make || foundMetadata.marca || vehicle.detalles?.make,
                model: foundMetadata.model || foundMetadata.modelo || vehicle.detalles?.model,
                year: foundMetadata.year || foundMetadata.año || foundMetadata.ao || vehicle.detalles?.year,
                color: foundMetadata.color || vehicle.detalles?.color,
                vin: foundMetadata.vin || foundMetadata.chasis || vehicle.detalles?.vin,
                chasis: foundMetadata.chasis || foundMetadata.vin || vehicle.detalles?.chasis,
                engine: foundMetadata.engine || foundMetadata.motor || vehicle.detalles?.engine,
                transmission: foundMetadata.transmission || foundMetadata.transmision || vehicle.detalles?.transmission,
                edition: foundMetadata.edition || foundMetadata.edicion || vehicle.detalles?.edition,
                mileage: foundMetadata.mileage || foundMetadata.millaje || vehicle.detalles?.mileage,
                mileage_unit: foundMetadata.mileage_unit || foundMetadata.unidad_millaje || vehicle.detalles?.mileage_unit,
                price: foundMetadata.price || foundMetadata.precio || vehicle.detalles?.price,
                _recovered_at: new Date().toISOString(),
                _recovery_source: 'Firestore Contract Snapshot'
            };

            // Actualizar Supabase
            const { error: updateErr } = await supabase
                .from('vehiculos')
                .update({ detalles: recoveredDetails })
                .eq('id', vehicle.id);

            if (updateErr) {
                console.error(`❌ Error al actualizar vehículo ${vehicle.id}:`, updateErr);
            } else {
                console.log(`🎉 Vehículo ${vehicle.id} recuperado con éxito.`);
            }
        } else {
            console.log(`⚠️ No se encontró snapshot en Firestore para el vehículo ${vehicle.id}.`);
        }
    }

    console.log('\n🏁 Proceso de recuperación finalizado.');
    process.exit(0);
}

recoverData();
