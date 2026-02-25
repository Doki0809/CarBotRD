import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/jean/carbotSystem/.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_ADMIN = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ADMIN);

async function run() {
    const dataToSave = {
        dealer_id: 'db5fb8a4-79fa-4cc9-b003-a15d0eec9569', // using a dummy or we can query one
        titulo_vehiculo: 'TEST B',
        estado: 'Disponible',
        color: null,
        condicion_carfax: null,
        chasis_vin: null,
        traccion: null,
        transmision: null,
        motor: null,
        techo: null,
        combustible: null,
        llave: null,
        camara: null,
        material_asientos: null,
        precio: 0,
        inicial: 0,
        millas: 0,
        cantidad_asientos: null,
        baul_electrico: false,
        sensores: false,
        carplay: false,
        vidrios_electricos: false,
        fotos: [],
        documentos: []
    };

    // Find a valid dealer first
    const { data: dealers } = await supabase.from('dealers').select('id').limit(1);
    if (dealers && dealers.length > 0) {
        dataToSave.dealer_id = dealers[0].id;
    }

    const { data, error } = await supabase.from('vehiculos').insert([dataToSave]).select();
    if (error) {
        console.error("Insert Error:", error);
    } else {
        console.log("Insert Success:", data);
    }
}
run();
