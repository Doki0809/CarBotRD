import fs from 'fs';

const dbUrl = "https://api.supabase.com/v1/projects/lpiwkennlavpzisdvnnh/database/query";
const adminKey = "sbp_1c9d61d15925cf3579e6294023069d120525ff60";

async function run() {
    const querySelect = "SELECT * FROM vehiculos;";

    const selectRes = await fetch(dbUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${adminKey}`,
            "Content-Type": "application/json",
            "User-Agent": "curl/7.68.0"
        },
        body: JSON.stringify({ query: querySelect })
    });

    const vehiculos = await selectRes.text();
    console.log("Vehiculos:", vehiculos);
}

run();
