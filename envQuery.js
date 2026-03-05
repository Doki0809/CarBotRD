import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const dotEnv = fs.readFileSync('.env.local', 'utf8');
const envUrlMatch = dotEnv.match(/VITE_SUPABASE_URL=(.*)/);
const envKeyMatch = dotEnv.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const client = createClient(envUrlMatch[1].trim().replace(/['"]/g, ''), envKeyMatch[1].trim().replace(/['"]/g, ''));

async function run() {
  const { data: d1 } = await client.from('dealers').select('*').in('ghl_location_id', ['3r93srEWACDqgdzxYKx4', '5YBWavjywU0Ay0Y85R9p']);
  console.log("Dealers by location_id:");
  console.log(d1);
  
  const { data: d2 } = await client.from('dealers').select('*').ilike('nombre', '%Gary%');
  console.log("Gary Motors:");
  console.log(d2);
}
run();
