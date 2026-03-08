const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODE4MTEsImV4cCI6MjA4NzM1NzgxMX0.HMVGq8E2Lf5utJGxWsO8FEnJXCBzwSHVNEzeuoSm4y8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function checkFirebaseLinks() {
    const { data: vData, error: vError } = await supabase
        .from('vehiculos')
        .select('fotos, detalles')
        .or('fotos.cs.{https://firebasestorage.googleapis.com},fotos.cs.{https://storage.googleapis.com}')
        .limit(20);

    if (vError) {
        console.error('Error in vehiculos:', vError);
    } else if (vData && vData.length > 0) {
        console.log('Detected Firebase links in vehiculos:');
        vData.forEach(v => {
            if (v.fotos) v.fotos.forEach(url => {
                if (url.includes('firebase') || url.includes('googleapis')) console.log('Photo:', url);
            });
            if (v.detalles && v.detalles.pdf_final) {
                if (v.detalles.pdf_final.includes('firebase') || v.detalles.pdf_final.includes('googleapis')) {
                    console.log('PDF:', v.detalles.pdf_final);
                }
            }
        });
    } else {
        console.log('No Firebase links found in vehiculos yet.');
    }
}

checkFirebaseLinks().catch(console.error);
