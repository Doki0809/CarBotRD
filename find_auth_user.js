const adminKey = "sbp_1c9d61d15925cf3579e6294023069d120525ff60";
const projectRef = "lpiwkennlavpzisdvnnh";
const queryUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function findAuthUser() {
    const email = "jeancarlosgf13@gmail.com";
    console.log(`🔍 Buscando UID para ${email} en auth.users...`);

    const query = `
        SELECT id, email 
        FROM auth.users 
        WHERE email = '${email}';
    `;

    const res = await fetch(queryUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${adminKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });

    const data = await res.json();
    console.log("✅ Resultado:", JSON.stringify(data, null, 2));
}

findAuthUser().catch(console.error);
