import fs from 'fs';
const dbUrl = "https://api.supabase.com/v1/projects/lpiwkennlavpzisdvnnh/database/query";
const adminKey = "sbp_1c9d61d15925cf3579e6294023069d120525ff60";

const query = `
SELECT 
  u.id as user_id, 
  u.dealer_id,
  d.nombre as dealer_name
FROM usuarios u
LEFT JOIN dealers d ON u.dealer_id = d.id;
`;

async function run() {
    const res = await fetch(dbUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${adminKey}`,
            "Content-Type": "application/json",
            "User-Agent": "curl/7.68.0"
        },
        body: JSON.stringify({ query })
    });
    console.log(await res.text());
}
run();
