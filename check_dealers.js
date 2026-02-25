import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

const envConfig = dotenv.parse(fs.readFileSync('/Users/jean/carbotSystem/.env'))

const adminClient = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Checking dealers...");
    const { data, error } = await adminClient.from('dealers').select('id, nombre, logo_url');
    if (error) {
        console.error(error);
        return;
    }
    console.log("Dealers:");
    data.forEach(d => {
        console.log(`- ${d.nombre}`);
        console.log(`  Logo: ${d.logo_url}`);
    });
}

run();
