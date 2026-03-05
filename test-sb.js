import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env
console.log('URL:', process.env.VITE_SUPABASE_URL);

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('vehiculos').select('id, deleted_at').limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
}
test();
