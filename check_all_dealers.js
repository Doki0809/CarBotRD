const adminKey = "sbp_1c9d61d15925cf3579e6294023069d120525ff60";
const projectRef = "lpiwkennlavpzisdvnnh";
const queryUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function checkDealers() {
    const query = "SELECT id, nombre, id_busqueda, ghl_location_id, catalogo_url, ia_url FROM dealers;";
    const res = await fetch(queryUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${adminKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
checkDealers().catch(console.error);
