import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async () => {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data, error } = await admin.from('dealers').select('*').limit(2);
  return new Response(JSON.stringify({ data, error }), { headers: { "Content-Type": "application/json" } });
});
