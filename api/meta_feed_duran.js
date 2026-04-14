import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://lpiwkennlavpzisdvnnh.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODE4MTEsImV4cCI6MjA4NzM1NzgxMX0.HMVGq8E2Lf5utJGxWsO8FEnJXCBzwSHVNEzeuoSm4y8'
);

export default async function handler(req, res) {
  // Parámetros de seguridad: Solo Duran Fernandez Auto SRL
  const dealerId = '35594257-6176-4a79-a755-304179305938';
  const catalogBaseUrl = 'https://carbotsystem.com/inventario/dura-n-ferna-ndez-auto-srl/catalogo';

  try {
    const { data: vehiculos, error } = await supabase
      .from('vehiculos')
      .select('*')
      .eq('dealer_id', dealerId)
      .in('estado', ['Disponible', 'Cotizado']);

    if (error) throw error;

    // Generar líneas CSV
    const rows = vehiculos.map(v => {
      const title = `${v.anio || ''} ${v.marca || ''} ${v.modelo || ''} ${v.edicion || ''}`.trim();
      
      // Construir descripción rica
      const specs = [
        v.transmision && `Transmisión: ${v.transmision}`,
        v.combustible && `Combustible: ${v.combustible}`,
        v.color && `Color: ${v.color}`,
        v.traccion && `Tracción: ${v.traccion}`,
        v.motor && `Motor: ${v.motor}`
      ].filter(Boolean).join(' | ');
      
      const description = `${v.titulo_vehiculo || title}. ${specs}`;
      
      // Meta requiere ISO 4217 currency. Si es RD$ o similar, lo mapeamos a DOP.
      let currency = v.moneda_precio || 'USD';
      if (currency === 'RD$') currency = 'DOP';
      if (currency === 'US$') currency = 'USD';
      
      const price = `${v.precio || 0} ${currency}`;
      
      // Link al vehículo específico usando el parámetro confirmado por la lógica de App.jsx
      const link = `${catalogBaseUrl}?vehicleID=${v.id}`;
      
      // Fotos (Meta prefiere JPG/PNG, pero enviamos lo que hay)
      const images = Array.isArray(v.fotos) ? v.fotos : [];
      const image_link = images[0] || '';
      const additional_image_link = images.slice(1, 11).join(','); // Meta permite hasta 10 adicionales fácilmente

      // Escapar comas y comillas para el CSV
      const escape = (text) => `"${String(text || '').replace(/"/g, '""')}"`;

      return [
        v.id,
        escape(title),
        escape(description),
        'in stock',
        v.condicion === 'Nuevo' ? 'new' : 'used',
        escape(price),
        escape(link),
        escape(image_link),
        escape(additional_image_link),
        escape(v.marca)
      ].join(',');
    });

    // Encabezados requeridos por Meta Commerce Manager
    const headers = 'id,title,description,availability,condition,price,link,image_link,additional_image_link,brand';
    const csvContent = [headers, ...rows].join('\n');

    // Configurar respuesta como archivo CSV descargable
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=meta_feed_duran.csv');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache de 1 hora
    
    return res.status(200).send(csvContent);

  } catch (err) {
    console.error('Meta Feed Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
