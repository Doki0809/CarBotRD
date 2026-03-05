require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log("--- Supabase User ---");
    const { data: u } = await supabase.from('usuarios').select('*').eq('correo', 'jeancarlosgf1313@gmail.com');
    console.log(u);

    if (u && u.length > 0) {
        const { data: d1 } = await supabase.from('dealers').select('*').eq('id', u[0].dealer_id);
        console.log("--- Dealer of User ---");
        console.log(d1.map(d => ({ id: d.id, name: d.nombre, loc: d.ghl_location_id })));
    }

    console.log("--- All Dealers ---");
    const { data: d2 } = await supabase.from('dealers').select('id, nombre, ghl_location_id, slug');
    console.log(d2);
}
run();
