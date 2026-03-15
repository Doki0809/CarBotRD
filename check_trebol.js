import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const dotEnv = fs.readFileSync('.env.local', 'utf8');
const envUrlMatch = dotEnv.match(/VITE_SUPABASE_URL=(.*)/);
const envKeyMatch = dotEnv.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const client = createClient(envUrlMatch[1].trim().replace(/['"]/g, ''), envKeyMatch[1].trim().replace(/['"]/g, ''));

async function run() {
    const { data: d1 } = await client.from('dealers').select('id, nombre, ghl_location_id, slug').ilike('nombre', '%Trebol%');
    console.log("Trebol:");
    console.log(d1);

    const { data: d2 } = await client.from('dealers').select('id, nombre, ghl_location_id, slug').ilike('nombre', '%Gary%');
    console.log("Gary Motors:");
    console.log(d2);

    if (d1 && d1.length > 0) {
        const { data: v1 } = await client.from('vehiculos').select('id, titulo_vehiculo, dealer_id').eq('dealer_id', d1[0].id);
        console.log("Vehicles for Trebol:", v1);
    }

    if (d2 && d2.length > 0) {
        const { data: v2 } = await client.from('vehiculos').select('id, titulo_vehiculo, dealer_id').eq('dealer_id', d2[0].id);
        console.log("Vehicles for Gary:", v2);
    }
}
run();
