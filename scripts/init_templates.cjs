const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

/**
 * Script: init_templates.cjs
 * Objetivo: Asegurar que todos los documentos en 'Dealers' tengan configuracion_contratos.
 */

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase initialized with service account.');
} catch (error) {
    console.error('❌ Error initializing Firebase:', error);
    process.exit(1);
}

const db = admin.firestore();

async function initContractTemplates() {
    try {
        console.log('🚀 Iniciando inicialización en la colección "Dealers" (case-sensitive)...');

        // CAMBIO CLAVE: 'Dealers' con D mayúscula
        const dealersRef = db.collection('Dealers');
        const snapshot = await dealersRef.get();

        if (snapshot.empty) {
            console.log('⚠️ No se encontraron documentos en la colección "Dealers".');
            return;
        }

        console.log(`📊 Encontrados ${snapshot.size} documentos en "Dealers".`);

        const batch = db.batch();
        const defaultValue = {
            configuracion_contratos: {
                plantilla_html: '<div style="font-family: Arial, sans-serif; padding: 20px;"><h1>CONTRATO DE VENTA</h1><p>Fecha: {{FECHA_VENTA}}</p><p><strong>Vendedor:</strong> {{DEALER_NOMBRE}}</p><hr><h3>Datos del Cliente</h3><p>Nombre: {{CLIENTE_NOMBRE}}</p><p>Documento: {{CLIENTE_DOC}}</p><h3>Vehículo</h3><p>{{VEHICULO_MARCA}} {{VEHICULO_MODELO}} {{VEHICULO_ANIO}}</p><p>VIN: {{VEHICULO_VIN}}</p><p>Precio Final: {{TOTAL_PAGAR}}</p><br><br><p>_________________<br>Firma Cliente</p></div>',
                variables_disponibles: ["{{CLIENTE_NOMBRE}}", "{{CLIENTE_DOC}}", "{{VEHICULO_MARCA}}", "{{VEHICULO_MODELO}}", "{{VEHICULO_VIN}}", "{{TOTAL_PAGAR}}"]
            }
        };

        snapshot.forEach((doc) => {
            console.log(`📝 Preparando actualización para: ${doc.id}`);
            batch.set(doc.ref, defaultValue, { merge: true });
        });

        console.log('📡 Enviando cambios a Firestore...');
        await batch.commit();

        console.log(`✅ ¡Éxito! Se actualizaron ${snapshot.size} documentos en "Dealers" correctamente.`);

    } catch (error) {
        console.error('❌ Error crítico en la ejecución:', error);
    } finally {
        process.exit(0);
    }
}

initContractTemplates();
