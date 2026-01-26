const { onRequest } = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const { onDocumentWritten, onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

// Función auxiliar para normalizar texto (quitar acentos y pasar a minúsculas)
// Función auxiliar para normalizar texto (quitar acentos, puntuación y normalizar espacios)
const normalize = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()                // Convertir a minúsculas para consistencia
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar tildes (Á -> A)
    .replace(/\./g, "")             // Quitar puntos (S.R.L. -> SRL)
    .replace(/[.\-_]/g, " ")        // Tratar guiones y guiones bajos como espacios
    .replace(/\s+/g, " ")           // Colapsar múltiples espacios
    .trim();
};

// Función para crear un "Slug" limpio y estandarizado
const normalizeText = (text) => text ? text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
const slugify = (text) => {
  if (!text) return "";
  const normalized = text.toUpperCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (normalized.includes('DURAN') && normalized.includes('FERNANDEZ')) {
    return 'dura-n-ferna-ndez-auto-srl';
  }

  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar tildes
    .replace(/\./g, "")             // Quitar puntos
    .replace(/[^a-z0-9]+/g, "-")    // Solo letras, números y guiones
    .replace(/^-+|-+$/g, "");
};

const capitalize = (val) => {
  if (!val || typeof val !== 'string') return val || "-";
  return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
};

