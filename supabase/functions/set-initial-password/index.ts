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
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const { email, password } = await req.json();

        if (!email || !password) {
            return new Response(JSON.stringify({ found: false, error: "Email y password requeridos" }), { status: 400, headers: CORS });
        }

        // 1. Buscar en tabla usuarios para obtener el id
        const { data: usuario, error: dbErr } = await supabase
            .from("usuarios")
            .select("id")
            .eq("correo", email.trim().toLowerCase())
            .maybeSingle();

        if (dbErr || !usuario) {
            return new Response(JSON.stringify({ found: false, error: "Usuario local no existe" }), { status: 404, headers: CORS });
        }

        // 2. Obtener la metadata de auth para asegurar que es su primera vez
        const { data: authData, error: authErr } = await supabase.auth.admin.getUserById(usuario.id);

        if (authErr || !authData?.user) {
            return new Response(JSON.stringify({ found: false, error: "Usuario Auth no existe" }), { status: 404, headers: CORS });
        }

        if (authData.user.last_sign_in_at) {
            return new Response(JSON.stringify({ found: false, error: "Este usuario ya ha iniciado sesión antes. No puedes sobrescribir la contraseña." }), { status: 403, headers: CORS });
        }

        // 3. Actualizar la contraseña
        const { error: updateErr } = await supabase.auth.admin.updateUserById(usuario.id, {
            password: password,
            email_confirm: true
        });

        if (updateErr) throw updateErr;

        return new Response(JSON.stringify({ success: true, user: authData.user }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });

    } catch (err) {
        console.error("Error en set-initial-password:", err);
        return new Response(JSON.stringify({ found: false, error: err.message || "Internal Server Error" }), { status: 500, headers: CORS });
    }
});
