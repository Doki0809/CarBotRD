import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import * as postgres from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const databaseUrl = Deno.env.get("SUPABASE_DB_URL")!;
    if (!databaseUrl) {
      throw new Error("No SUPABASE_DB_URL found in env vars.");
    }

    const pool = new postgres.Pool(databaseUrl, 3, true);
    const connection = await pool.connect();

    try {
      // 1. Drop existing primary key default if any
      await connection.queryObject`ALTER TABLE "public"."dealers" ALTER COLUMN "id" DROP DEFAULT;`;
      // 2. Change column type to generic text
      await connection.queryObject`ALTER TABLE "public"."dealers" ALTER COLUMN "id" TYPE text USING id::text;`;

      return new Response(JSON.stringify({ success: true, message: "Tables altered successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Database error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
