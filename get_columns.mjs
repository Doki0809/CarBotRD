import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODE4MTEsImV4cCI6MjA4NzM1NzgxMX0.HMVGq8E2Lf5utJGxWsO8FEnJXCBzwSHVNEzeuoSm4y8';

const client = createClient(SUPABASE_URL, SUPABASE_ANON);

async function check() {
  const { data, error } = await client.rpc('get_dealer_columns'); // if exists
  console.log(error);
  // Alternatively, just query one row bypassing RLS if possible? No.
  // Wait, let's just use the REST API to fetch the OpenAPI swagger definition.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_ANON}`);
  const json = await res.json();
  const dealerProps = json.definitions?.dealers?.properties;
  console.log("Dealer columns:", dealerProps ? Object.keys(dealerProps) : "Not found in definitions");
}
check();
