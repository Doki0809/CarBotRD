const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lpiwkennlavpzisdvnnh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '...'; // I will just use node to read the .env file

const dotEnv = fs.readFileSync('.env.local', 'utf8');
const envUrlMatch = dotEnv.match(/VITE_SUPABASE_URL=(.*)/);
const envKeyMatch = dotEnv.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const client = createClient(envUrlMatch[1], envKeyMatch[1]);

async function run() {
  const { data: d1 } = await client.from('dealers').select('*').eq('ghl_location_id', '3r93srEWACDqgdzxYKx4');
  console.log("Dealer 3r93srEWACDqgdzxYKx4:", d1);
  
  const { data: u1 } = await client.from('usuarios').select('*').eq('correo', 'jeancarlosgf1313@gmail.com');
  console.log("User jean:", u1);
  
  const { data: d2 } = await client.from('dealers').select('*').ilike('nombre', '%Duran%');
  console.log("Duran Fernandez:", d2.map(d => ({id: d.id, name: d.nombre, loc: d.ghl_location_id})));
}
run();
