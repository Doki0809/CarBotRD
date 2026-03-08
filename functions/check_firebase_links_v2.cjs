const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODE4MTEsImV4cCI6MjA4NzM1NzgxMX0.HMVGq8E2Lf5utJGxWsO8FEnJXCBzwSHVNEzeuoSm4y8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function checkFirebaseLinks() {
    const { data, error } = await supabase
        .from('vehiculos')
        .select('fotos, detalles')
        .not('fotos', 'is', null);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Checking ${data.length} vehicles...`);
    let found = 0;
    data.forEach(v => {
        let isFirebase = false;
        if (v.fotos) v.fotos.forEach(url => {
            if (url.includes('firebasestorage') || url.includes('storage.googleapis.com')) {
                console.log('Found Firebase Photo URL:', url);
                isFirebase = true;
            }
        });
        if (v.detalles && v.detalles.pdf_final) {
            if (v.detalles.pdf_final.includes('firebasestorage') || v.detalles.pdf_final.includes('storage.googleapis.com')) {
                console.log('Found Firebase PDF URL:', v.detalles.pdf_final);
                isFirebase = true;
            }
        }
        if (isFirebase) found++;
    });

    console.log(`Summary: Found ${found} vehicles with Firebase links.`);
}

checkFirebaseLinks().catch(console.error);
