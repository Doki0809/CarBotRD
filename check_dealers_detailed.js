const adminKey = "sbp_1c9d61d15925cf3579e6294023069d120525ff60";
const projectRef = "lpiwkennlavpzisdvnnh";
const queryUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function checkDealersDetailed() {
    const query = `SELECT column_name, data_type, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'dealers' ORDER BY column_name;`;
    const res = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
checkDealersDetailed().catch(console.error);
