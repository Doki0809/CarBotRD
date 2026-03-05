require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.from('vehiculos').select('id, deleted_at').limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
}
test();
