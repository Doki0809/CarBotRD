import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

    try {
        const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 1. Encontrar a ventas@agil.com.do o alguien de Gary.
        const { data: userAdmin, error: authErr } = await admin.auth.admin.listUsers();
        if (authErr) throw authErr;

        const testUser = userAdmin.users.find(u => u.email === "ventas@agil.com.do") || userAdmin.users[0];

        // 2. Hacer un cliente como el Frontend usando el ID del usuario (Simular RLS)
        // No tenemos el password, pero "admin.auth.admin.generateLink" nos puede dar un access token fake,
        // o podemos usar POST /oauth/token para impersonar...
        // O más directo: consultar DB con fetch local y Bearer JWT manual.
        // Pero Supabase JS no deja impersonar fácil sin login.
        // Usemos jwt encode temporal... Ah, the easiest way is just print their row details

        // Let's actually find what the exact database looks like for ventas@agil.com.do
        const { data: supaUser, error: supaErr } = await admin
            .from('usuarios')
            .select('nombre, correo, rol, dealer_id, dealers(nombre, ghl_location_id)')
            .eq('correo', testUser.email)
            .maybeSingle();

        // 3. Revisamos qué tiene Auth vs Database
        return new Response(JSON.stringify({
            auth_user: { id: testUser.id, email: testUser.email },
            db_profile: supaUser,
            db_error: supaErr
        }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
    } catch (err) {
        return new Response(JSON.stringify({ found: false, error: err.message || "Internal Server Error" }), { status: 500, headers: CORS });
    }
});
