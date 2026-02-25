import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const dbUrl = 'postgresql://postgres:lWXXWIFn18f1lP8i@db.zcyzllfhmxndymusibwq.supabase.co:5432/postgres';

const sqlPath = '/Users/jean/carbotSystem/add_detalles.sql';

async function run() {
    const client = new Client({ connectionString: dbUrl });
    try {
        await client.connect();
        console.log("Connected to Supabase PostgreSQL!");
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await client.query(sql);
        console.log("SQL executed successfully!");
    } catch (error) {
        console.error("Error executing SQL:", error);
    } finally {
        await client.end();
    }
}

run();
