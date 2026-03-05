import { supabase } from './src/supabase.js';

async function checkUser() {
    console.log("Checking user 'janilfernandez@hotmail.com'...");
    const { data: user, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('correo', 'janilfernandez@hotmail.com')
        .maybeSingle();

    if (error) {
        console.error("Error fetching user:", error);
    } else {
        console.log("User record:", JSON.stringify(user, null, 2));
    }
}

checkUser();
