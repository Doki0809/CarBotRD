const adminKey = "sbp_1c9d61d15925cf3579e6294023069d120525ff60";
const projectRef = "lpiwkennlavpzisdvnnh";
const queryUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function checkStatus() {
    const query = `SELECT id, nombre, activo, id_busqueda FROM dealers;`;
    const res = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
checkStatus().catch(console.error);
