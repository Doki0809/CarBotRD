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
    const { email, password, name, dealerName, locationId } = await req.json();

    if (!email || !password || !name || !locationId) {
      return new Response(JSON.stringify({ found: false, error: "Faltan datos requeridos (email, password, name, locationId)" }), { status: 400, headers: CORS });
    }

    const safeEmail = email.trim().toLowerCase();

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 1. Obtener o crear el dealer
    let { data: dealer } = await admin
      .from('dealers')
      .select('id')
      .eq('ghl_location_id', locationId)
      .maybeSingle();

    if (!dealer) {
      const nm = dealerName || "Nuevo Dealer";
      const encodedName = encodeURIComponent(nm).replace(/'/g, "''");
      const catalogo_url = `https://inventarioia-gzhz2ynksa-uc.a.run.app/catalogo?dealerID=${encodedName}`;
      const ia_url = `https://inventarioia-gzhz2ynksa-uc.a.run.app/?dealer=${encodedName}`;

      const { data: newDealer, error: newDlrErr } = await admin
        .from('dealers')
        .insert({
          nombre: nm,
          ghl_location_id: locationId,
          catalogo_url,
          ia_url
        })
        .select('id')
        .single();
      if (newDlrErr) throw newDlrErr;
      dealer = newDealer;
    }

    // 2. Crear usuario de Auth (si ya existe, esto fallará o lo devolverá, pero createUser es seguro)
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: safeEmail,
      password: password,
      email_confirm: true,
      user_metadata: { name: name }
    });

    if (authErr) {
      return new Response(JSON.stringify({ found: false, error: authErr.message }), { status: 400, headers: CORS });
    }

    const userId = authData.user.id;

    // 3. Insertar registro en la tabla usuarios
    const { error: insertErr } = await admin.from('usuarios').upsert({
      id: userId,
      correo: safeEmail,
      nombre: name,
      dealer_id: dealer.id,
      rol: 'admin' // By default make them admin of their new setup
    }, { onConflict: 'id' });

    if (insertErr) {
      // Rollback Auth user if possible or just log error
      console.error("Error insertando usuario: ", insertErr);
      return new Response(JSON.stringify({ found: false, error: "Error de inserción de perfil. Intenta de nuevo." }), { status: 500, headers: CORS });
    }

    return new Response(JSON.stringify({ success: true, user: authData.user }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Error en register-new-user:", err);
    return new Response(JSON.stringify({ found: false, error: err.message || "Internal Server Error" }), { status: 500, headers: CORS });
  }
});