// 1. Función para Inteligencia Artificial (Inventario Dinámico)
exports.inventarioIA = onRequest({ cors: true }, async (req, res) => {
  try {
    const dealerParam = req.query.dealerID || req.query.dealer || req.query.location_name;

    if (!dealerParam) {
      return res.status(400).json({ error: "Falta el parámetro 'dealerID'" });
    }

    console.log(`🤖 IA Request para: ${dealerParam}`);

    // 1. Encontrar el Dealer (Búsqueda por ID, por nombre, o por SLUG)
    let matchedDealerId = null;

    // A. Buscar coincidencia exacta por ID de documento (Prioridad absoluta para dealerID)
    const dealerDoc = await db.collection("Dealers").doc(String(dealerParam).trim()).get();
    if (dealerDoc.exists) {
      matchedDealerId = dealerDoc.id;
    } else {
      // B. Búsqueda exhaustiva en la colección Dealers
      const dealersSnap = await db.collection("Dealers").get();
      dealersSnap.forEach(doc => {
        const data = doc.data();
        const paramLower = dealerParam.toLowerCase();

        // Coincidencia por ID (case-insensitive)
        if (doc.id.toLowerCase() === paramLower) {
          matchedDealerId = doc.id;
        }
        // Coincidencia por campo 'slug' (case-insensitive)
        else if (data.slug && data.slug.toLowerCase() === paramLower) {
          matchedDealerId = doc.id;
        }
        // Coincidencia por campo 'nombre' normalizado
        else if (data.nombre && normalizeText(data.nombre) === normalizeText(dealerParam)) {
          matchedDealerId = doc.id;
        }
      });
    }

    if (!matchedDealerId) {
      return res.status(404).json({
        error: `Dealer '${dealerParam}' no encontrado`,
        info: "Asegúrate de haber configurado tu Dealer en el panel de administración."
      });
    }

    console.log(`✅ Dealer matched: ${matchedDealerId}`);

    // Obtener datos del Dealer para el título y branding
    const dealerDocFinal = await db.collection("Dealers").doc(matchedDealerId).get();
    const dealerData = dealerDocFinal.exists ? dealerDocFinal.data() : {};
    const dealerName = dealerData.nombre || dealerData.display_name || matchedDealerId;
    const dealerLinkParam = dealerData.slug || matchedDealerId; // Reliable param for links

    // --- LOGIC: GHL LOGO REMOVED AS REQUESTED ---
    let logoUrl = "";

    // 2. Obtener vehículos (Colección primaria: 'vehiculos', Fallback: 'inventario')
    let collectionName = "vehiculos";
    let inventarioSnap = await db.collection("Dealers").doc(matchedDealerId).collection(collectionName).get();

    // Si 'vehiculos' está vacío, intentar con 'inventario' (backward compatibility)
    if (inventarioSnap.empty) {
      console.log("⚠️ Colección 'vehiculos' vacía, intentando con 'inventario'...");
      collectionName = "inventario";
      inventarioSnap = await db.collection("Dealers").doc(matchedDealerId).collection(collectionName).get();
    }
    const inventory = [];

    inventarioSnap.forEach(doc => {
      const data = doc.data();
      // Filtrar solo disponibles o cotizados
      // Filtrar estricto: Solo Disponible o Cotizado
      const s = (data.status || data.estado || '').toLowerCase().trim();
      const allowed = ['available', 'disponible', 'quoted', 'cotizado'];

      if (allowed.includes(s) && !data.is_trash) {
        inventory.push({
          id: doc.id,
          nombre: `${data.year || ""} ${data.make || ""} ${data.model || ""} ${data.edition || ""} ${data.color || ""}`.trim().toUpperCase(),
          precio: data.price_dop > 0
            ? `RD$ ${Number(data.price_dop).toLocaleString()} Pesos`
            : `US$ ${Number(data.price || 0).toLocaleString()} Dólares`,
          carfax_status: (data.clean_carfax === "Sí" || data.clean_carfax === "Si" || data.clean_carfax === true || data.carfax === "Sí" || data.carfax === "Si") ? "Sí" : (data.clean_carfax === "No" || data.carfax === "No" || data.carfax === false) ? "No" : capitalize(data.clean_carfax || data.carfax),
          mileage_formatted: `${Number(data.mileage || 0).toLocaleString()} ${(["MI", "MILLAS", "MILLA"].includes((data.mileage_unit || data.unit || "").toUpperCase())) ? "Millas" : "Km"}`,
          link_catalogo: `https://inventarioia-gzhz2ynksa-uc.a.run.app/catalogo?dealerID=${matchedDealerId}&vehicleID=${doc.id}`,
          // Add color formatted for details
          color_fmt: capitalize(data.color),
          transmision_fmt: capitalize(data.transmision || data.transmission),
          traccion_fmt: (data.traccion || data.traction || data.drivetrain || "").toUpperCase() || "-",
          motor_fmt: (() => {
            const ccVal = (data.engine_cc || "").toString().trim();
            const cc = ccVal ? (ccVal.toLowerCase().includes("litro") ? ccVal : `${ccVal} Litros`) : "";
            const cylVal = (data.engine_cyl || "").toString().trim();
            const cyl = cylVal ? (cylVal.toLowerCase().includes("cilindro") ? cylVal : `${cylVal} cilindros`) : "";
            const type = (data.engine_type || "").toString().trim().toLowerCase() === "normal" ? "" : (data.engine_type || "").toString().trim().toLowerCase();
            const parts = [cc, cyl, type].filter(p => p !== "");
            if (parts.length === 0) return capitalize(data.engine || data.motor || "-");
            const res = parts.join(", ");
            return res.charAt(0).toUpperCase() + res.slice(1);
          })(),
          techo_fmt: capitalize(data.techo || data.roof_type || data.roof),
          combustible_fmt: capitalize(data.combustible || data.fuel),
          llave_fmt: capitalize(data.llave || data.key_type || data.key),
          baul_fmt: capitalize(data.baul || data.trunk || data.is_electric_trunk),
          camera_fmt: capitalize(data.camera || data.reverse_camera),
          sensores_fmt: capitalize(data.sensores || data.sensors),
          carplay_fmt: capitalize(data.carplay || data.apple_android),
          asientos_fmt: capitalize(data.asientos || data.seats),
          vidrios_fmt: capitalize(data.electric_windows || "Sí"),
          material_fmt: capitalize(data.material_interior || data.seat_material || data.interior_material),
          vin_fmt: (data.vin || data.chassis || "").toUpperCase() || "-",
          inicial_fmt: (data.initial_payment_dop > 0 || data.initial_dop > 0)
            ? `RD$ ${Number(data.initial_payment_dop || data.initial_dop).toLocaleString()} Pesos`
            : ((data.initial_payment > 0 || data.initial > 0)
              ? `US$ ${Number(data.initial_payment || data.initial).toLocaleString()} Dólares`
              : (data.price_dop > 0
                ? `RD$ ${Number(data.price_dop * 0.2).toLocaleString()} Pesos`
                : `RD$ ${Number((data.price || 0) * 60 * 0.2).toLocaleString()} Pesos`)),
          // Fix: Include image for Related Vehicles section
          imagen: (data.images && data.images.length > 0) ? data.images[0] : (data.image || ""),
          has_images: (data.images && data.images.length > 0) || !!data.image,
          // Campos extra
          marca: data.make,
          modelo: data.model,
          edicion: data.edition || data.version,
          anio: data.year,
          anio_num: parseInt(data.year) || 0,
          color: data.color,
          transmision: data.transmission,
          traccion: data.traction || data.drivetrain,
          combustible: data.fuel,
          motor: (() => {
            const litersVal = data.engine_liters || data.engine_cc || (data.cc && Number(data.cc) < 10 ? data.cc : null);
            const liters = litersVal ? `${litersVal} L` : "";
            const cylindersVal = data.engine_cyl || data.cylinders || data.cilindros;
            const cylinders = cylindersVal ? `${cylindersVal} Cilindros` : "";
            const isTurbo = (data.engine_turbo === "SI" || data.turbo === "SI" || data.is_turbo === true || data.engine_type === "Turbo");
            const turbo = isTurbo ? "Turbo" : "Aspirado";
            const parts = [liters, cylinders, turbo].filter(Boolean);
            return parts.length > 0 ? parts.join(", ") : (data.engine || data.motor || "-");
          })(),
          condicion: data.condition || data.condicion || 'Usado Importado',
          carfax: data.clean_carfax || data.carfax || "-",
          asientos: data.seats || data.seatRows || "-",
          asientos_num: parseInt(data.seats || data.seatRows) || 0,
          material_interior: data.seat_material || data.interior_material || data.seatMaterial || data.interior || data.color_interior || "-",
          techo: data.roof_type || data.roof || data.sunroof || "-",
          baul: data.trunk || data.is_electric_trunk || "-",
          llave: data.key_type || data.key || data.keyType || data.llave || "-",
          camera: data.reverse_camera || data.camera || "-",
          sensores: data.sensors || data.parking_sensors || "-",
          carplay: data.apple_android || data.carplay || "-",
          electric_windows: data.electric_windows || data.cristales_electricos || "-",
          mileage: data.mileage || "0",
          unit: data.unit || data.mileageUnit || data.mileage_unit || "KM",
          vin: data.vin || data.chassis,
          // Calculado con lógica desacoplada
          inicial_calculado: (() => {
            const dpVal = data.initial_payment_dop > 0 ? data.initial_payment_dop : (data.initial_payment || 0);
            if (!dpVal) return 'N/A';

            // Detectar moneda específica del inicial
            const dpCurrency = data.downPaymentCurrency || (data.initial_payment_dop > 0 ? 'DOP' : 'USD');
            const simbolo = dpCurrency === 'USD' ? 'US$' : 'RD$';
            const nombre = dpCurrency === 'USD' ? 'Dólares' : 'Pesos';

            return `${simbolo} ${Number(dpVal).toLocaleString()} ${nombre}`;
          })(),
          precio_num: data.price_dop > 0 ? Number(data.price_dop) : Number(data.price || 0),
          precio_dop_ref: data.price_dop > 0 ? Number(data.price_dop) : (Number(data.price || 0) * 60)
        });
      }
    });

    console.log(`✅ ${inventory.length} vehículos encontrados para ${matchedDealerId} en ${collectionName}`);

    // 3. Formatear respuesta (JSON por defecto, HTML opcional)
    const isCatalogPath = req.path === '/catalogo' || req.query.view === 'catalog';
    const viewMode = isCatalogPath || req.query.view === 'human' || !req.headers.accept?.includes('application/json');
    const vehicleId = req.query.vehicleID;

    // --- HELPERS PARA SMART RELATED ---
    const TASA_CAMBIO = 60;
    const getPrecioEnPesos = (precio, moneda) => {
      if (!precio) return 0;
      // Normalizar input a string para checkear moneda si viene "US$ 20,000"
      // Aqui asumimos que el objeto ya viene limpio, pero por si acaso.
      const p = parseFloat(precio);
      if (isNaN(p)) return 0;

      if (moneda === 'USD' || moneda === 'US$') {
        return p * TASA_CAMBIO;
      }
      return p;
    };

    if (viewMode) {
      if (!isCatalogPath) {
        // --- MODO DOCUMENTO (BASE LINK - ALL IN ONE PAGE) ---
        // Sort inventory by brand alphabetically
        const sortedInventory = [...inventory].sort((a, b) => (a.marca || "").localeCompare(b.marca || ""));

        return res.send(`
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
              
              ${sortedInventory.map((v, idx) => {
          const showBrand = idx === 0 || sortedInventory[idx - 1].marca !== v.marca;
          const isLast = idx === sortedInventory.length - 1;
          const nextSameBrand = !isLast && sortedInventory[idx + 1].marca === v.marca;

          return `
                  ${showBrand ? `<div class="brand-title">${v.marca || 'VARIOS'}</div>` : ''}
                  
                  <div class="vehicle-entry" id="${v.id}">
                    <h2 class="vehicle-title">${v.nombre}</h2>
                    
                    ${!v.has_images ? `<p class="no-photos-msg">No tengo las fotos en este momento, un compañero te ayudará</p>` : ''}
                    
                    <table class="spec-table">
                      <tr><td class="label">COLOR:</td><td class="value">${v.color_fmt}</td></tr>
                      <tr><td class="label">CARFAX:</td><td class="value">${v.carfax_status}</td></tr>
                      <tr><td class="label">CHASIS:</td><td class="value">${v.vin_fmt}</td></tr>
                      <tr><td class="label">PRECIO:</td><td class="value price-val">${v.precio}</td></tr>
                      <tr><td class="label">INICIAL:</td><td class="value">${v.inicial_fmt}</td></tr>
                      <tr><td class="label">MILLAS:</td><td class="value">${v.mileage_formatted}</td></tr>
                      <tr><td class="label">TRACCIÓN:</td><td class="value">${v.traccion_fmt}</td></tr>
                      <tr><td class="label">TRANSMISIÓN:</td><td class="value">${v.transmision_fmt}</td></tr>
                      <tr><td class="label">MOTOR:</td><td class="value">${v.motor_fmt}</td></tr>
                      <tr><td class="label">TECHO:</td><td class="value">${v.techo_fmt}</td></tr>
                      <tr><td class="label">COMBUSTIBLE:</td><td class="value">${v.combustible_fmt}</td></tr>
                      <tr><td class="label">LLAVE:</td><td class="value">${v.llave_fmt}</td></tr>
                      <tr><td class="label">BAÚL ELÉCTRICO:</td><td class="value">${v.baul_fmt}</td></tr>
                      <tr><td class="label">CÁMARA:</td><td class="value">${v.camera_fmt}</td></tr>
                      <tr><td class="label">SENSORES:</td><td class="value">${v.sensores_fmt}</td></tr>
                      <tr><td class="label">CARPLAY:</td><td class="value">${v.carplay_fmt}</td></tr>
                      <tr><td class="label">ASIENTOS:</td><td class="value">${v.asientos_fmt}</td></tr>
                      <tr><td class="label">VIDRIOS ELÉCTRICOS:</td><td class="value">${v.vidrios_fmt}</td></tr>
                      <tr><td class="label">MATERIAL DE ASIENTOS:</td><td class="value">${v.material_fmt}</td></tr>
                    </table>

                    ${v.has_images ? `
                      <div class="link-section">
                        <strong>VER FOTOS Y DETALLES:</strong><br/>
                        <a href="${v.link_catalogo}" class="link-url">${v.link_catalogo}</a>
                      </div>
                    ` : ''}
                  </div>
                  
                  ${nextSameBrand ? `<hr class="separator" />` : ''}
                `;
        }).join('')}
              
              <div class="footer-tag">
                <strong>LINK DE CATALOGO:</strong><br/>
                <a href="https://inventarioia-gzhz2ynksa-uc.a.run.app/catalogo?dealerID=${encodeURIComponent(matchedDealerId)}" class="link-url">https://inventarioia-gzhz2ynksa-uc.a.run.app/catalogo?dealerID=${encodeURIComponent(matchedDealerId)}</a>
              </div>

              <div class="footer-tag">Documento Generado por CarBot System</div>
            </div>
          </body>
          </html>
        `);
      }

      if (vehicleId) {
        // --- MODO DETALLE ---
        const v = inventory.find(item => item.id === vehicleId);
        if (!v) return res.status(404).send("Vehículo no encontrado");

        // Obtener datos crudos para ficha técnica completa
        const vDoc = await db.collection("Dealers").doc(matchedDealerId).collection(collectionName).doc(vehicleId).get();
        const raw = vDoc.exists ? vDoc.data() : {};

        // Galería de fotos (carrete)
        const photos = raw.images || (raw.image ? [raw.image] : []);

        // --- SMART RELATED LOGIC ---
        const precioBase = getPrecioEnPesos(raw.price || 0, raw.currency);
        // data.body_type suele venir en inglés o español, normalizamos
        const tipoBase = (raw.body_type || raw.type || '').split(' ')[0].toLowerCase();
        const asientosBase = parseInt(raw.seats || raw.seatRows || 0);

        const related = inventory.filter(item => {
          // 1. No incluir el mismo carro
          if (item.id === vehicleId) return false;

          // --- FILTRO DE PRECIO (Regla de los 200k) ---
          // item.precio_dop_ref ya viene calculado en el map
          const precioItem = item.precio_dop_ref || 0;
          const diferencia = Math.abs(precioBase - precioItem);
          const estaEnRango = diferencia <= 200000;

          // --- FILTRO DE TIPO ---
          // item.tipo viene del map como "Jeepeta", "Sedan", etc.
          const tipoItem = (item.tipo || '').split(' ')[0].toLowerCase();
          // Comparacion laxa de tipo (ej: "Jeepeta" vs "SUV" podria fallar si no normalizamos más, pero esto cumple lo pedido)
          const esMismoTipo = tipoItem && tipoBase && (tipoItem === tipoBase);

          // item.asientos_num viene del map
          const asientosItem = item.asientos_num || 0;
          const mismosAsientos = asientosBase > 0 && asientosItem > 0 && (asientosItem === asientosBase);

          // REGLA FINAL: Rango Y (Tipo O Asientos)
          return estaEnRango && (esMismoTipo || mismosAsientos);
        }).slice(0, 4);

        const capitalize = (str) => {
          if (!str || typeof str !== 'string') return '-';
          return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        };

        let html = `
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${v.nombre} | ${dealerName}</title>
            <style>
              :root { --primary: #d32f2f; --bg: #f8fafc; --text: #1e293b; }
              * { box-sizing: border-box; }
              body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text); margin: 0; line-height: 1.5; padding-bottom: 50px; }
              .header { background: #fff; padding: 20px; text-align: center; border-bottom: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; }
              .header p { margin: 0; font-size: 0.8rem; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 1px; }
              .header h1 { margin: 5px 0 0; font-size: 1.8rem; font-weight: 900; text-transform: uppercase; color: #d32f2f; }
              
              .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
              
              .top-section { display: grid; grid-template-columns: 1.5fr 1fr; gap: 30px; margin-bottom: 40px; }
              @media (max-width: 768px) { .top-section { grid-template-columns: 1fr; } }
              
              .main-image { width: 100%; aspect-ratio: 16/9; object-fit: contain; background: #fff; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
              
              .info-card { background: transparent; padding: 0; margin-top: 20px; }
              .badge { font-size: 1.2rem; font-weight: 800; color: #94a3b8; margin-bottom: 10px; display: flex; gap: 10px; }
              .vehicle-title { font-size: 2.2rem; font-weight: 900; line-height: 1.1; margin: 0 0 20px; text-transform: uppercase; }
              .vehicle-title span { color: var(--primary); }
              
              .price-box { margin-bottom: 30px; }
              .price-label { font-size: 0.8rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
              .main-price { font-size: 3.5rem; font-weight: 900; color: var(--text); margin: 0; }
              .down-payment { font-size: 1.5rem; font-weight: 700; color: #64748b; margin: 0; }
              
              .section-title { font-size: 1rem; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
              .section-title::before { content: ""; width: 8px; height: 8px; background: var(--primary); border-radius: 50%; }
              
              .spec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #fff; padding: 25px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
              .spec-item { display: flex; flex-direction: column; }
              .spec-label { font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
              .spec-value { font-size: 1rem; font-weight: 700; color: var(--text); }
              
              .gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
              .gallery-img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 10px; border: 2px solid transparent; cursor: pointer; transition: 0.2s; }
              .gallery-img:hover { border-color: var(--primary); }

              /* SINGLE COLUMN LAYOUT STYLES */
              .vehicle-header { text-align: left; margin-bottom: 15px; }
              .vehicle-title { font-size: 2rem; font-weight: 900; line-height: 1.1; margin: 0; color: #1e293b; text-transform: uppercase; }
              .vehicle-subtitle { font-size: 1.1rem; color: #64748b; font-weight: 600; margin-top: 5px; }
              
              .main-image-container { position: relative; margin-bottom: 20px; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
              .main-image { width: 100%; height: auto; aspect-ratio: 4/3; object-fit: cover; display: block; cursor: zoom-in; }
              
              .thumbs-reel { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px; margin-bottom: 25px; scrollbar-width: none; }
              .thumbs-reel::-webkit-scrollbar { display: none; }
              .thumb-item { width: 100px; height: 100px; flex-shrink: 0; border-radius: 8px; overflow: hidden; opacity: 0.7; transition: 0.2s; border: 2px solid transparent; }
              .thumb-item.active { opacity: 1; border-color: #d32f2f; }
              .thumb-img { width: 100%; height: 100%; object-fit: cover; }

              .price-section { margin-bottom: 30px; }
              .price-currency { color: #d32f2f; font-weight: 900; font-size: 2.5rem; margin-right: 5px; }
              .price-amount { color: #000000; font-weight: 900; font-size: 2.5rem; }
              .down-payment { color: #94a3b8; font-size: 0.9rem; font-weight: 600; margin-top: 0px; text-transform: uppercase; }
              
              .specs-section { background: #f8fafc; border-radius: 15px; padding: 20px; }
              .section-title { font-size: 1.1rem; margin-bottom: 15px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; display: inline-block; }
              .spec-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
              
              .back-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background-color: #ef4444; 
                color: white !important;
                padding: 12px 24px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 800;
                font-size: 0.85rem;
                text-transform: uppercase;
                letter-spacing: 1px;
                transition: transform 0.2s, background-color 0.2s;
                cursor: pointer;
              }
              .back-btn:hover {
                background-color: #dc2626; 
                transform: translateY(-2px);
                color: white !important;
              }
              
              
              @media (min-width: 768px) {
                  .container { max-width: 800px; margin: 0 auto; }
                  .vehicle-title { font-size: 2.5rem; }
              }
              
              /* LIGHTBOX STYLES */
              .lightbox { position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: none; justify-content: center; align-items: center; z-index: 10000; overflow: hidden; background: #ffffff; touch-action: none; }
              .lightbox-backdrop { display: none; } 
              
              .lightbox-header { position: absolute; top: 30px; left: 30px; z-index: 20; text-align: left; pointer-events: none; }
              .lb-title { color: #d32f2f; font-weight: 900; font-size: 1.5rem; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
              .lb-counter { color: #64748b; font-size: 0.8rem; font-weight: 700; margin: 5px 0 0; letter-spacing: 2px; text-transform: uppercase; }

              /* IMAGE CONTAINER - STRICT & CENTERED */
              .lightbox-img-wrapper { 
                position: absolute; 
                top: 0; left: 0; width: 100%; height: 100%; 
                display: flex; align-items: center; justify-content: center; 
                pointer-events: none; z-index: 10;
              }
              .lightbox-img { 
                max-width: 90%; 
                max-height: 80vh; 
                object-fit: contain; 
                pointer-events: auto; /* allow clicks on image */
                filter: drop-shadow(0 20px 50px rgba(0,0,0,0.1)); 
                border-radius: 15px; 
              }
              
              .close-btn { position: absolute; top: 20px; right: 30px; color: #d32f2f; font-size: 3rem; cursor: pointer; z-index: 20; transition: transform 0.2s; display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; border-radius: 50%; background: #f1f5f9; }
              .close-btn:hover { background: #e2e8f0; transform: rotate(90deg); }

              .nav-btn { position: fixed; top: 50%; transform: translateY(-50%); color: #d32f2f !important; font-size: 3rem; cursor: pointer; user-select: none; padding: 20px; z-index: 20; transition: all 0.2s; background: #f1f5f9; border-radius: 50%; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
              .nav-btn:hover { background: #fee2e2; scale: 1.1; }
              .nav-btn svg { width: 50px; height: 50px; stroke-width: 4px; }
              .prev { left: 40px; }
              .next { right: 40px; }
              
              /* THUMBNAIL STRIP (LIGHTBOX) - RESTORED */
              .lb-thumbs-container { 
                  position: absolute; 
                  bottom: 20px; 
                  left: 0; 
                  width: 100%; 
                  display: flex; 
                  justify-content: center; 
                  z-index: 30; 
                  pointer-events: none; /* Let clicks pass through empty space */
              }
              .lb-thumbs-scroll { 
                  display: flex; 
                  gap: 8px; 
                  overflow-x: auto; 
                  padding: 10px 0; /* Vertical padding only */
                  max-width: 95%; 
                  background: transparent; /* Removed black background as requested */
                  pointer-events: auto; 
                  scrollbar-width: none; 
              }
              .lb-thumbs-scroll::-webkit-scrollbar { display: none; }
              .lb-thumb { height: 60px; width: 60px; border-radius: 8px; object-fit: cover; opacity: 0.6; transition: 0.2s; border: 2px solid transparent; flex-shrink: 0; cursor: pointer; background: #000; }
              .lb-thumb.active { opacity: 1; border-color: #d32f2f; transform: scale(1.05); }
              
              /* AGGRESSIVE MOBILE LIGHTBOX FIXES */
              @media (max-width: 1024px) {
                  .nav-btn { display: none !important; } 
                  /* Thumbnails visible on mobile now */
                  .lightbox-img { max-height: 70vh !important; transform: none; } /* Removed translateY to center properly */
                  .close-btn { top: 15px; right: 15px; width: 50px; height: 50px; }
              }

              /* LAYOUT & RESPONSIVENESS */
              .container {
                  display: grid;
                  gap: 20px;
                  /* MOBILE DEFAULT: Single Column Vertical Stack */
                  grid-template-areas: 
                      "header"
                      "image"
                      "thumbs"
                      "price"
                      "specs";
              }
              
              .vehicle-header { grid-area: header; text-align: left; margin-bottom: 10px; }
              .main-image-container { grid-area: image; position: relative; margin-bottom: 10px; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
              
              /* Thumbnails Wrapper handles both Title and Reel */
              .thumbs-section { grid-area: thumbs; margin-bottom: 10px; }
              /* RESTORE THUMBS TITLE */
              .thumbs-title { 
                  display: flex; 
                  align-items: center;
                  gap: 8px;
                  font-size: 0.8rem; 
                  font-weight: 800; 
                  color: #64748b; 
                  text-transform: uppercase; 
                  margin-bottom: 10px; 
                  letter-spacing: 1px;
              }
              .thumbs-reel { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px; scrollbar-width: none; }
              
              .price-section { grid-area: price; margin-bottom: 30px; }
              
              /* Specs Section - Transparent on Desktop, Card on Mobile */
              .specs-section { grid-area: specs; background: #f8fafc; border-radius: 15px; padding: 20px; }
              .section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
              .section-icon { color: #d32f2f; }
              .section-title { font-size: 1.1rem; margin: 0; color: #1e293b; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }


              .related-section { grid-area: related; margin-top: 20px; padding-left: 20px; }
              .related-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; } /* Mobile: 2 cols */
              .related-card { text-decoration: none; color: inherit; display: block; border-radius: 10px; overflow: hidden; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; transition: transform 0.2s; }
              .related-card img { width: 100%; aspect-ratio: 16/9; object-fit: cover; }
              .related-card h4 { margin: 10px 10px 5px; font-size: 0.9rem; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
              .related-card p { margin: 0 10px 10px; font-size: 0.9rem; color: #d32f2f; font-weight: 800; }

              /* DESKTOP (Split Column) */
              @media (min-width: 900px) {
                  .container {
                      max-width: 1250px;
                      margin: 0 auto;
                      display: block; /* Stack vertically: Card then Related */
                  }

                  /* MAIN WHITE CARD WRAPPER */
                  .details-card {
                      background: #ffffff;
                      border-radius: 20px;
                      padding: 40px;
                      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
                      display: grid;
                      grid-template-columns: 1.2fr 0.8fr;
                      column-gap: 60px;
                      align-items: start;
                      grid-template-areas:
                          "image header"
                          "image price"
                          "image thumbs"
                          "specs specs"; /* Specs FULL WIDTH for balance */
                  }
                  
                  .vehicle-title { font-size: 3.5rem; line-height: 0.9; margin-bottom: 5px; }
                  
                  /* Clean Specs inside the card */
                  .specs-section { 
                      background: transparent; 
                      border-radius: 0; 
                      padding: 0; 
                      box-shadow: none;
                      margin-top: 10px; /* More space since it's full width */
                  }
                  
                  /* Remove the double line/border as requested */
                  .section-header { border-bottom: none; margin-bottom: 20px; }

                  .spec-grid {
                      background: transparent;
                      padding: 0;
                      border-radius: 0;
                      box-shadow: none;
                      display: grid;
                      grid-template-columns: repeat(2, 1fr);
                      column-gap: 30px;
                      row-gap: 20px;
                  }
                  .spec-item { border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
                  .spec-item:last-child { border-bottom: none; }

              .related-section { grid-area: related; margin-top: 20px; }
                  
                  /* Add padding to match the card above (40px) */
                  .related-section { margin-top: 50px; border-top: 1px solid #e2e8f0; padding: 40px; }
                  .related-grid { grid-template-columns: repeat(4, 1fr); gap: 25px; } /* Desktop: 4 cols */
                  .related-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
                  
                  /* On Desktop, show title and use grid */
                  .thumbs-title { 
                      display: flex; 
                      align-items: center;
                      gap: 8px;
                      font-size: 0.9rem; 
                      font-weight: 800; 
                      color: #64748b; /* Gray text base */
                      text-transform: uppercase; 
                      margin-bottom: 15px; 
                      letter-spacing: 1px;
                  }
                  
                  .thumbs-reel {
                      display: grid;
                      grid-template-columns: repeat(4, 1fr); /* 4 Cols = Larger Thumbs */
                      gap: 15px;
                      overflow-x: visible;
                  }
                  .thumb-item { width: 100%; height: auto; aspect-ratio: 4/3; } /* Responsive grid items */

                  .nav-btn { display: flex; color: #d32f2f !important; }
                  /* HIDE REEL ON DESKTOP LIGHTBOX? USER SAID "Pc uicamente le pondras las flechas rojas" on top of the lightbox requirement */
                  /* Wait, user said: "cuadn se pone la foto en grande debe de salir el carrete adentro tambien tanto en el celular como pc" */
                  /* SO Thumbs should be VISIBLE on Desktop Lightbox too. */
                  .lb-thumbs-container { display: flex; } 
              }

              @media (max-width: 768px) {
                  .nav-btn { display: none; } 
                  /* Fix Main Image on Mobile: Full Width & Natural Ratio */
                  .main-image-container { 
                      width: calc(100% + 40px); 
                      margin-left: -20px; 
                      border-radius: 0 !important; 
                      height: auto !important;
                      max-height: 350px !important;
                      aspect-ratio: 4/3;
                      box-shadow: none !important;
                  }
                  .main-image-container img { width: 100%; height: 100%; object-fit: cover; }
                  
                  .lightbox-img { max-height: 70vh; transform: none; border-radius: 12px; }
                  .lb-title { font-size: 1.1rem; }
                  /* .lb-thumbs-container removed from here to allow it to show */
                  .close-btn { top: 15px; right: 15px; width: 45px; height: 45px; font-size: 2rem; }
                  .lightbox-header { top: 20px; left: 20px; }
                  .vehicle-title { font-size: 1.5rem; }
                  .price-currency, .price-amount { font-size: 2rem; }
                  .container {
                      grid-template-areas: 
                          "header"
                          "image"
                          "thumbs"
                          "price"
                          "specs"
                          "related";
                  }
                  
                  /* SMALLER DEALER NAME ON MOBILE */
                  .header h1 { font-size: 1.8rem; }
              }

              /* NEW FICHA TECNICA DESIGN */
              .specs-section { 
                  grid-area: specs;
                  background: transparent !important; 
                  padding: 0 !important; 
                  border-radius: 0 !important; 
                  box-shadow: none !important;
                  margin-top: 40px !important;
              }

              .tech-sheet-wrapper {
                  background: #fff;
                  border-radius: 35px;
                  padding: 50px;
                  box-shadow: 0 10px 40px rgba(0,0,0,0.04);
                  border: 1px solid #f1f5f9;
              }

              .tech-header {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  margin-bottom: 25px;
              }

              .tech-header svg { color: #d32f2f; }

              .tech-header h2 {
                  font-size: 1rem;
                  font-weight: 900;
                  color: #1e293b;
                  text-transform: uppercase;
                  letter-spacing: 1.5px;
                  margin: 0;
              }

              .tech-grid {
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  gap: 50px;
              }

              @media (max-width: 1024px) {
                  .tech-grid { grid-template-columns: repeat(2, 1fr); }
              }

              @media (max-width: 600px) {
                  .tech-grid { grid-template-columns: 1fr; }
              }

              .tech-group-title {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  font-size: 0.72rem;
                  font-weight: 800;
                  color: #94a3b8;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  margin-bottom: 15px;
              }

              .tech-items-container {
                  display: flex;
                  flex-direction: column;
                  gap: 15px; /* Increased gap for labels outside */
              }

              .row-2 {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 15px;
              }

              .tech-item {
                  display: flex;
                  flex-direction: column;
                  gap: 5px;
              }

              .item-label {
                  font-size: 0.65rem;
                  font-weight: 800;
                  color: #94a3b8;
                  text-transform: uppercase;
                  letter-spacing: 0.8px;
                  padding-left: 2px;
              }

              .item-box {
                  background: #f8fafc;
                  border-radius: 14px;
                  padding: 14px 18px;
                  border: 1px solid #f1f5f9;
                  display: flex;
                  align-items: center;
                  min-height: 50px;
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              }

              .item-box:hover {
                  background: #ffffff;
                  box-shadow: 0 8px 20px rgba(0,0,0,0.04);
                  border-color: #cbd5e1;
                  transform: translateY(-1px);
              }

              .item-value {
                  font-size: 1rem;
                  font-weight: 800;
                  color: #1e293b;
                  line-height: 1.1;
                  text-transform: uppercase;
              }
            </style>
          </head>
          <body>
            <div class="header">
               <span style="font-weight: 800; font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">Inventario de</span>
               <h1 style="font-weight: 900; font-size: 1.4rem; color: #1e293b; line-height: 1; margin: 5px 0 0; text-transform: uppercase; letter-spacing: -0.5px;">${dealerName}</h1>
            </div>
            
            <div class="container">
              
              <!-- GIANT WHITE CARD WRAPPER -->
              <div class="details-card">

              <!-- 1. HEADER / TITLE -->
              <div class="vehicle-header">
                <!-- Relocated Back Button -->
                <!-- Relocated Back Button -->
                <a href="?dealer=${req.query.dealer || matchedDealerId}" class="back-btn" style="margin-bottom: 20px;">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                   Regresar al Inventario
                </a>

                <!-- Clean Text Badge -->
                <div style="margin-bottom: 5px; font-weight: 800; font-size: 0.9rem; letter-spacing: 1px;">
                    <span style="color: #d32f2f;">${raw.year}</span> 
                    <span style="color: #94a3b8; margin: 0 5px;">•</span> 
                    <span style="color: #94a3b8;">${(raw.color || 'N/A').toUpperCase()}</span>
                    ${raw.edition || raw.version ? `
                    <span style="color: #94a3b8; margin: 0 5px;">•</span> 
                    <span style="color: #94a3b8;">${(raw.edition || raw.version).toUpperCase()}</span>` : ''}
                </div>
                <h2 class="vehicle-title" style="margin-top:0; color: #1e293b;">${raw.make} <br><span style="color:#d32f2f">${raw.model}</span></h2>
              </div>

              <!-- 2. MAIN IMAGE -->
              <div class="main-image-container">
                 <img src="${photos[0] || 'https://via.placeholder.com/800x600?text=Sin+Imagen'}" class="main-image" id="mainImg" onclick="openLightbox()">
              </div>

              <!-- 3. THUMBNAIL REEL -->
              <div class="thumbs-section">
                <!-- Title with Icon -->
                <div class="thumbs-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <span>CARRETE DE IMÁGENES (${photos.length})</span>
                </div>
                <div class="thumbs-reel">
                    ${photos.map((img, idx) => `
                        <div class="thumb-item ${idx === 0 ? 'active' : ''}" onclick="selectImage(${idx})" id="pageThumb${idx}">
                            <img src="${img}" class="thumb-img">
                        </div>
                    `).join('')}
                </div>
              </div>

              <!-- 4. PRICE -->
              <div class="price-section" style="margin-bottom: 20px;">
                <div style="margin-bottom: 5px; line-height: 1.1; white-space: nowrap;">
                    <span class="price-currency" style="color: #d32f2f; font-size: 2.2rem; letter-spacing: -1px;">${(v.precio || '').split(' ')[0]}</span>
                    <span class="price-amount" style="color: #1e293b; font-size: 2.2rem; letter-spacing: -1.5px;">${(v.precio || '').substring((v.precio || '').indexOf(' ') + 1)}</span>
                </div>
                <div class="down-payment" style="font-size: 0.9rem; color: #64748b; margin-top: 5px;">INICIAL: ${v.inicial_calculado}</div>
              </div>
               <!-- 5. SPECS -->
              <div class="specs-section">
                <div class="tech-sheet-wrapper">
                  <div class="tech-header">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                      <h2>FICHA TÉCNICA COMPLETA</h2>
                  </div>
                  
                  <div class="tech-grid">
                    <!-- 1. INFORMACIÓN BÁSICA -->
                    <div class="tech-group">
                      <div class="tech-group-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="13" y2="16"></line></svg>
                        BÁSICA
                      </div>
                      <div class="tech-items-container">
                        <div class="row-2">
                          <div class="tech-item"><div class="item-label">Año</div><div class="item-box"><div class="item-value">${v.anio || '-'}</div></div></div>
                          <div class="tech-item"><div class="item-label">Color</div><div class="item-box"><div class="item-value">${String(v.color || '').toUpperCase()}</div></div></div>
                        </div>
                        <div class="tech-item"><div class="item-label">Kilometraje</div><div class="item-box"><div class="item-value">${Number(v.mileage).toLocaleString()} ${v.unit}</div></div></div>
                        <div class="tech-item"><div class="item-label">Versión / Edición</div><div class="item-box"><div class="item-value">${String(v.edicion || '-').toUpperCase()}</div></div></div>
                        <div class="row-2">
                          <div class="tech-item"><div class="item-label">Condición</div><div class="item-box"><div class="item-value">${String(v.condicion || '').toUpperCase()}</div></div></div>
                          <div class="tech-item"><div class="item-label">CarFax</div><div class="item-box"><div class="item-value">${String(v.carfax || '-').toUpperCase()}</div></div></div>
                        </div>
                        <div class="tech-item"><div class="item-label">Chasis / VIN</div><div class="item-box"><div class="item-value" style="font-family: monospace; font-size: 0.8rem;">${(v.vin || '-').toUpperCase()}</div></div></div>
                      </div>
                    </div>

                    <!-- 2. MECÁNICA -->
                    <div class="tech-group">
                      <div class="tech-group-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        MECÁNICA
                      </div>
                      <div class="tech-items-container">
                        <div class="tech-item"><div class="item-label">Motor / Potencia</div><div class="item-box"><div class="item-value" style="font-size: 0.85rem;">${String(v.motor || '-').toUpperCase()}</div></div></div>
                        <div class="tech-item"><div class="item-label">Transmisión</div><div class="item-box"><div class="item-value">${String(v.transmision || '-').toUpperCase()}</div></div></div>
                        <div class="tech-item"><div class="item-label">Tracción</div><div class="item-box"><div class="item-value">${String(v.traccion || '-').toUpperCase()}</div></div></div>
                        <div class="tech-item"><div class="item-label">Combustible</div><div class="item-box"><div class="item-value">${String(v.combustible || '-').toUpperCase()}</div></div></div>
                      </div>
                    </div>

                    <!-- 3. CONFORT -->
                    <div class="tech-group">
                      <div class="tech-group-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        CONFORT
                      </div>
                      <div class="tech-items-container">
                        <div class="row-2">
                          <div class="tech-item"><div class="item-label">Asientos</div><div class="item-box"><div class="item-value">${v.asientos || '-'}</div></div></div>
                          <div class="tech-item"><div class="item-label">Interior</div><div class="item-box"><div class="item-value">${String(v.material_interior || '-').toUpperCase()}</div></div></div>
                        </div>
                        <div class="row-2">
                          <div class="tech-item"><div class="item-label">CarPlay</div><div class="item-box"><div class="item-value">${String(v.carplay || '-').toUpperCase()}</div></div></div>
                          <div class="tech-item"><div class="item-label">Cámara</div><div class="item-box"><div class="item-value">${String(v.camera || '-').toUpperCase()}</div></div></div>
                        </div>
                        <div class="tech-item"><div class="item-label">Sensores</div><div class="item-box"><div class="item-value">${String(v.sensores || '-').toUpperCase()}</div></div></div>
                        <div class="tech-item"><div class="item-label">Techo</div><div class="item-box"><div class="item-value">${String(v.techo || '-').toUpperCase()}</div></div></div>
                        <div class="row-2">
                          <div class="tech-item"><div class="item-label">Vidrios Eléct.</div><div class="item-box"><div class="item-value">${String(v.electric_windows || '-').toUpperCase()}</div></div></div>
                          <div class="tech-item"><div class="item-label">Baúl Eléct.</div><div class="item-box"><div class="item-value">${String(v.baul || '-').toUpperCase()}</div></div></div>
                        </div>
                        <div class="tech-item"><div class="item-label">Llave</div><div class="item-box"><div class="item-value">${String(v.llave || '-').toUpperCase()}</div></div></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div> <!-- END SPECS -->

              </div> <!-- END DETAILS CARD -->

              <!-- 6. RELATED -->
              <div class="related-section">
                <div class="section-header">
                    <svg class="section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 18 16 21 16 18 16 21"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                    <h2 class="section-title">VEHÍCULOS RELACIONADOS</h2>
                </div>
                <div class="related-grid">
                  ${related.map(r => `
                    <a href="?dealerID=${dealerLinkParam}&vehicleID=${r.id}" class="related-card">
                      <img src="${r.imagen || 'https://via.placeholder.com/400x225?text=Sin+Imagen'}">
                      <h4>${r.nombre}</h4>
                      <p>RD$ ${Number(r.precio_dop_ref).toLocaleString('en-US')}</p>
                    </a>
                  `).join('')}
                </div>
              </div>

              <div style="text-align: center; margin-top: 50px; padding-bottom: 40px;">
                <a href="?dealer=${req.query.dealer || matchedDealerId}" class="back-btn">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                   Regresar al Inventario
                </a>
              </div>


            </div>

            <div id="lightbox" class="lightbox" onclick="closeLightbox()">
              <div id="lbBackdrop" class="lightbox-backdrop" style="background-image: url('${photos[0] || ''}')"></div>
              
              <div class="lightbox-header">
                <h3 class="lb-title">${v.nombre}</h3>
                <p id="lbCounter" class="lb-counter">FOTO 1 DE ${photos.length}</p>
              </div>

              <div class="close-btn" onclick="closeLightbox()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </div>
              
              <div class="nav-btn prev" onclick="event.stopPropagation(); moveLightbox(-1)">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </div>
              
              <div class="lightbox-img-wrapper">
                <img class="lightbox-img" id="lbImg" src="" onclick="event.stopPropagation()">
              </div>
              
              <div class="nav-btn next" onclick="event.stopPropagation(); moveLightbox(1)">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>

              <!-- THUMBNAIL STRIP -->
              <div class="lb-thumbs-container" onclick="event.stopPropagation()">
                <div class="lb-thumbs-scroll">
                  ${photos.map((img, idx) => `
                    <img src="${img}" class="lb-thumb ${idx === 0 ? 'active' : ''}" onclick="selectImage(${idx}); updateLightboxImage();" id="lbThumb${idx}">
                  `).join('')}
                </div>
              </div>
            </div>

            <script>
              const photos = ${JSON.stringify(photos)};
              let currentIndex = 0;
              
              // TOUCH SWIPE VARIABLES
              let touchStartX = 0;
              let touchEndX = 0;

              function selectImage(index) {
                currentIndex = index;
                document.getElementById('mainImg').src = photos[index];
              }

              function openLightbox() {
                updateLightboxImage();
                document.getElementById('lightbox').style.display = 'flex';
                document.body.style.overflow = 'hidden'; 
                // Explicitly disable scrolling on mobile by prevention
                document.body.addEventListener('touchmove', preventDefault, { passive: false });
              }

              function closeLightbox() {
                document.getElementById('lightbox').style.display = 'none';
                document.body.style.overflow = '';
                document.body.removeEventListener('touchmove', preventDefault);
              }

              function preventDefault(e) {
                // Allow scroll only on the thumbs container
                if (e.target.closest('.lb-thumbs-scroll')) return;
                e.preventDefault();
              }

              function moveLightbox(step) {
                currentIndex += step;
                if (currentIndex >= photos.length) currentIndex = 0;
                if (currentIndex < 0) currentIndex = photos.length - 1;
                updateLightboxImage();
              }

              function updateLightboxImage() {
                const imgUrl = photos[currentIndex];
                document.getElementById('lbImg').src = imgUrl;
                document.getElementById('lbBackdrop').style.backgroundImage = 'url(' + imgUrl + ')';
                document.getElementById('lbCounter').innerText = 'FOTO ' + (currentIndex + 1) + ' DE ' + photos.length;
                
                // Update active thumb class
                document.querySelectorAll('.lb-thumb').forEach(t => t.classList.remove('active'));
                const activeThumb = document.getElementById('lbThumb' + currentIndex);
                if(activeThumb) {
                  activeThumb.classList.add('active');
                  // Manual scroll to avoid page jumping
                  const container = document.querySelector('.lb-thumbs-scroll');
                  if (container) {
                    const scrollLeft = activeThumb.offsetLeft - (container.clientWidth / 2) + (activeThumb.clientWidth / 2);
                    container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                  }
                }
              }
              
              // Key navigation
              document.addEventListener('keydown', function(event) {
                if (document.getElementById('lightbox').style.display === 'flex') {
                  if (event.key === "Escape") closeLightbox();
                  if (event.key === "ArrowLeft") moveLightbox(-1);
                  if (event.key === "ArrowRight") moveLightbox(1);
                }
              });

              // Touch Swipe Handling
              const lightboxEl = document.getElementById('lightbox');
              
              lightboxEl.addEventListener('touchstart', e => {
                touchStartX = e.changedTouches[0].screenX;
              }, { passive: true });

              lightboxEl.addEventListener('touchend', e => {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
              }, { passive: true });

              function handleSwipe() {
                const swipeThreshold = 50; 
                if (touchEndX < touchStartX - swipeThreshold) {
                  // Swipe LEFT -> Next Image
                  moveLightbox(1);
                }
                if (touchEndX > touchStartX + swipeThreshold) {
                  // Swipe RIGHT -> Prev Image
                  moveLightbox(-1);
                }
              }
            </script>
          </body>
          </html>
        `;
        res.set('Content-Type', 'text/html');
        return res.send(html);
      }

      // --- MODO LISTA (REDISEÑO TIENDA PREMIUM) ---
      const grouped = inventory.reduce((acc, v) => {
        const marca = (v.marca || 'Otras').toUpperCase();
        if (!acc[marca]) acc[marca] = [];
        acc[marca].push(v);
        return acc;
      }, {});

      let html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Inventario | ${dealerName}</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
          <style>
            :root { 
              --primary: #ef4444; 
              --bg: #f8fafc; 
              --text: #1e293b; 
              --secondary: #64748b; 
              --glass: rgba(255, 255, 255, 0.85);
            }
            * { box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; background-color: var(--bg); margin: 0; padding: 0; color: var(--text); -webkit-font-smoothing: antialiased; }
            h1, h2, h3, .card-title, .header-label, .btn-view { font-family: 'Outfit', sans-serif; }
            
            .header { padding: 60px 20px 40px; text-align: center; }
            .header-label { font-weight: 800; font-size: 0.85rem; color: var(--primary); text-transform: uppercase; letter-spacing: 4px; display: block; margin-bottom: 12px; }
            .header h1 { color: #1e293b; font-weight: 900; text-transform: uppercase; margin: 0; font-size: 2.8rem; letter-spacing: -1px; line-height: 1; }
            
            .sticky-filters { position: sticky; top: 20px; z-index: 1000; margin-bottom: 40px; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
            .sticky-filters.hidden { transform: translateY(-150%); }
            .filter-pill { 
              background: var(--glass); 
              backdrop-filter: blur(12px); 
              -webkit-backdrop-filter: blur(12px);
              border: 1px solid rgba(255, 255, 255, 0.5);
              border-radius: 24px; 
              padding: 12px; 
              box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1); 
            }
            .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
            
            .filter-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
            @media (min-width: 900px) { .filter-grid { grid-template-columns: 2.2fr 1fr 1fr 1fr 1fr 1fr 1fr 1.2fr; } }
            
            .sort-group { display: flex; gap: 4px; width: 100%; }
            .btn-sort-dir { 
              width: 48px; 
              height: 48px; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              background: #fff; 
              border: 1px solid #e2e8f0; 
              border-radius: 18px; 
              color: var(--secondary); 
              cursor: pointer; 
              transition: all 0.4s; 
              flex-shrink: 0;
            }
            .btn-sort-dir:hover { border-color: var(--primary); color: var(--primary); transform: translateY(-4px); }
            .btn-sort-dir.active { background: var(--primary); color: #fff; border-color: var(--primary); }
            .btn-sort-dir svg { width: 22px; height: 22px; transition: transform 0.3s; }
            .btn-sort-dir.desc svg { transform: rotate(180deg); }
            
            .filter-item { position: relative; }
            .filter-item { position: relative; width: 100%; }
            .filter-item input { 
              width: 100%; 
              padding: 14px 18px; 
              border: 1px solid #e2e8f0; 
              border-radius: 18px; 
              font-family: inherit; 
              font-size: 0.95rem; 
              font-weight: 500; 
              color: var(--text); 
              background: #fff;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
              outline: none; 
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
            }
            .filter-item input:hover { 
              border-color: var(--primary); 
              color: var(--primary);
              transform: translateY(-8px); 
              box-shadow: 0 20px 25px -5px rgba(239, 68, 68, 0.1); 
            }

            /* --- CUSTOM SELECT STYLES --- */
            .custom-select { position: relative; cursor: pointer; user-select: none; }
            .select-trigger {
              display: flex;
              align-items: center;
              justify-content: space-between;
              width: 100%; 
              padding: 14px 18px; 
              border: 1px solid #e2e8f0; 
              border-radius: 18px; 
              font-size: 0.95rem; 
              font-weight: 500; 
              color: var(--text); 
              background: #fff;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .select-trigger:hover {
              border-color: var(--primary); 
              color: var(--primary);
              transform: translateY(-8px); 
              box-shadow: 0 20px 25px -5px rgba(239, 68, 68, 0.1);
            }
            .custom-select.active .select-trigger { border-color: var(--primary); transform: translateY(-8px); }
            
            .select-trigger svg { width: 18px; height: 18px; color: var(--secondary); transition: transform 0.3s, color 0.3s; }
            .select-trigger:hover svg, .custom-select.active .select-trigger svg { color: var(--primary); }
            .custom-select.active .select-trigger svg { transform: rotate(180deg); }

            .options-list {
              position: absolute;
              top: calc(100% + 10px);
              left: 0;
              width: 100%;
              background: rgba(255, 255, 255, 0.95);
              backdrop-filter: blur(15px);
              -webkit-backdrop-filter: blur(15px);
              border: 1px solid rgba(255, 255, 255, 0.5);
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.15);
              z-index: 1100;
              max-height: 300px;
              overflow-y: auto;
              padding: 8px;
              opacity: 0;
              visibility: hidden;
              transform: translateY(20px);
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .custom-select.active .options-list { opacity: 1; visibility: visible; transform: translateY(0); }
            
            .option { 
              padding: 12px 16px; 
              border-radius: 12px; 
              font-size: 0.9rem; 
              font-weight: 600; 
              color: var(--text); 
              transition: all 0.2s; 
            }
            .option:hover { background: #fee2e2; color: var(--primary); }
            .option.selected { background: var(--primary); color: #fff; }

            /* --- MOBILE FILTERS REDESIGN --- */
            .mobile-filter-btn {
              display: none;
              position: fixed;
              bottom: 30px;
              right: 30px;
              width: 65px;
              height: 65px;
              border-radius: 50%;
              background: var(--primary);
              color: white;
              border: none;
              box-shadow: 0 10px 25px rgba(239, 68, 68, 0.4);
              z-index: 2000;
              cursor: pointer;
              align-items: center;
              justify-content: center;
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .mobile-filter-btn:active { transform: scale(0.9); }
            .mobile-filter-btn svg { width: 30px; height: 30px; stroke-width: 2.5; }

            .close-filters { display: none; }

            @media (max-width: 899px) {
              .mobile-filter-btn { display: flex; }
              .sticky-filters {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.85);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                z-index: 1500;
                margin: 0;
                padding: 100px 20px 40px;
                opacity: 0;
                visibility: hidden;
                transform: translateX(100%);
                transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                overflow-y: auto;
              }
              .sticky-filters.show-mobile {
                opacity: 1;
                visibility: visible;
                transform: translateX(0);
              }
              .filter-pill {
                background: transparent;
                box-shadow: none;
                border: none;
                padding: 0;
                width: 100%;
              }
              .filter-grid {
                display: flex;
                flex-direction: column;
                gap: 15px;
              }
              .filter-item input, .select-trigger, .btn-clear {
                font-size: 1.1rem;
                padding: 18px 24px;
                border-radius: 24px;
                background: #fff;
                border: 2px solid #f1f5f9;
              }
              .filter-item input:hover, .select-trigger:hover, .btn-clear:hover {
                transform: none;
              }
              .close-filters {
                position: absolute;
                top: 30px;
                right: 30px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: #f1f5f9;
                color: var(--text);
                border: none;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
              }
              .sticky-filters.hidden { transform: translateX(100%); }
            }

            .options-list::-webkit-scrollbar { width: 6px; }
            .options-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            
            .btn-clear {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              padding: 14px;
              background: #f1f5f9;
              color: var(--secondary);
              border: 1px solid transparent;
              border-radius: 18px;
              font-family: 'Outfit', sans-serif;
              font-weight: 700;
              font-size: 0.85rem;
              text-transform: uppercase;
              letter-spacing: 1px;
              cursor: pointer;
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
              white-space: nowrap;
            }
            .btn-clear:hover { 
              background: var(--primary); 
              color: #fff; 
              transform: translateY(-8px); 
              box-shadow: 0 20px 25px -5px rgba(239, 68, 68, 0.3);
            }
            .btn-clear svg { width: 16px; height: 16px; }
            
            .results-info { margin: 30px 0 20px; font-size: 0.9rem; font-weight: 700; color: var(--secondary); text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.8; }
            
            .inventory-grid { display: grid; grid-template-columns: 1fr; gap: 35px; margin-bottom: 80px; }
            @media (min-width: 640px) { .inventory-grid { grid-template-columns: repeat(2, 1fr); } }
            @media (min-width: 1024px) { .inventory-grid { grid-template-columns: repeat(3, 1fr); } }
            
            .vehicle-card { background: #fff; border-radius: 28px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); border: 1px solid #f1f5f9; transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; cursor: pointer; text-decoration: none; color: inherit; position: relative; }
            .vehicle-card:hover { transform: translateY(-12px) scale(1.01); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.08); border-color: #e2e8f0; }
            
            .card-img-container { width: 100%; aspect-ratio: 4/3; background: #eee; position: relative; overflow: hidden; }
            .card-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
            .vehicle-card:hover .card-img { transform: scale(1.1); }
            
            .card-body { padding: 28px; flex: 1; display: flex; flex-direction: column; }
            .card-tag { font-family: 'Outfit', sans-serif; font-size: 0.75rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
            .card-title { font-size: 1.4rem; font-weight: 800; color: #1e293b; text-transform: uppercase; line-height: 1.1; margin-bottom: 15px; height: 3.1rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; letter-spacing: -0.5px; }
            
            .card-price-row { display: flex; align-items: baseline; gap: 8px; margin-top: auto; }
            .card-price { font-size: 1.7rem; font-weight: 900; color: #1e293b; font-family: 'Outfit'; letter-spacing: -1px; }
            .card-currency { font-size: 1rem; font-weight: 800; color: var(--primary); text-transform: uppercase; }
            .card-dp { font-size: 0.95rem; font-weight: 600; color: var(--secondary); margin-top: 2px; }
            
            .card-specs { display: flex; gap: 20px; margin: 20px 0; padding-top: 20px; border-top: 1px solid #f1f5f9; }
            .mini-spec { font-size: 0.8rem; font-weight: 600; color: var(--secondary); display: flex; align-items: center; gap: 6px; }
            .mini-spec svg { opacity: 0.7; width: 14px; height: 14px; }
            
            .btn-view { margin-top: 25px; padding: 16px; background: #1e293b; color: #fff; text-align: center; border-radius: 18px; font-weight: 800; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 2px; transition: all 0.3s; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .vehicle-card:hover .btn-view { background: var(--primary); transform: scale(1.02); box-shadow: 0 10px 15px rgba(239, 68, 68, 0.3); }
            
            .no-results { text-align: center; padding: 120px 20px; display: none; }
            .no-results h3 { font-family: 'Outfit'; font-size: 2rem; color: #cbd5e1; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <button class="mobile-filter-btn" onclick="toggleMobileFilters()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>

          <div class="header">
             <div class="container">
               <span class="header-label">Catálogo Exclusive</span>
               <h1>${dealerName}</h1>
             </div>
          </div>
          
          <div class="sticky-filters" id="stickyFilters">
            <button class="close-filters" onclick="toggleMobileFilters()">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div class="container">
              <div class="filter-pill">
                <div class="filter-grid">
                  <div class="filter-item"><input type="text" id="searchInput" placeholder="Buscar vehículo..." oninput="filterInventory()"></div>
                  
                  <!-- Marca -->
                  <div class="filter-item">
                    <div class="custom-select" id="brandSelect">
                      <input type="hidden" id="brandFilter" value="">
                      <div class="select-trigger" onclick="toggleDropdown('brandSelect')">
                        <span class="trigger-text">Marca</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                      <div class="options-list">
                        <div class="option" onclick="selectOption('brandSelect', '', 'Marca')">Marca</div>
                        ${Object.keys(grouped).sort().map(b => `<div class="option" onclick="selectOption('brandSelect', '${b}', '${b}')">${b}</div>`).join('')}
                      </div>
                    </div>
                  </div>

                  <!-- Modelo (Cascading) -->
                  <div class="filter-item">
                    <div class="custom-select" id="modelSelect">
                      <input type="hidden" id="modelFilter" value="">
                      <div class="select-trigger" onclick="toggleDropdown('modelSelect')">
                        <span class="trigger-text">Modelo</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                      <div class="options-list" id="modelOptions">
                        <div class="option" onclick="selectOption('modelSelect', '', 'Modelo')">Modelo</div>
                      </div>
                    </div>
                  </div>

                  <!-- Año -->
                  <div class="filter-item">
                    <div class="custom-select" id="yearSelect">
                      <input type="hidden" id="yearFilter" value="">
                      <div class="select-trigger" onclick="toggleDropdown('yearSelect')">
                        <span class="trigger-text">Año</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                      <div class="options-list">
                        <div class="option" onclick="selectOption('yearSelect', '', 'Año')">Año</div>
                        ${Array.from(new Set(inventory.map(v => v.anio_num))).filter(y => y > 0).sort((a, b) => b - a).map(y => `<div class="option" onclick="selectOption('yearSelect', '${y}', '${y}')">${y}</div>`).join('')}
                      </div>
                    </div>
                  </div>

                  <!-- Precio -->
                  <div class="filter-item">
                    <div class="custom-select" id="priceSelect">
                      <input type="hidden" id="priceFilter" value="">
                      <div class="select-trigger" onclick="toggleDropdown('priceSelect')">
                        <span class="trigger-text">Precio</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                      <div class="options-list">
                        <div class="option" onclick="selectOption('priceSelect', '', 'Precio')">Precio</div>
                        <div class="option" onclick="selectOption('priceSelect', '0-500000', '≤ RD$ 500k')">≤ RD$ 500k</div>
                        <div class="option" onclick="selectOption('priceSelect', '500000-1000000', 'RD$ 500k - 1M')">RD$ 500k - 1M</div>
                        <div class="option" onclick="selectOption('priceSelect', '1000000-2000000', 'RD$ 1M - 2M')">RD$ 1M - 2M</div>
                        <div class="option" onclick="selectOption('priceSelect', '2000000-99999999', 'RD$ 2M+')">RD$ 2M+</div>
                      </div>
                    </div>
                  </div>

                  <!-- Asientos -->
                  <div class="filter-item">
                    <div class="custom-select" id="seatsSelect">
                      <input type="hidden" id="seatsFilter" value="">
                      <div class="select-trigger" onclick="toggleDropdown('seatsSelect')">
                        <span class="trigger-text">Asientos</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                      <div class="options-list">
                        <div class="option" onclick="selectOption('seatsSelect', '', 'Asientos')">Asientos</div>
                        <div class="option" onclick="selectOption('seatsSelect', '2', '2 Filas')">2 Filas</div>
                        <div class="option" onclick="selectOption('seatsSelect', '3', '3 Filas')">3 Filas</div>
                      </div>
                    </div>
                  </div>

                  <!-- Tracción (Dynamic) -->
                  <div class="filter-item">
                    <div class="custom-select" id="tractionSelect">
                      <input type="hidden" id="tractionFilter" value="">
                      <div class="select-trigger" onclick="toggleDropdown('tractionSelect')">
                        <span class="trigger-text">Tracción</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                      <div class="options-list">
                        <div class="option" onclick="selectOption('tractionSelect', '', 'Tracción')">Tracción</div>
                        <div class="option" onclick="selectOption('tractionSelect', 'FWD', 'FWD')">FWD</div>
                        <div class="option" onclick="selectOption('tractionSelect', 'RWD', 'RWD')">RWD</div>
                        <div class="option" onclick="selectOption('tractionSelect', 'AWD', 'AWD')">AWD</div>
                        <div class="option" onclick="selectOption('tractionSelect', '4X4', '4x4')">4x4</div>
                      </div>
                    </div>
                  </div>

                  <!-- Ordenamiento -->
                  <div class="filter-item">
                    <div class="sort-group">
                      <div class="custom-select" id="sortSelect" style="flex: 1;">
                        <input type="hidden" id="sortFilter" value="recientes">
                        <div class="select-trigger" onclick="toggleDropdown('sortSelect')">
                          <span class="trigger-text">Recientes</span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                        <div class="options-list">
                          <div class="option" onclick="selectOption('sortSelect', 'anio', 'Año')">Año</div>
                          <div class="option" onclick="selectOption('sortSelect', 'precio', 'Precio')">Precio</div>
                          <div class="option selected" onclick="selectOption('sortSelect', 'recientes', 'Recientes')">Recientes</div>
                        </div>
                      </div>
                      <button id="sortDirBtn" class="btn-sort-dir desc" onclick="toggleSortDirection()" title="Cambiar dirección">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                      </button>
                    </div>
                  </div>
                  
                  <button class="btn-clear" onclick="resetFilters()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                    Limpiar
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div class="container">
            <div class="results-info">
               <span id="resultsCount">${inventory.length}</span> Unidades en stock
            </div>
            
            <div id="inventoryGrid" class="inventory-grid">
              ${inventory.sort((a, b) => b.anio_num - a.anio_num).map((v, idx) => `
                <a href="?dealer=${req.query.dealer || matchedDealerId}&vehicleID=${v.id}" class="vehicle-card" 
                   style="animation: fadeIn 0.6s ease-out forwards; animation-delay: ${idx * 0.05}s"
                   data-brand="${(v.marca || '').toUpperCase()}" 
                   data-model="${(v.modelo || '').toUpperCase()}"
                   data-year="${v.anio_num}" 
                   data-price="${v.precio_num}"
                   data-price-ref="${v.precio_dop_ref}"
                   data-seats="${v.asientos_num}"
                   data-traction="${(v.traccion || '').toUpperCase()}"
                   data-text="${v.nombre.toLowerCase()}">
                  <div class="card-img-container">
                    <img src="${v.imagen || 'https://via.placeholder.com/600x450?text=CarBot'}" class="card-img">
                  </div>
                  <div class="card-body">
                    <div class="card-tag">${v.anio || ''} • ${v.color || ''} • ${v.edicion || ''}</div>
                    <div class="card-title">${v.marca || ''} ${v.modelo || ''}</div>
                    
                    <div class="card-specs">
                      <div class="mini-spec">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                        ${(v.transmision || '-').split(' ')[0]}
                      </div>
                      <div class="mini-spec">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4"></path><path d="M12 18v4"></path></svg>
                        ${v.motor || '-'}
                      </div>
                      <div class="mini-spec">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z"></path></svg>
                        ${v.traccion || 'FWD'}
                      </div>
                    </div>

                    <div class="card-price-row">
                      <span class="card-currency">${v.precio.split(' ')[0]}</span>
                      <span class="card-price">${v.precio.split(' ')[1] || v.precio}</span>
                    </div>
                    <div class="card-dp">Inicial ${v.inicial_calculado.replace('INICIAL: ', '')}</div>
                    
                    <div class="btn-view">Explorar Detalles</div>
                  </div>
                </a>
              `).join('')}
            </div>
            
            <div id="noResults" class="no-results">
              <h3>Sin coincidencias</h3>
              <p style="color: #94a3b8; font-weight: 500;">Intenta ajustando tus criterios de búsqueda.</p>
            </div>
          </div>
          
          <script>
            let sortDir = -1; // -1 for DESC, 1 for ASC

            function toggleMobileFilters() {
              const panel = document.getElementById('stickyFilters');
              panel.classList.toggle('show-mobile');
              document.body.style.overflow = panel.classList.contains('show-mobile') ? 'hidden' : '';
            }

            function toggleSortDirection() {
              sortDir *= -1;
              const btn = document.getElementById('sortDirBtn');
              if (sortDir === 1) {
                btn.classList.remove('desc');
              } else {
                btn.classList.add('desc');
              }
              filterInventory();
            }

            function filterInventory() {
              const search = document.getElementById('searchInput').value.toLowerCase();
              const brand = document.getElementById('brandFilter').value.toUpperCase();
              const model = document.getElementById('modelFilter').value.toUpperCase();
              const year = parseInt(document.getElementById('yearFilter').value);
              const priceRange = document.getElementById('priceFilter').value;
              const seats = document.getElementById('seatsFilter').value;
              const traction = document.getElementById('tractionFilter').value.toUpperCase();
              const sortField = document.getElementById('sortFilter').value;
              const cards = Array.from(document.querySelectorAll('.vehicle-card'));
              let visibleCount = 0;
              
              let maxPriceSearch = Infinity;
              let minPriceSearch = 0;
              if (priceRange) {
                const parts = priceRange.split('-').map(Number);
                minPriceSearch = parts[0];
                maxPriceSearch = parts[1] || parts[0];
              }

              cards.forEach(card => {
                const cText = card.dataset.text;
                const cBrand = card.dataset.brand;
                const cModel = card.dataset.model.toUpperCase();
                const cYear = parseInt(card.dataset.year);
                const cPriceRef = parseInt(card.dataset.priceRef); // Use normalized DOP price
                const cSeats = card.dataset.seats;
                const cTraction = card.dataset.traction.toUpperCase();
                
                let matches = true;
                
                if (search && !cText.includes(search)) matches = false;
                if (brand && cBrand !== brand) matches = false;
                if (model && cModel !== model) matches = false;
                if (year && cYear > year) matches = false; // Show target year and below
                if (seats && cSeats !== seats) matches = false;
                if (priceRange && cPriceRef > maxPriceSearch) matches = false; // Show target price and below

                if (traction) {
                   if (traction === '4X4' || traction === 'AWD' || traction === '4WD') {
                      if (!cTraction.includes('4X4') && !cTraction.includes('AWD') && !cTraction.includes('4WD')) matches = false;
                   } else {
                      if (cTraction !== traction) matches = false;
                   }
                }
                
                if (matches) { 
                  card.style.display = 'flex'; 
                  visibleCount++;
                  
                  // Calculate dynamic score for sorting
                  let score = 0;
                  if (year && cYear === year) score += 20000; // High bonus for exact year
                  if (priceRange && cPriceRef >= minPriceSearch && cPriceRef <= maxPriceSearch) score += 10000; // High bonus for price in target range
                  
                  // Tie-breakers: Newer cars and slightly more expensive (closer to target) preferred
                  score += (cYear * 10); 
                  score += (cPriceRef / 100000); 
                  
                  card.dataset.score = score;
                } else { 
                  card.style.display = 'none'; 
                }
              });

              // Apply sorting to the visible cards
              const grid = document.getElementById('inventoryGrid');
              const sortedCards = [...cards].sort((a, b) => {
                let valA, valB;
                
                if (sortField === 'recientes') {
                   // Newer is higher index/score by default from server sort, but here we use anio_num as proxy or original order
                   valA = parseInt(a.dataset.year || 0);
                   valB = parseInt(b.dataset.year || 0);
                } else if (sortField === 'precio') {
                   valA = parseInt(a.dataset.priceRef || 0);
                   valB = parseInt(b.dataset.priceRef || 0);
                } else { // anio
                   valA = parseInt(a.dataset.year || 0);
                   valB = parseInt(b.dataset.year || 0);
                }
                
                // sortDir: -1 means higher value first (Down Arrow = Descending??)
                // Wait: User said: "arriba es el mas nuevo o mayor y hacia abajo el menor"
                // So Arrow Up (dir: 1) -> DESC (Highest first)
                // Arrow Down (dir: -1) -> ASC (Lowest first)
                
                if (sortDir === 1) { // Up = DESC
                  return valB - valA;
                } else { // Down = ASC
                  return valA - valB;
                }
              });

              sortedCards.forEach(card => grid.appendChild(card));
              
              document.getElementById('resultsCount').innerText = visibleCount;
              document.getElementById('noResults').style.display = visibleCount === 0 ? 'block' : 'none';
            }

            let lastScrollTop = 0;
            window.addEventListener('scroll', function() {
              if (window.innerWidth < 900) return; // Skip for mobile
              const st = window.pageYOffset || document.documentElement.scrollTop;
              const filterBar = document.querySelector('.sticky-filters');
              if (st > lastScrollTop && st > 150) {
                filterBar.classList.add('hidden');
                closeAllDropdowns();
              } else {
                filterBar.classList.remove('hidden');
              }
              lastScrollTop = st <= 0 ? 0 : st;
            }, false);

            function toggleDropdown(id) {
              const el = document.getElementById(id);
              const isActive = el.classList.contains('active');
              closeAllDropdowns();
              if (!isActive) el.classList.add('active');
            }

            function closeAllDropdowns() {
              document.querySelectorAll('.custom-select').forEach(d => d.classList.remove('active'));
            }

            function selectOption(selectId, value, label) {
              const selectEl = document.getElementById(selectId);
              const input = selectEl.querySelector('input[type="hidden"]');
              const triggerText = selectEl.querySelector('.trigger-text');
              
              input.value = value;
              triggerText.innerText = label;
              
              selectEl.querySelectorAll('.option').forEach(opt => {
                opt.classList.remove('selected');
                if (opt.innerText === label) opt.classList.add('selected');
              });
              
              if (selectId === 'brandSelect') {
                updateModelOptions(value);
              }
              
              closeAllDropdowns();
              filterInventory();
            }

            function updateModelOptions(brand) {
              const modelSelect = document.getElementById('modelSelect');
              const modelOptions = document.getElementById('modelOptions');
              const modelInput = modelSelect.querySelector('input[type="hidden"]');
              const modelTriggerText = modelSelect.querySelector('.trigger-text');
              
              // Reset model
              modelInput.value = '';
              modelTriggerText.innerText = 'Modelo';
              
              if (!brand) {
                modelOptions.innerHTML = \`<div class="option" onclick="selectOption('modelSelect', '', 'Modelo')">Modelo</div>\`;
                return;
              }

              const cards = Array.from(document.querySelectorAll('.vehicle-card'));
              const models = Array.from(new Set(cards.filter(c => c.dataset.brand === brand).map(c => c.dataset.model))).sort();
              
              modelOptions.innerHTML = \`<div class="option" onclick="selectOption('modelSelect', '', 'Modelo')">Modelo</div>\` +
                models.map(m => \`<div class="option" onclick="selectOption('modelSelect', '\${m}', '\${m}')">\${m}</div>\`).join('');
            }

            // Close dropdowns on outside click
            document.addEventListener('click', (e) => {
              if (!e.target.closest('.custom-select')) closeAllDropdowns();
            });

            function resetFilters() {
              document.getElementById('searchInput').value = '';
              
              // Reset custom selects
              selectOption('brandSelect', '', 'Marca');
              selectOption('yearSelect', '', 'Año');
              selectOption('priceSelect', '', 'Precio');
              selectOption('seatsSelect', '', 'Asientos');
              selectOption('tractionSelect', '', 'Tracción');
              selectOption('sortSelect', 'recientes', 'Recientes');
              sortDir = -1;
              document.getElementById('sortDirBtn').classList.add('desc');
              
              filterInventory();
            }
          </script>
        </body>
        </html>
      `;
      res.set('Content-Type', 'text/html');
      return res.send(html);
    }

    // Default JSON response if not html mode (though it usually is)
    return res.json({
      dealer: matchedDealerId,
      total: inventory.length,
      inventory: inventory
    });

  } catch (error) {
    console.error("❌ Error en inventarioIA:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 2. Función para listar Dealers (Para que el bot sepa quién existe)
exports.availableDealers = onRequest({ cors: true }, async (req, res) => {
  try {
    console.log("🔍 availableDealers: Buscando en 'Dealers'...");
    let dealersSnap = await db.collection("Dealers").get();

    if (dealersSnap.empty) {
      console.log("ℹ️ 'Dealers' vacío, intentando con 'dealers'...");
      dealersSnap = await db.collection("dealers").get();
    }

    const dealersList = [];
    dealersSnap.forEach(doc => {
      const data = doc.data();
      dealersList.push({
        id: doc.id,
        nombre: data.nombre || data.display_name || doc.id,
        slug: data.slug || "",
        location_id: data.locationId || doc.id
      });
    });

    console.log(`✅ ${dealersList.length} dealers encontrados.`);
    res.json({
      count: dealersList.length,
      dealers: dealersList
    });
  } catch (error) {
    console.error("❌ Error en availableDealers:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Trigger: Generar Link de Bot al crear o actualizar Dealer
// exports.generateDealerBotLink = onDocumentWritten("Dealers/{dealerId}", async (event) => {
//   const dealerId = event.params.dealerId;
//   const change = event.data;

//   if (!change || !change.after.exists) {
//     console.log(`ℹ️ Documento ${dealerId} eliminado o no existe. Nada que procesar.`);
//     return;
//   }

//   const data = change.after.data();
//   const rawName = data.display_name || data.nombre || dealerId;
//   const slug = slugify(rawName);

//   console.log(`🤖 [Trigger] Procesando Dealer: ${dealerId} | Nombre: ${rawName} | Slug: ${slug}`);

//   try {
//     // 1. Guardar el slug en el propio Dealer para facilitar búsquedas
//     if (data.slug !== slug) {
//       await change.after.ref.set({ slug: slug }, { merge: true });
//       console.log(`✅ Slug '${slug}' actualizado en el documento del Dealer.`);
//     }

//     // 2. Crear el documento de configuración en la ruta: Dealers/{dealerId}/:DATA BOT RN/CONFIG
//     const botLink = `https://inventarioia-gzhz2ynksa-uc.a.run.app/?dealerID=${slug}`;
//     const shopLink = `https://inventarioia-gzhz2ynksa-uc.a.run.app/tienda?dealerID=${slug}`;

//     const botConfigRef = db.collection("Dealers").doc(dealerId).collection(":DATA BOT RN").doc("CONFIG");

//     await botConfigRef.set({
//       LINK_INVENTARIO_GHL: botLink,
//       LINK_TIENDA: shopLink,
//       dealer_id: dealerId,
//       dealer_name: rawName,
//       slug: slug,
//       status: "active",
//       updatedAt: admin.firestore.FieldValue.serverTimestamp()
//     });

//     console.log(`✅ Documentos generados exitosamente en Dealers/${dealerId}/:DATA BOT RN/CONFIG`);
//     console.log(`🔗 GHL Bot: ${botLink}`);
//     console.log(`🔗 Tienda: ${shopLink}`);

//   } catch (error) {
//   console.error(`❌ Error al procesar bot_link para ${dealerId}:`, error);
// }
// });

// 4. Función para inicializar todos los links de bots (Proactivo)
exports.initBotLinks = onRequest({ cors: true }, async (req, res) => {
  try {
    // Forzar IDs estandarizados (Slugs)
    const manualIds = [
      "dura-n-ferna-ndez-auto-srl",
      "gary-motors",
      "mi-dealer"
    ];

    const dealersRefs = await db.collection("Dealers").listDocuments();
    const allIds = new Set([...manualIds, ...dealersRefs.map(r => r.id)]);

    let count = 0;
    const processed = [];

    for (const dealerId of allIds) {
      const docRef = db.collection("Dealers").doc(dealerId);
      const docSnap = await docRef.get();
      const data = docSnap.exists ? docSnap.data() : {};

      // Intentar obtener un nombre válido
      const rawName = data.display_name || data.nombre || data.dealer_name || dealerId;
      const slug = slugify(rawName);

      console.log(`🤖 [Init] Procesando Dealer: ${dealerId} | Slug: ${slug}`);

      const botLink = `https://inventarioia-gzhz2ynksa-uc.a.run.app/?dealerID=${slug}`;
      const shopLink = `https://inventarioia-gzhz2ynksa-uc.a.run.app/tienda?dealerID=${slug}`;

      await db.collection("Dealers").doc(dealerId).collection(":DATA BOT RN").doc("CONFIG").set({
        LINK_INVENTARIO_GHL: botLink,
        LINK_TIENDA: shopLink,
        dealer_id: dealerId,
        dealer_name: rawName,
        slug: slug,
        status: "active",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Actualizar el documento principal (Asegurar que NO sea phantom)
      await docRef.set({
        nombre: rawName.toUpperCase().includes('DURAN') ? "DURÁN FERNÁNDEZ AUTO S.R.L" : rawName,
        slug: slug,
        status: "active",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      count++;
      processed.push(dealerId);
    }
    res.json({ message: `✅ Se generaron links para ${count} documentos.`, processed: processed, status: "ok" });
  } catch (error) {
    console.error("❌ Error en initBotLinks:", error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Función de Limpieza: Elimina duplicados creados por error 
exports.cleanupDealers = onRequest({ cors: true }, async (req, res) => {
  try {
    const dealersRefs = await db.collection("Dealers").listDocuments();
    let deletedCount = 0;
    const deletedIds = [];

    for (const docRef of dealersRefs) {
      const dealerId = docRef.id;
      const docSnap = await docRef.get();
      const data = docSnap.exists ? docSnap.data() : {};

      // Criterios de limpieza:
      // 1. IDs de prueba hardcodeados
      // 1. IDs de prueba hardcodeados y el duplicado mal codificado específico
      const isTestId = [
        "DURAN-FERNANDEZ-AUTO-SRL",
        "MI-DEALER-TEST",
        "DURÃÓN FERNÃÁNDEZ AUTO S.R.L" // Specific targeting
      ].includes(dealerId);

      // 2. IDs con errores de codificación (caracteres raros)
      const hasEncodingError = /Ã|Â|Ã³/.test(dealerId);

      // 3. Documentos phantom sin data real
      const isPhantom = !docSnap.exists || (!data.nombre && !data.display_name && !data.email);

      if (isTestId || hasEncodingError || (isPhantom && dealerId !== "MI-DEALER" && dealerId !== "DURÁN FERNÁNDEZ AUTO S.R.L")) {
        console.log(`🗑️ Eliminando documento: ${dealerId}`);

        // Eliminar subcolecciones (:DATA BOT RN)
        const subDocs = await docRef.collection(":DATA BOT RN").get();
        for (const subDoc of subDocs.docs) {
          await subDoc.ref.delete();
        }

        await docRef.delete();
        deletedCount++;
        deletedIds.push(dealerId);
      }
    }

    res.json({
      message: `✅ Limpieza completada. Se eliminaron ${deletedCount} documentos.`,
      deletedIds: deletedIds,
      status: "ok"
    });
  } catch (error) {
    console.error("❌ Error en cleanupDealers:", error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Función de Migración (Para eliminar nivel 'items' definitivamente)
exports.migrarEstructura = onRequest({ cors: true }, async (req, res) => {
  try {
    const dealerId = req.query.dealer;
    if (!dealerId) return res.status(400).send("Falta ?dealer=NombreDealer");

    const batch = db.batch();
    let count = 0;

    // 1. Migrar de 'inventario' (nivel plano) a 'vehiculos'
    const currentSnap = await db.collection("Dealers").doc(dealerId).collection("inventario").get();
    currentSnap.forEach(docSnap => {
      const data = docSnap.data();
      const newRef = db.collection("Dealers").doc(dealerId).collection("vehiculos").doc(docSnap.id);
      batch.set(newRef, data);
      count++;
    });

    // 2. Migrar de 'inventario/items/items' (nivel antiguo) a 'vehiculos'
    const oldItemsSnap = await db.collection("Dealers").doc(dealerId).collection("inventario").doc("items").collection("items").get();
    oldItemsSnap.forEach(docSnap => {
      const data = docSnap.data();
      const newRef = db.collection("Dealers").doc(dealerId).collection("vehiculos").doc(docSnap.id);
      batch.set(newRef, data);
      count++;
    });

    if (count > 0) {
      await batch.commit();
      return res.send(`✅ Migración completada para ${dealerId}. Se movieron ${count} vehículos a la colección 'vehiculos'.`);
    } else {
      return res.send(`ℹ️ No se encontraron vehículos para migrar en ${dealerId}.`);
    }
  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
});

// 2. Función para Enviar a GHL
exports.sendToGHL = onRequest({ cors: true }, async (req, res) => {
  res.json({ status: "active", destination: "GoHighLevel" });
});

// X. Función de Depuración (Para el desarrollador)
exports.debugInfo = onRequest({ cors: true }, async (req, res) => {
  try {
    // Inspeccionar usuario específico para ver su dealerId
    const userSnap = await db.collection("users").doc("janilfernandez@hotmail_com").get();
    const userData = userSnap.exists ? userSnap.data() : "NO EXISTE";

    const collections = await db.listCollections();
    const results = [];

    for (const coll of collections) {
      const snap = await coll.limit(20).get();
      const docs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
      results.push({
        id: coll.id,
        hex: Buffer.from(coll.id).toString('hex'),
        count: snap.size,
        docs: docs
      });
    }

    res.json({
      project: process.env.GCLOUD_PROJECT,
      collections: results
    });

    // Inspeccionar vehículos raíz
    const vehiclesSnap = await db.collection("vehicles").limit(10).get();
    const dealerIdsInVehicles = new Set();
    vehiclesSnap.forEach(doc => {
      const data = doc.data();
      if (data.dealerId) dealerIdsInVehicles.add(data.dealerId);
      if (data.dealerID) dealerIdsInVehicles.add(data.dealerID);
      if (data.locationId) dealerIdsInVehicles.add(data.locationId);
    });

    res.json({
      project: process.env.GCLOUD_PROJECT,
      collections: collectionDetails,
      dealerIdsFoundInVehicles: Array.from(dealerIdsInVehicles),
      userSample: userData
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Y. Función de Depuración de Usuarios
exports.debugUsers = onRequest({ cors: true }, async (req, res) => {
  try {
    const usersSnap = await db.collection("users").get();
    const users = [];
    usersSnap.forEach(doc => {
      const data = doc.data();
      users.push({
        id: doc.id,
        dealerId: data.dealerId,
        dealerName: data.dealerName,
        email: data.email
      });
    });

    const vehiclesSnap = await db.collection("vehicles").get();

    res.json({
      count: users.length,
      users: users,
      vehiclesRootCount: vehiclesSnap.size
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

// Z. Función para forzar la creación de dealers básicos
exports.onboardDealers = onRequest({ cors: true }, async (req, res) => {
  try {
    const dealers = [
      { id: "MI-DEALER", name: "Mi Dealer" },
      { id: "DURAN-FERNANDEZ-AUTO-SRL", name: "DURÁN FERNÁNDEZ AUTO S.R.L" }
    ];

    let count = 0;
    for (const d of dealers) {
      await admin.firestore().collection("Dealers").doc(d.id).set({
        nombre: d.name,
        display_name: d.name,
        slug: slugify(d.name),
        status: "active",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      count++;
    }

    res.json({ message: `✅ Se crearon/actualizaron ${count} dealers.`, status: "ok" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. COMENTADO PARA EVITAR FANTASMAS: El frontend se encarga de esto ahora con IDs técnicos
// exports.setupDealerBot = onDocumentCreated("Dealers/{dealerId}", async (event) => {
//   ...
// });

// 10. REPAIR FUNCTION (Temporary)
exports.repairDealerData = onRequest(async (req, res) => {
  const DEALER_ID = '5YBWavjywU0Ay0Y85R9p';
  const DEALER_NAME = 'DURÁN FERNÁNDEZ AUTO S.R.L';

  try {
    // 1. Fix Main Doc
    // Normalization logic: remove accents and special chars
    const idBusqueda = DEALER_NAME.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "");

    await db.collection('Dealers').doc(DEALER_ID).set({
      name: DEALER_NAME,
      id_busqueda: idBusqueda,
      nombre: DEALER_NAME,
      ghlLocationId: idBusqueda, // Solicitud Usuario: ID Técnico = Nombre sin tildes
      status: 'active',
      lastRepair: new Date().toISOString()
    }, { merge: true });

    // 2. Fix Bot Config
    const linkInventario = `https://inventarioia-gzhz2ynksa-uc.a.run.app/?dealer=${DEALER_ID}`;
    const linkTienda = `https://carbot-5d709.web.app/inventory?dealer=${DEALER_ID}`;

    await db.collection('Dealers').doc(DEALER_ID).collection(':DATA BOT RN').doc('CONFIG').set({
      LINK_INVENTARIO_GHL: linkInventario,
      LINK_TIENDA: linkTienda,
      bot_active: true,
      dealerName: DEALER_NAME,
      repairedBy: 'Cloud Function'
    }, { merge: true });

    res.status(200).send(`✅ REPAIR COMPLETE for ${DEALER_ID}`);
  } catch (error) {
    console.error(error);
    res.status(500).send(`❌ Error: ${error.message}`);
  }
});



