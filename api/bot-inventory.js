import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lpiwkennlavpzisdvnnh.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODE4MTEsImV4cCI6MjA4NzM1NzgxMX0.HMVGq8E2Lf5utJGxWsO8FEnJXCBzwSHVNEzeuoSm4y8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const capitalize = (val) => {
    if (!val || typeof val !== 'string') return val || "-";
    return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
};

export default async function handler(req, res) {
    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const dealerId = req.query.dealer_id || req.query.dealer;

    if (!dealerId) {
        return res.status(400).send("Falta el parámetro 'dealer'");
    }

    try {
        // 2. Fetch Dealer Info for the Title
        const { data: dealerData } = await supabase
            .from('dealers')
            .select('nombre, display_name')
            .eq('id', dealerId)
            .maybeSingle();

        const dealerName = dealerData?.nombre || dealerData?.display_name || 'Dealer';

        // 3. Consulta a Supabase
        const { data: vehiculos, error } = await supabase
            .from('vehiculos')
            .select('*')
            .eq('dealer_id', dealerId)
            // Buscamos Disponible or Cotizado para coincidir con la de Firebase
            .in('estado', ['Disponible', 'Cotizado'])
            .order('make', { ascending: true }); // Ordenados por marca alfabeticamente

        if (error) {
            console.error('Supabase query error:', error);
            return res.status(500).send("Error de base de datos");
        }

        // 4. Mapear y Formatear datos (Usando la misma lógica del inventarioIA anterior)
        const inventory = vehiculos.map(data => {
            // Títulos
            const makeFromTitle = data.make || "-";
            const modelFromTitle = data.model || "-";
            const yearFromTitle = data.year || "";
            const editionFromTitle = data.edition || data.version || "";
            const colorFromTitle = data.color || "";

            const fullTitle = `${yearFromTitle} ${makeFromTitle} ${modelFromTitle} ${editionFromTitle} ${colorFromTitle}`.trim().toUpperCase();

            // Precios — soporta DOP, USD, EUR, COP
            const fmtCurrency = (val, moneda) => {
                if (!val || val === 0) return '-';
                const f = Number(val).toLocaleString();
                const map = { DOP: `RD$ ${f} Pesos`, USD: `US$ ${f} Dólares`, EUR: `€ ${f} Euros`, COP: `COP$ ${f} Pesos Colombianos` };
                return map[moneda] || `US$ ${f} Dólares`;
            };
            const vehicleCurrency = data.currency || (Number(data.price_dop) > 0 ? 'DOP' : 'USD');
            const priceVal = Number(data.price || data.price_dop || 0);
            const precioFmt = fmtCurrency(priceVal, vehicleCurrency);

            // Inicial
            const initialCurrency = data.downPaymentCurrency || vehicleCurrency;
            const initialVal = Number(data.initial_payment || data.initial_payment_dop || 0);
            let inicialFmt = "-";
            if (initialVal > 0) {
                inicialFmt = fmtCurrency(initialVal, initialCurrency);
            } else if (priceVal > 0) {
                inicialFmt = fmtCurrency(Math.round(priceVal * 0.2), vehicleCurrency);
            }

            // Motor
            const motorFmt = (() => {
                const ccVal = (data.engine_liters || data.engine_cc || "").toString().trim();
                const cc = ccVal ? (ccVal.toLowerCase().includes("litro") ? ccVal : `${ccVal} Litros`) : "";
                const cylVal = (data.engine_cyl || data.cylinders || "").toString().trim();
                const cyl = cylVal ? (cylVal.toLowerCase().includes("cilindro") ? cylVal : `${cylVal} cilindros`) : "";
                const type = (data.engine_type || "").toString().trim().toLowerCase() === "normal" ? "" : (data.engine_type || "").toString().trim().toLowerCase();

                const parts = [cc, cyl, type].filter(p => p !== "");
                if (parts.length === 0) return capitalize(data.engine || data.motor || "-");

                const res = parts.join(", ");
                return res.charAt(0).toUpperCase() + res.slice(1);
            })();

            // Millas
            const unit = (["MI", "MILLAS", "MILLA"].includes((data.mileage_unit || data.unit || "").toUpperCase())) ? "Millas" : "Km";
            const mileageFmt = `${Number(data.mileage || 0).toLocaleString()} ${unit}`;

            // Enlaces catalogo principal (Se asume la app está en raíz)
            const linkCatalogo = `https://${req.headers.host || 'carbotsystem.com'}/dashboard/inventory/${data.id}`;

            return {
                id: data.id,
                marca: makeFromTitle,
                nombre: fullTitle,
                has_images: (data.images && data.images.length > 0) || !!data.image,
                link_catalogo: linkCatalogo,

                color_fmt: capitalize(data.color),
                carfax_status: (data.clean_carfax === "Sí" || data.clean_carfax === "Si" || data.clean_carfax === true || data.carfax === "Sí" || data.carfax === "Si") ? "Clean Carfax" : capitalize(data.clean_carfax || data.carfax),
                vin_fmt: (data.vin || data.chassis || "").toUpperCase() || "-",
                precio: precioFmt,
                inicial_fmt: inicialFmt,
                mileage_formatted: mileageFmt,
                traccion_fmt: (data.traction || data.traccion || data.drivetrain || "").toUpperCase() || "-",
                transmision_fmt: capitalize(data.transmission || data.transmision),
                motor_fmt: motorFmt,
                techo_fmt: capitalize(data.roof_type || data.techo || data.roof),
                combustible_fmt: capitalize(data.fuel || data.combustible),
                llave_fmt: capitalize(data.key_type || data.llave || data.key),
                baul_fmt: (data.powerTrunk === true || data.baul_electrico === true || data.trunk === "Sí") ? "Sí" : "No",
                camera_fmt: capitalize(data.camera || data.camara),
                sensores_fmt: (data.sensors === true || data.sensores === true || data.sensores === "Sí") ? "Sí" : "No",
                carplay_fmt: (data.carplay === true || data.carplay === "Sí" || data.appleCarplay === true) ? "Sí" : "No",
                asientos_fmt: (() => {
                    const n = parseInt(data.seats || data.cantidad_asientos || 0);
                    return n > 0 ? `${n} Filas de Asientos` : "-";
                })(),
                vidrios_fmt: (data.electric_windows === true || data.vidrios_electricos === true) ? "Sí" : "No",
                material_fmt: capitalize(data.seat_material || data.material_interior || data.interior_material)
            };
        });

        // 5. Build HTML (Generamos exactamente el mismo render que se espera)
        const renderHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Inventario | ${dealerName}</title>
        <style>
          body { font-family: "Segoe UI", Arial, sans-serif; background: white; margin: 0; padding: 20px 40px; color: #000; line-height: 1.4; }
          .container { max-width: 900px; margin: 0; }
          
          .report-header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px; }
          .report-header h1 { margin: 0; font-size: 1.6rem; font-weight: bold; text-transform: uppercase; }
          .report-header p { margin: 5px 0 0; font-size: 0.9rem; font-weight: normal; color: #666; }
          
          .brand-title { font-size: 1.3rem; font-weight: bold; text-transform: uppercase; margin: 40px 0 15px; border-bottom: 1px solid #000; padding-bottom: 5px; }
          
          .vehicle-entry { margin-bottom: 40px; }
          .vehicle-title { font-size: 1.1rem; font-weight: bold; margin: 0 0 10px 0; text-transform: uppercase; }
          
          .spec-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; margin-bottom: 15px; }
          .spec-table td { padding: 4px 0; vertical-align: top; }
          .label { font-weight: bold; width: 180px; padding-right: 10px; }
          .value { font-weight: normal; }
          .price-val { font-weight: bold; color: #333; }
          
          .link-section { margin-top: 15px; font-size: 0.9rem; border-top: 1px dotted #ccc; padding-top: 10px; }
          .link-url { color: #0000EE; text-decoration: underline; word-break: break-all; }
          .no-photos-msg { color: #666; font-style: italic; font-size: 0.9rem; margin-bottom: 15px; }
          
          .separator { border: 0; border-top: 1px solid #eee; margin: 40px 0; }
          .footer-tag { text-align: center; margin-top: 60px; font-size: 0.8rem; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="report-header">
            <h1>${dealerName}</h1>
            <p>${inventory.length} VEHÍCULOS DISPONIBLES</p>
          </div>
          
          ${inventory.map((v, idx) => {
            const showBrand = idx === 0 || inventory[idx - 1].marca !== v.marca;
            const isLast = idx === inventory.length - 1;
            const nextSameBrand = !isLast && inventory[idx + 1].marca === v.marca;

            return \`
              \${showBrand ? \`<div class="brand-title">\${v.marca || 'VARIOS'}</div>\` : ''}
              
              <div class="vehicle-entry" id="\${v.id}">
                <h2 class="vehicle-title">\${v.nombre}</h2>
                
                \${!v.has_images ? \`<p class="no-photos-msg">No tengo las fotos en este momento, un compañero te ayudará</p>\` : ''}
                
                <table class="spec-table">
                  <tr><td class="label">COLOR:</td><td class="value">\${v.color_fmt}</td></tr>
                  <tr><td class="label">CARFAX:</td><td class="value">\${v.carfax_status}</td></tr>
                  <tr><td class="label">CHASIS:</td><td class="value">\${v.vin_fmt}</td></tr>
                  <tr><td class="label">PRECIO:</td><td class="value price-val">\${v.precio}</td></tr>
                  <tr><td class="label">INICIAL:</td><td class="value">\${v.inicial_fmt}</td></tr>
                  <tr><td class="label">MILLAS:</td><td class="value">\${v.mileage_formatted}</td></tr>
                  <tr><td class="label">TRACCIÓN:</td><td class="value">\${v.traccion_fmt}</td></tr>
                  <tr><td class="label">TRANSMISIÓN:</td><td class="value">\${v.transmision_fmt}</td></tr>
                  <tr><td class="label">MOTOR:</td><td class="value">\${v.motor_fmt}</td></tr>
                  <tr><td class="label">TECHO:</td><td class="value">\${v.techo_fmt}</td></tr>
                  <tr><td class="label">COMBUSTIBLE:</td><td class="value">\${v.combustible_fmt}</td></tr>
                  <tr><td class="label">LLAVE:</td><td class="value">\${v.llave_fmt}</td></tr>
                  <tr><td class="label">BAÚL ELÉCTRICO:</td><td class="value">\${v.baul_fmt}</td></tr>
                  <tr><td class="label">CÁMARA:</td><td class="value">\${v.camera_fmt}</td></tr>
                  <tr><td class="label">SENSORES:</td><td class="value">\${v.sensores_fmt}</td></tr>
                  <tr><td class="label">CARPLAY:</td><td class="value">\${v.carplay_fmt}</td></tr>
                  <tr><td class="label">ASIENTOS:</td><td class="value">\${v.asientos_fmt}</td></tr>
                  <tr><td class="label">VIDRIOS ELÉCTRICOS:</td><td class="value">\${v.vidrios_fmt}</td></tr>
                  <tr><td class="label">MATERIAL DE ASIENTOS:</td><td class="value">\${v.material_fmt}</td></tr>
                </table>

              </div>
              
              \${nextSameBrand ? \`<hr class="separator" />\` : ''}
            \`;
          }).join('')}
          
          <div class="footer-tag">Documento Generado por CarBot System</div>
        </div>
      </body>
      </html>
    `;

            // 6. Retornar HTML
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.status(200).send(renderHtml);

        } catch (err) {
            console.error('Unexpected error:', err);
            res.status(500).send("Internal Server Error");
        }
    }
