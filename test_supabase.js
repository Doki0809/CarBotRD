import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/jean/carbotSystem/.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const { data, error } = await supabase.from('vehiculos').select('id, precio, inicial, detalles').order('created_at', { ascending: false }).limit(5);
console.log(JSON.stringify(data, null, 2));
