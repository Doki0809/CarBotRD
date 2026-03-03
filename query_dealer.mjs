import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODE4MTEsImV4cCI6MjA4NzM1NzgxMX0.HMVGq8E2Lf5utJGxWsO8FEnJXCBzwSHVNEzeuoSm4y8';

const client = createClient(SUPABASE_URL, SUPABASE_ANON);

async function check() {
  console.log("Checking DB...");
  try {
      const { data, error } = await client.from('dealers').select('*').limit(2);
      if(error) {
          console.log("Error fetching:", error);
          return;
      }
      if(data && data.length > 0) {
          console.log("-- FOUND DATA --");
          console.log("ghl_location_id:", data[0].ghl_location_id);
          console.log("Keys available:", Object.keys(data[0]));
      } else {
          console.log("No data found");
      }
  } catch(e) {
      console.log("Exception:", e);
  }
}
check();
