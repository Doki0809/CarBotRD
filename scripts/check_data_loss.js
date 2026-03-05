import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODE4MTEsImV4cCI6MjA4NzM1NzgxMX0.HMVGq8E2Lf5utJGxWsO8FEnJXCBzwSHVNEzeuoSm4y8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDataLoss() {
    console.log('🔍 Iniciando diagnóstico de inventario total...');

    const { data, error } = await supabase
        .from('vehiculos')
        .select('id, titulo_vehiculo, estado, detalles, created_at, dealer_id')
        .limit(100);

    if (error) {
        console.error('❌ Error al consultar Supabase:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('⚠️ No se encontraron vehículos en la tabla "vehiculos". (Posible RLS o tabla vacía)');
        return;
    }

    const statuses = [...new Set(data.map(v => v.estado))];
    console.log(`- Estados encontrados: ${statuses.join(', ') || 'NINGUNO'}`);
    console.log(`- Total vehículos en muestra: ${data.length}`);

    const affected = data.filter(v => {
        // Solo nos interesan los que deberían tener data (vendidos/cotizados/disponibles)
        if (v.estado === 'Vendido' || v.estado === 'Cotizado') {
            if (!v.detalles || (!v.detalles.make && !v.detalles.model)) return true;
        }
        return false;
    });

    console.log(`\n📊 Resumen de Diagnóstico:`);
    console.log(`- Total vehículos vendidos: ${data.length}`);
    console.log(`- Vehículos con pérdida de metadata: ${affected.length}`);
    console.log(`-------------------------------------------`);

    if (affected.length > 0) {
        console.log('\n🔴 Vehículos Afectados:');
        affected.forEach(v => {
            console.log(`- ID: ${v.id}`);
            console.log(`  Título: ${v.titulo_vehiculo || 'SIN TÍTULO'}`);
            console.log(`  Creado: ${v.created_at}`);
            console.log(`  Detalles actuales: ${JSON.stringify(v.detalles)}`);
            console.log('---');
        });
    } else {
        console.log('✅ Todos los vehículos vendidos parecen tener su metadata intacta.');
    }
}

checkDataLoss();
