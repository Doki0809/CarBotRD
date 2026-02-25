import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/jean/carbotSystem/.env' });

const sqlPath = '/Users/jean/carbotSystem/add_detalles.sql';

async function run() {
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Using native node fetch
    const response = await fetch(`https://api.supabase.com/v1/projects/${project_ref}/database/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    console.log("Status:", response.status);
    console.log("Response:", data);
}

run();
