import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lpiwkennlavpzisdvnnh.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Usamos anon para lectura pública (RLS permite select a todos)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const locationId = req.query.locationId || req.query.location_id;

    if (!locationId) {
        return res.status(400).json({ error: "Falta el parámetro 'locationId' o 'location_id'" });
    }

    try {
        // Consultar branding por location_id
        const { data, error } = await supabase
            .from('branding_subaccounts')
            .select('location_id, brand_id, brand_name, theme_name, app_installed, status')
            .eq('location_id', locationId)
            .eq('status', 'active')
            .maybeSingle();

        if (error) {
            console.error('Error querying branding:', error);
            return res.status(500).json({ error: "Error de base de datos" });
        }

        // Si no existe o no está instalada, devolvemos false
        if (!data || !data.app_installed || data.status !== 'active') {
            return res.status(200).json(false);
        }

        // Respuesta exitosa según el formato solicitado
        return res.status(200).json({
            locationId: data.location_id,
            brand: data.brand_name,
            theme: data.theme_name,
            appInstalled: data.app_installed,
            status: data.status
        });

    } catch (err) {
        console.error('Unexpected error in get-branding:', err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
