import { supabase } from './src/supabase.js';

async function listDealers() {
    console.log("Listing all dealers...");
    const { data: dealers, error } = await supabase
        .from('dealers')
        .select('id, nombre, ghl_location_id');

    if (error) {
        console.error("Error fetching dealers:", error);
    } else {
        console.log("Dealers found:", JSON.stringify(dealers, null, 2));
    }
}

listDealers();
