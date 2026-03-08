const adminKey = "sbp_1c9d61d15925cf3579e6294023069d120525ff60";
const projectRef = "lpiwkennlavpzisdvnnh";
const queryUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function checkRLS() {
    const query = `
        SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'dealers';
    `;
    const res = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
checkRLS().catch(console.error);
