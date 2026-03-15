const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const functions = require("firebase-functions");
const { onDocumentWritten, onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { createClient } = require('@supabase/supabase-js');

admin.initializeApp();

const db = admin.firestore();

// Supabase Configuration
const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODE4MTEsImV4cCI6MjA4NzM1NzgxMX0.HMVGq8E2Lf5utJGxWsO8FEnJXCBzwSHVNEzeuoSm4y8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// GHL Secrets for Gen 2
const ghlClientSecret = defineSecret("GHL_CLIENT_SECRET");
const ghlClientId = defineSecret("GHL_CLIENT_ID");
const supabaseServiceKey = defineSecret("SUPABASE_SERVICE_ROLE_KEY");

// ──────────────────────────────────────────────────────────────────
// 🔥 Configuración de IDs de Custom Fields de GoHighLevel
// Pega aquí los IDs alfanuméricos que te da GHL para cada campo.

const GHL_CUSTOM_FIELD_IDS = {
  // 🚘 1. Vehículo (Básico)
  marca: "",
  modelo: "",
  ao: "{{ contact.ao }}",                 // Para {{ contact.ao }}
  color: "",
  edicin: "",             // Para {{ contact.edicin }}
  chasis: "",             // Para {{ contact.chasis }}
  millaje: "",            // Para {{ contact.millaje }}
  tipo_de_vehculo: "",    // Para {{ contact.tipo_de_vehculo }}

  // ⚙️ 2. Mecánica
  transmisin: "",         // Para {{ contact.transmisin }}
  traccin: "",            // Para {{ contact.traccin }}
  tipo_de_combustible: "",// Para {{ contact.tipo_de_combustible }}
  motor: "",              // Para {{ contact.motor }}

  // 🛋️ 3. Equipamiento y Extras
  interior: "",           // Para {{ contact.interior }}
  techo: "",              // Para {{ contact.techo }}
  carplay: "",            // Para {{ contact.carplay }}
  camaa: "",              // Para {{ contact.camaa }}
  sensores: "",           // Para {{ contact.sensores }}
  baul_electrico: "",     // Para {{ contact.baul_electrico }}
  cristales_electrico: "",// Para {{ contact.cristales_electrico }}
  llave: "",              // Para {{ contact.llave }}
  filas_de_asientos: "",  // Para {{ contact.filas_de_asientos }}

  // 💰 4. Financiero
  precio_rd: "",            // Para {{ contact.precio_rd }}
  monto_a_financiar_rd: "", // Para {{ contact.monto_a_financiar_rd }}

  // 👤 5. Extras del Cliente
  cdula: "",                     // Para {{ contact.cdula }}
  a_que_quien_va_dirigida: ""    // Para {{ contact.a_que_quien_va_dirigida }}
};

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

function toUuid(uid) {
  if (!uid) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) return uid;
  let hex = '';
  for (let i = 0; i < uid.length; i++) {
    hex += uid.charCodeAt(i).toString(16).padStart(2, '0');
  }
  hex = hex.padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

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

// Helper: generate a URL slug for a vehicle (e.g. "bmw-530e-blanco-2018")
const vehicleSlugify = (marca, modelo, color, anio) => {
  return [marca, modelo, color, anio].filter(Boolean).join(' ').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
};

const capitalize = (val) => {
  if (!val || typeof val !== 'string') return val || "-";
  return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
};

// 1. Función para Inteligencia Artificial (Inventario Dinámico)
exports.inventarioIA = onRequest({ cors: true }, async (req, res) => {
  try {
    // ── Friendly URL support ──
    // /inventario/:slug          → HTML document (all vehicles)
    // /inventario/:slug/bot      → JSON for GHL bot
    // /inventario/:slug/catalogo → Visual catalog (all vehicles)
    // /inventario/:slug/catalogo/:vehicleSlug → Vehicle detail page
    let dealerParam = req.query.dealerID || req.query.dealer || req.query.location_name;
    let autoJsonFormat = req.query.format === 'json';
    let autoCatalogMode = false;
    let vehicleSlugFromPath = null;

    const pathParts = (req.path || '').split('/').filter(Boolean);
    if (pathParts.length >= 2 && pathParts[0] === 'inventario') {
      const slug = pathParts[1];
      if (slug && slug !== 'bot' && slug !== 'catalogo') {
        dealerParam = dealerParam || slug;
      }

      // /inventario/:slug/bot → JSON
      if (pathParts.includes('bot')) {
        autoJsonFormat = true;
      }
      // /inventario/:slug/catalogo → Catalog view
      // /inventario/:slug/catalogo/:vehicleSlug → Vehicle detail
      if (pathParts.includes('catalogo')) {
        autoCatalogMode = true;
        const catIdx = pathParts.indexOf('catalogo');
        if (catIdx + 1 < pathParts.length) {
          vehicleSlugFromPath = pathParts[catIdx + 1]; // e.g. "bmw-530e-blanco-2018"
        }
      }
    }

    // Override query params for downstream use
    if (autoJsonFormat) req.query.format = 'json';
    if (autoCatalogMode) req.query.view = 'catalog';

    if (!dealerParam) {
      return res.status(400).json({ error: "Falta el parámetro 'dealer' o el slug en la URL" });
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
        if (matchedDealerId) return; // Ya encontrado
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
        // Coincidencia por slug generado del nombre (para friendly URLs)
        else if (data.nombre && slugify(data.nombre) === paramLower) {
          matchedDealerId = doc.id;
        }
      });
    }

    // C. Fallback: buscar en Supabase por slug del nombre si Firestore no encontró nada
    if (!matchedDealerId) {
      try {
        const { data: sbDealers } = await supabase.from('dealers').select('id, nombre');
        if (sbDealers) {
          const match = sbDealers.find(d => d.nombre && slugify(d.nombre) === dealerParam.toLowerCase());
          if (match) matchedDealerId = match.id;
        }
      } catch (e) {
        console.warn("⚠️ Supabase slug lookup failed:", e.message);
      }
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
    let dealerName = dealerData.nombre || dealerData.display_name || matchedDealerId;
    const dealerLinkParam = dealerData.slug || matchedDealerId; // Reliable param for links

    // --- DEALER LOGO: Pull from Supabase dealers table ---
    let logoUrl = dealerData.logo_url || dealerData.logoUrl || "";

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
          link_catalogo: `https://carbotsystem.com/inventario/${slugify(dealerName)}/catalogo/${vehicleSlugify(data.make, data.model, data.color, data.year)}`,
          link_catalogo_legacy: `https://inventarioia-gzhz2ynksa-uc.a.run.app/catalogo?dealerID=${matchedDealerId}&vehicleID=${doc.id}`,
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

    console.log(`✅ ${inventory.length} vehículos encontrados en Firestore para ${matchedDealerId} en ${collectionName}`);

    // --- INTEGRACIÓN SUPABASE ---
    // The original code had a nested try-catch here.
    // To "fix the double try block" while maintaining the non-critical nature of Supabase,
    // we'll keep the Supabase logic within a single try-catch block that logs errors
    // but allows the rest of the function to proceed.
    // This ensures that Supabase issues don't halt the entire inventory retrieval.
    const dealerUuid = dealerData.supabaseDealerId || toUuid(matchedDealerId);

    if (dealerUuid) {
      try {
        // Fetch dealer info from Supabase (logo + nombre fallback)
        const { data: sbDealer } = await supabase.from('dealers').select('logo_url, nombre').eq('id', dealerUuid).single();
        if (sbDealer) {
          if (!logoUrl && sbDealer.logo_url) logoUrl = sbDealer.logo_url;
          // Usar nombre de Supabase si Firestore tiene un nombre genérico o es el ID crudo
          if (sbDealer.nombre && (!dealerName || dealerName === matchedDealerId || dealerName.toLowerCase() === 'mi dealer' || dealerName.toLowerCase() === 'dealer')) {
            dealerName = sbDealer.nombre;
          }
        }
        console.log(`📡 Consultando Supabase para Dealer UUID: ${dealerUuid}`);
        const { data: supabaseVehicles, error: sbError } = await supabase
          .from('vehiculos')
          .select('*')
          .eq('dealer_id', dealerUuid);

        if (sbError) {
          console.error("❌ Error consultando Supabase:", sbError);
        } else if (supabaseVehicles && supabaseVehicles.length > 0) {
          console.log(`✅ ${supabaseVehicles.length} vehículos encontrados en Supabase`);

          supabaseVehicles.forEach(v => {
            // Mapeo idéntico al de App.jsx para consistencia
            const makeFromTitle = v.detalles?.make || v.titulo_vehiculo?.split(' ')[1] || 'N/A';
            const modelFromTitle = v.detalles?.model || v.titulo_vehiculo?.split(' ').slice(2).join(' ') || 'N/A';
            const yearFromTitle = v.detalles?.year || v.titulo_vehiculo?.split(' ')[0] || '';

            // Monedas
            const currency = v.detalles?.currency || 'USD';
            const downPaymentCurrency = v.detalles?.downPaymentCurrency || 'USD';
            const priceVal = parseFloat(v.precio || 0);
            const initialVal = parseFloat(v.inicial || 0);

            // Determinar precios formateados
            const priceFormatted = (currency === 'DOP' || currency === 'RD$')
              ? `RD$ ${priceVal.toLocaleString()} Pesos`
              : `US$ ${priceVal.toLocaleString()} Dólares`;

            const initialFormatted = (downPaymentCurrency === 'DOP' || downPaymentCurrency === 'RD$')
              ? `RD$ ${initialVal.toLocaleString()} Pesos`
              : `US$ ${initialVal.toLocaleString()} Dólares`;

            // Status similar a Firestore (disponible, cotizado)
            const s = (v.estado || '').toLowerCase().trim();
            const allowed = ['available', 'disponible', 'quoted', 'cotizado'];

            if (allowed.includes(s) && !v.deleted_at) {
              const isTurbo = (v.detalles?.engine_turbo === "SI" || v.detalles?.turbo === "SI" || v.detalles?.is_turbo === true || v.detalles?.engine_type === "Turbo");
              const turboStr = isTurbo ? "Turbo" : "Aspirado";

              inventory.push({
                id: v.id,
                is_supabase: true,
                nombre: `${yearFromTitle} ${makeFromTitle} ${modelFromTitle} ${v.detalles?.edition || ""} ${v.color || ""}`.trim().toUpperCase(),
                precio: priceFormatted,
                // Carfax: only show "Clean Carfax" if Sí, otherwise empty
                carfax_status: (v.condicion_carfax === "Sí" || v.condicion_carfax === "Si" || v.condicion_carfax === true || v.detalles?.clean_carfax === "Sí" || v.detalles?.clean_carfax === "Si") ? "Clean Carfax" : "",
                mileage_formatted: `${Number(v.millas || v.detalles?.mileage || 0).toLocaleString()} ${(["MI", "MILLAS", "MILLA"].includes((v.detalles?.mileage_unit || v.detalles?.unit || "").toUpperCase())) ? "Millas" : "Km"}`,
                link_catalogo: `https://carbotsystem.com/inventario/${slugify(dealerName)}/catalogo/${vehicleSlugify(makeFromTitle, modelFromTitle, v.color, yearFromTitle)}`,
                link_catalogo_legacy: `https://inventarioia-gzhz2ynksa-uc.a.run.app/catalogo?dealerID=${matchedDealerId}&vehicleID=${v.id}&source=supabase`,

                // Visual Details (fmt) — fallback to detalles when top-level is null
                color_fmt: capitalize(v.color || v.detalles?.color),
                transmision_fmt: capitalize(v.transmision || v.detalles?.transmission),
                traccion_fmt: (v.traccion || v.detalles?.traction || v.detalles?.drivetrain || "").toUpperCase() || "-",
                motor_fmt: (() => {
                  const ccVal = (v.detalles?.engine_cc || "").toString().trim();
                  const cc = ccVal ? `${ccVal}.0 Litros` : "";
                  const cylVal = (v.detalles?.engine_cyl || "").toString().trim();
                  const cyl = cylVal ? `${cylVal} Cilindros` : "";
                  const engineType = (v.detalles?.engine_type || "").toString().trim();
                  const turboLabel = (v.detalles?.engine_turbo === "SI" || v.detalles?.turbo === "SI" || v.detalles?.is_turbo === true || engineType === "Turbo") ? "Turbo" : (engineType && engineType !== "Normal" ? engineType : "Aspirado");
                  const parts = [cc, cyl, turboLabel].filter(p => p !== "");
                  if (parts.length === 0) return capitalize(v.motor || v.detalles?.engine || "-");
                  return parts.join(", ");
                })(),
                techo_fmt: capitalize(v.techo || v.detalles?.roof_type || v.detalles?.roof),
                combustible_fmt: capitalize(v.combustible || v.detalles?.fuel),
                llave_fmt: capitalize(v.llave || v.detalles?.key_type),
                baul_fmt: (v.baul_electrico === true || v.detalles?.trunk === "Sí" || v.detalles?.trunk === "Si") ? "Sí" : "No",
                camera_fmt: capitalize(v.camara || v.detalles?.camera),
                sensores_fmt: (v.sensores === true || v.detalles?.sensors === "Sí" || v.detalles?.sensors === "Si") ? "Sí" : "No",
                carplay_fmt: (v.carplay === true || v.detalles?.carplay === "Sí" || v.detalles?.carplay === "Si") ? "Sí" : "No",
                asientos_fmt: (() => {
                  const n = parseInt(v.cantidad_asientos || v.detalles?.seats || 0);
                  return n > 0 ? `${n} Filas de Asientos` : "-";
                })(),
                vidrios_fmt: (v.vidrios_electricos === true || v.detalles?.electric_windows === "Sí" || v.detalles?.electric_windows === "Si") ? "Sí" : "No",
                material_fmt: capitalize(v.material_asientos || v.detalles?.seat_material),
                vin_fmt: (v.chasis_vin || v.detalles?.vin || "").toUpperCase() || "-",
                inicial_fmt: initialFormatted,

                // Metadata & Template compatibility
                imagen: (v.fotos && v.fotos.length > 0) ? v.fotos[0] : "",
                has_images: (v.fotos && v.fotos.length > 0),
                marca: makeFromTitle,
                modelo: modelFromTitle,
                edicion: v.detalles?.edition || v.detalles?.version || "-",
                anio: yearFromTitle,
                anio_num: parseInt(yearFromTitle) || 0,
                color: v.color || v.detalles?.color,
                transmision: v.transmision || v.detalles?.transmission,
                traccion: v.traccion || v.detalles?.traction || v.detalles?.drivetrain,
                combustible: v.combustible || v.detalles?.fuel,
                motor: (() => {
                  const ccVal = (v.detalles?.engine_cc || "").toString().trim();
                  const cc = ccVal ? `${ccVal}.0 Litros` : "";
                  const cylVal = (v.detalles?.engine_cyl || "").toString().trim();
                  const cyl = cylVal ? `${cylVal} Cilindros` : "";
                  const engineType = (v.detalles?.engine_type || "").toString().trim();
                  const turboLabel = (v.detalles?.engine_turbo === "SI" || v.detalles?.turbo === "SI" || v.detalles?.is_turbo === true || engineType === "Turbo") ? "Turbo" : (engineType && engineType !== "Normal" ? engineType : "Aspirado");
                  return [cc, cyl, turboLabel].filter(Boolean).join(", ") || (v.motor || "-");
                })(),
                condicion: v.detalles?.condition || v.condicion || 'Usado Importado',
                carfax: (v.condicion_carfax === "Sí" || v.condicion_carfax === "Si" || v.condicion_carfax === true || v.detalles?.clean_carfax === "Sí" || v.detalles?.clean_carfax === "Si") ? "Clean Carfax" : "",
                asientos: (() => {
                  const n = parseInt(v.cantidad_asientos || v.detalles?.seats || 0);
                  return n > 0 ? `${n} Filas de Asientos` : "-";
                })(),
                asientos_num: parseInt(v.cantidad_asientos || v.detalles?.seats) || 0,
                material_interior: v.material_asientos || v.detalles?.seat_material || "-",
                techo: v.techo || v.detalles?.roof_type || v.detalles?.roof || "-",
                baul: (v.baul_electrico === true || v.detalles?.trunk === "Sí" || v.detalles?.trunk === "Si") ? "Sí" : "No",
                llave: v.llave || v.detalles?.key_type || "-",
                camera: v.camara || v.detalles?.camera || "-",
                sensores: (v.sensores === true || v.detalles?.sensors === "Sí" || v.detalles?.sensors === "Si") ? "Sí" : "No",
                carplay: (v.carplay === true || v.detalles?.carplay === "Sí" || v.detalles?.carplay === "Si") ? "Sí" : "No",
                electric_windows: (v.vidrios_electricos === true || v.detalles?.electric_windows === "Sí" || v.detalles?.electric_windows === "Si") ? "Sí" : "No",
                mileage: v.millas || v.detalles?.mileage || "0",
                unit: (["MI", "MILLAS", "MILLA"].includes((v.detalles?.mileage_unit || v.detalles?.unit || "").toUpperCase())) ? "Millas" : "Km",
                vin: v.chasis_vin || v.detalles?.vin,
                inicial_calculado: initialFormatted,
                precio_num: priceVal,
                precio_dop_ref: (currency === 'USD' ? priceVal * 60 : priceVal)
              });
            }
          });
        }
      } catch (sbErr) {
        console.error("❌ Fallo crítico de Supabase en inventarioIA:", sbErr);
      }
    }

    // ── FORMAT=JSON: Respuesta plana para GHL Bot / Knowledge Base ──
    if (req.query.format === 'json') {
      const dealerSlugForLinks = slugify(dealerName);
      const catalogoUrl = `https://carbotsystem.com/inventario/${dealerSlugForLinks}/catalogo`;
      const sortedForJson = [...inventory].sort((a, b) => (a.marca || "").localeCompare(b.marca || ""));
      const flatInventory = sortedForJson.map(v => ({
        marca: v.marca || "-",
        modelo: v.modelo || "-",
        año: v.anio_num || 0,
        color: v.color_fmt || "-",
        edicion: v.edicion || "-",
        chasis: v.vin_fmt || "-",
        precio: v.precio || "-",
        inicial: v.inicial_fmt || "-",
        millaje: v.mileage_formatted || "-",
        transmision: v.transmision_fmt || "-",
        traccion: v.traccion_fmt || "-",
        motor: v.motor_fmt || "-",
        combustible: v.combustible_fmt || "-",
        carfax: v.carfax_status || "-",
        techo: v.techo_fmt || "-",
        llave: v.llave_fmt || "-",
        baul_electrico: v.baul_fmt || "-",
        camara: v.camera_fmt || "-",
        sensores: v.sensores_fmt || "-",
        carplay: v.carplay_fmt || "-",
        asientos: v.asientos_fmt || "-",
        vidrios_electricos: v.vidrios_fmt || "-",
        material_interior: v.material_fmt || "-",
        "FOTOS Y DETALLES:": v.has_images && v.link_catalogo ? `Aqui puedes ver las fotos y detalles del carro: ${v.link_catalogo}` : "No tengo las fotos en este momento, un compañero te ayudará",
        estado: "Disponible"
      }));

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      return res.status(200).json({
        dealer: dealerName,
        total: flatInventory.length,
        link_catalogo: `Mira este es nuestro catalogo actual, puedes ver y decirme cual te interesa: ${catalogoUrl}`,
        vehiculos: flatInventory
      });
    }

    // 3. Formatear respuesta (JSON por defecto, HTML opcional)
    const isCatalogPath = req.path === '/catalogo' || req.query.view === 'catalog';
    const viewMode = isCatalogPath || req.query.view === 'human' || !req.headers.accept?.includes('application/json');
    let vehicleId = req.query.vehicleID;
    // Resolve vehicleSlug from friendly URL path to actual vehicleId
    if (!vehicleId && vehicleSlugFromPath && inventory.length > 0) {
      const matchedVehicle = inventory.find(v => {
        const vSlug = vehicleSlugify(v.marca, v.modelo, v.color_fmt, v.anio_num);
        return vSlug === vehicleSlugFromPath;
      });
      if (matchedVehicle) vehicleId = matchedVehicle.id;
    }

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
      // El catálogo público renderiza TODO con sus propios templates HTML.
      // El detalle de vehículos usa el template de abajo (vehicleId check).

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
        console.log(`🔍 [inventarioIA] MODO DETALLE para vehículo: ${vehicleId}`);
        // --- MODO DETALLE ---
        const v = inventory.find(item => String(item.id) === String(vehicleId));
        if (!v) {
          console.log(`❌ [inventarioIA] Vehículo no encontrado en inventory`);
          return res.status(404).send("Vehículo no encontrado");
        }

        let raw = {};
        if (v.is_supabase) {
          // Fetch raw from Supabase
          const { data, error } = await supabase.from('vehiculos').select('*').eq('id', vehicleId).single();
          if (!error && data) {
            const makeFromTitle = data.detalles?.make || data.titulo_vehiculo?.split(' ')[1] || 'N/A';
            const modelFromTitle = data.detalles?.model || data.titulo_vehiculo?.split(' ').slice(2).join(' ') || 'N/A';
            const yearFromTitle = data.detalles?.year || data.titulo_vehiculo?.split(' ')[0] || '';

            raw = {
              ...data,
              ...data.detalles,
              make: makeFromTitle,
              model: modelFromTitle,
              year: yearFromTitle,
              images: data.fotos,
              image: data.fotos && data.fotos.length > 0 ? data.fotos[0] : null,
              price: data.precio,
              initial_payment: data.inicial,
              currency: data.detalles?.currency || 'USD',
              body_type: data.detalles?.body_type || data.tipo
            };
          }
        } else {
          // Fetch raw from Firestore
          const vDoc = await db.collection("Dealers").doc(matchedDealerId).collection(collectionName).doc(vehicleId).get();
          raw = vDoc.exists ? vDoc.data() : {};
        }

        // Galería de fotos (carrete)
        const photos = raw.images || (raw.image ? [raw.image] : []);

        // --- SMART RELATED LOGIC ---
        const precioBase = getPrecioEnPesos(raw.price || raw.precio || 0, raw.currency);
        // data.body_type suele venir en inglés o español, normalizamos
        const tipoBase = (raw.body_type || raw.type || raw.tipo || '').split(' ')[0].toLowerCase();
        const asientosBase = parseInt(raw.seats || raw.seatRows || raw.cantidad_asientos || 0);

        const related = inventory.filter(item => {
          // 1. No incluir el mismo carro
          if (String(item.id) === String(vehicleId)) return false;

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
              :root { --primary: #d32f2f; --bg: #f5f5f7; --text: #1e293b; }
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { font-family: 'Inter', -apple-system, system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; padding-bottom: 60px; -webkit-font-smoothing: antialiased; }
              
              /* ── HEADER ──────────────────────────────── */
              .header-wrapper { padding: 20px; display: flex; justify-content: center; }
              .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 15px 40px; text-align: center; border-radius: 9999px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2); border: 2px solid rgba(255,255,255,0.1); position: relative; display: flex; align-items: center; gap: 20px; }
              .header-content { display: flex; flex-direction: column; align-items: center; }
              .header p { margin: 0; font-size: 0.55rem; font-weight: 800; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; }
              .header h1 { margin: 2px 0 0; font-size: 1.1rem; font-weight: 900; text-transform: uppercase; color: #ffffff; letter-spacing: 0px; }
              .header-back { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.1); color: #fff; text-decoration: none; border: 1px solid rgba(255,255,255,0.2); transition: all 0.2s; }
              .header-back:hover { background: rgba(255,255,255,0.2); }
              .header-back svg { width: 18px; height: 18px; }
              
              /* ── CONTAINER ──────────────────────────── */
              body { background-color: #f3f4f6; } /* Light gray background for the whole page */
              .container { max-width: 1400px; margin: 0 auto; padding: 20px 20px 50px; }
              
              /* ── TWO COLUMN LAYOUT (DESKTOP) ──────── */
              .details-card {
                display: grid;
                grid-template-columns: 1fr;
                gap: 30px;
              }

              @media (min-width: 900px) {
                .details-card {
                  grid-template-columns: 1.4fr 1fr;
                  gap: 30px;
                  align-items: start;
                }
              }
              
              /* ── IMAGE SECTION ──────────────────────── */
              .image-column {
                background: #ffffff;
                border-radius: 2rem;
                padding: 12px;
                box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08);
                border: 1px solid rgba(0,0,0,0.02);
              }
              .main-image-container { 
                position: relative; 
                border-radius: 1.5rem; 
                overflow: hidden; 
              }
              .main-image { width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block; cursor: zoom-in; }
              
              /* Image Nav Arrows */
              .img-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 42px; height: 42px; border-radius: 50%; background: #ffffff; color: #d32f2f; border: 1px solid rgba(0,0,0,0.05); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1); transition: all 0.2s; z-index: 5; }
              .img-nav:hover { background: #f8fafc; transform: translateY(-50%) scale(1.05); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
              .img-nav.prev { left: 16px; }
              .img-nav.next { right: 16px; }
              .img-nav svg { width: 20px; height: 20px; }
              @media (max-width: 768px) { .img-nav { width: 36px; height: 36px; } .img-nav svg { width: 16px; height: 16px; } }
              
              /* ── INFO COLUMN ────────────────────────── */
              .info-column { 
                background: #ffffff; 
                border-radius: 2rem; 
                padding: 40px; 
                box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08); 
                border: 1px solid rgba(0,0,0,0.02);
              }
              
              /* Year / Color Badge */
              .vehicle-badge { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
              .vehicle-badge span { font-weight: 800; font-size: 0.85rem; letter-spacing: 0.5px; }
              .badge-year { color: #d32f2f; }
              .badge-dot { width: 4px; height: 4px; border-radius: 50%; background: #cbd5e1; display: inline-block; }
              .badge-text { color: #94a3b8; text-transform: uppercase; }
              
              /* Vehicle Title */
              .vehicle-title { font-size: 2.2rem; font-weight: 900; line-height: 1.1; margin: 0 0 24px; text-transform: uppercase; color: #0f172a; letter-spacing: -1px; }
              .vehicle-title .model { color: #d32f2f; }
              @media (min-width: 900px) { .vehicle-title { font-size: 2.4rem; } }
              @media (max-width: 500px) { .vehicle-title { font-size: 1.8rem; } }
              
              /* Price Block */
              .price-block { margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px dashed #e2e8f0; }
              .price-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
              .price-label { font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; display: flex; align-items: center; gap: 6px; }
              .price-label svg { color: #d32f2f; }
              .currency-toggle { display: flex; background: #f8fafc; border-radius: 999px; padding: 2px; border: 1px solid #e2e8f0; }
              .currency-btn { background: transparent; border: none; font-size: 0.65rem; font-weight: 800; color: #64748b; padding: 4px 10px; border-radius: 999px; cursor: pointer; transition: all 0.2s; }
              .currency-btn.active { background: #ffffff; color: #d32f2f; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
              .price-value { display: flex; align-items: baseline; gap: 6px; }
              .price-currency { font-size: 1.8rem; font-weight: 800; color: #d32f2f; }
              .price-amount { font-size: 2.4rem; font-weight: 900; color: #0f172a; letter-spacing: -1px; }
              
              /* Initial Payment Block */
              .initial-block { margin-bottom: 30px; }
              .initial-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
              .initial-label { font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; display: flex; align-items: center; gap: 6px; }
              .initial-value { display: flex; align-items: baseline; gap: 6px; justify-content: flex-end; }
              .initial-curr { font-size: 1rem; font-weight: 800; color: #94a3b8; }
              .initial-amt { font-size: 1.4rem; font-weight: 900; color: #475569; letter-spacing: -0.5px; }

              /* ── CARRETE / THUMBNAILS ───────────────── */
              .thumbs-section { margin-top: 24px; padding-top: 20px; border-top: 1px dashed #e2e8f0; }
              .thumbs-title { display: flex; align-items: center; gap: 8px; font-size: 0.7rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; }
              .thumbs-title svg { color: #d32f2f; }
              .thumbs-reel { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
              .thumb-item { position: relative; border-radius: 10px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; aspect-ratio: 4/3; }
              .thumb-item.active { border-color: #d32f2f; }
              .thumb-item:hover { border-color: #fca5a5; }
              .thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
              .thumb-badge { position: absolute; top: 4px; left: 4px; background: #e3342f; color: #fff; font-size: 0.5rem; font-weight: 900; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
              @media (max-width: 768px) { .thumbs-reel { grid-template-columns: repeat(4, 1fr); gap: 8px; } }
              @media (max-width: 500px) { .thumbs-reel { grid-template-columns: repeat(3, 1fr); } }
              
              /* ── BACK BUTTON ────────────────────────── */
              .back-btn { display: inline-flex; align-items: center; gap: 8px; background: #e3342f; color: #fff !important; padding: 10px 20px; border-radius: 9999px; text-decoration: none; font-weight: 800; font-size: 0.70rem; text-transform: uppercase; letter-spacing: 1px; transition: all 0.2s; cursor: pointer; border: 2px solid transparent; margin-bottom: 24px; }
              .back-btn:hover { background: #cc1f1a; }
              .back-btn svg { width: 14px; height: 14px; }
              
              /* ── LIGHTBOX ───────────────────────────── */
              .lightbox { position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: none; justify-content: center; align-items: center; z-index: 10000; overflow: hidden; background: #fff; touch-action: none; }
              .lightbox-backdrop { display: none; }
              .lightbox-header { position: absolute; top: 30px; left: 30px; z-index: 20; pointer-events: none; }
              .lb-title { color: #d32f2f; font-weight: 900; font-size: 1.5rem; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
              .lb-counter { color: #64748b; font-size: 0.8rem; font-weight: 700; margin: 5px 0 0; letter-spacing: 2px; text-transform: uppercase; }
              .lightbox-img-wrapper { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 10; }
              .lightbox-img { max-width: 90%; max-height: 80vh; object-fit: contain; pointer-events: auto; filter: drop-shadow(0 20px 50px rgba(0,0,0,0.1)); border-radius: 15px; }
              .close-btn { position: absolute; top: 20px; right: 30px; color: #d32f2f; font-size: 3rem; cursor: pointer; z-index: 20; transition: transform 0.2s; display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; border-radius: 50%; background: #f1f5f9; }
              .close-btn:hover { background: #e2e8f0; transform: rotate(90deg); }
              .nav-btn { position: fixed; top: 50%; transform: translateY(-50%); color: #d32f2f !important; font-size: 3rem; cursor: pointer; user-select: none; padding: 20px; z-index: 20; transition: all 0.2s; background: #f1f5f9; border-radius: 50%; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
              .nav-btn:hover { background: #fee2e2; scale: 1.1; }
              .nav-btn svg { width: 50px; height: 50px; stroke-width: 4px; }
              .prev { left: 40px; }
              .next { right: 40px; }
              .lb-thumbs-container { position: absolute; bottom: 20px; left: 0; width: 100%; display: flex; justify-content: center; z-index: 30; pointer-events: none; }
              .lb-thumbs-scroll { display: flex; gap: 8px; overflow-x: auto; padding: 10px 0; max-width: 95%; background: transparent; pointer-events: auto; scrollbar-width: none; }
              .lb-thumbs-scroll::-webkit-scrollbar { display: none; }
              .lb-thumb { height: 60px; width: 60px; border-radius: 8px; object-fit: cover; opacity: 0.6; transition: 0.2s; border: 2px solid transparent; flex-shrink: 0; cursor: pointer; background: #000; }
              .lb-thumb.active { opacity: 1; border-color: #d32f2f; transform: scale(1.05); }
              @media (max-width: 1024px) { .nav-btn { display: none !important; } .lightbox-img { max-height: 70vh !important; } .close-btn { top: 15px; right: 15px; width: 50px; height: 50px; } }
              @media (min-width: 900px) { .nav-btn { display: flex; } .lb-thumbs-container { display: flex; } }
              
              /* ── RELATED VEHICLES ───────────────────── */
              .related-section { margin-top: 40px; }
              .related-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
              .related-card { text-decoration: none; color: inherit; display: block; border-radius: 16px; overflow: hidden; background: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; transition: all 0.3s; }
              .related-card img { width: 100%; aspect-ratio: 16/9; object-fit: cover; }
              .related-card h4 { margin: 12px 14px 4px; font-size: 0.85rem; font-weight: 800; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
              .related-card p { margin: 0 14px 12px; font-size: 0.85rem; color: #d32f2f; font-weight: 900; }
              @media (min-width: 900px) { .related-grid { grid-template-columns: repeat(4, 1fr); gap: 20px; } .related-card:hover { transform: translateY(-5px); box-shadow: 0 15px 30px rgba(0,0,0,0.1); } }

              /* ── FICHA TÉCNICA ───────────────────────── */
              .specs-section { margin-top: 40px; }
              .tech-sheet-wrapper { background: #fff; border-radius: 2rem; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; }
              @media (max-width: 768px) { .tech-sheet-wrapper { padding: 24px; border-radius: 1.5rem; } }
              .tech-header { display: flex; align-items: center; gap: 12px; margin-bottom: 30px; }
              .tech-header svg { color: #d32f2f; }
              .tech-header h2 { font-size: 0.9rem; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 2px; margin: 0; }
              .tech-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
              @media (max-width: 1024px) { .tech-grid { grid-template-columns: repeat(2, 1fr); } }
              @media (max-width: 600px) { .tech-grid { grid-template-columns: 1fr; } }
              .tech-group-title { display: flex; align-items: center; gap: 8px; font-size: 0.68rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px; }
              .tech-items-container { display: flex; flex-direction: column; gap: 12px; }
              .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
              .tech-item { display: flex; flex-direction: column; gap: 4px; }
              .item-label { font-size: 0.6rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; padding-left: 2px; }
              .item-box { background: #f8fafc; border-radius: 14px; padding: 14px 18px; border: 1px solid #f1f5f9; display: flex; align-items: center; min-height: 48px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
              .item-box:hover { background: #fff; box-shadow: 0 8px 20px rgba(0,0,0,0.04); border-color: #cbd5e1; transform: translateY(-1px); }
              .item-value { font-size: 0.95rem; font-weight: 800; color: #1e293b; line-height: 1.1; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <div class="header-wrapper">
              <div class="header">
                 <div class="header-content">
                   <span style="font-weight: 700; font-size: 0.65rem; color: #94a3b8; letter-spacing: 3px; text-transform: uppercase;">Inventario de</span>
                   <h1>${dealerName}</h1>
                 </div>
              </div>
            </div>
            
            <div class="container">
              <div class="details-card">
                <!-- LEFT COLUMN: IMAGE -->
                <div class="image-column">
                  <div class="main-image-container">
                    ${photos.length > 0
            ? `<img src="${photos[0]}" class="main-image" id="mainImg" onclick="openLightbox()">`
            : `<img src="${logoUrl || 'https://via.placeholder.com/800x600?text=Sin+Imagen'}" class="main-image" id="mainImg" style="object-fit:contain;background:#f8fafc;padding:15%;">`}
                    ${photos.length > 1 ? `
                    <button class="img-nav prev" onclick="prevPageImg()">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <button class="img-nav next" onclick="nextPageImg()">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                    ` : ''}
                  </div>
                </div>

                <!-- RIGHT COLUMN: INFO -->
                <div class="info-column">
                  <!-- Back Button -->
                  <a href="?dealer=${req.query.dealer || matchedDealerId}" class="back-btn" style="margin-bottom: 24px;">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                     Regresar al Inventario
                  </a>

                  <!-- Year / Color Badge -->
                  <div class="vehicle-badge">
                    <span class="badge-year">${raw.year}</span>
                    <span class="badge-dot"></span>
                    <span class="badge-text">${(raw.color || 'N/A').toUpperCase()}</span>
                    ${raw.edition || raw.version ? `
                    <span class="badge-dot"></span>
                    <span class="badge-text">${(raw.edition || raw.version).toUpperCase()}</span>` : ''}
                  </div>

                  <!-- Vehicle Title -->
                  <h2 class="vehicle-title">${raw.make}<br><span class="model">${raw.model}</span></h2>

                  <!-- Price Section with Currency Toggle -->
                  <div class="price-block">
                    <div class="price-header">
                      <span class="price-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                        Precio de Venta
                      </span>
                      <div class="currency-toggle" id="priceToggle">
                        <button class="currency-btn active" data-currency="original" onclick="setPriceCurrency('original')">US$</button>
                        <button class="currency-btn" data-currency="alt" onclick="setPriceCurrency('alt')">RD$</button>
                      </div>
                    </div>
                    <div class="price-value">
                      <span class="price-currency" id="priceCurrLabel">${(v.precio || '').split(' ')[0]}</span>
                      <span class="price-amount" id="priceAmtLabel">${(v.precio || '').substring((v.precio || '').indexOf(' ') + 1)}</span>
                    </div>
                  </div>

                  <!-- Initial Payment -->
                  <div class="initial-block">
                    <div class="initial-header">
                      <span class="initial-label">Pago Inicial Sugerido</span>
                      <div class="currency-toggle" id="initialToggle">
                        <button class="currency-btn active" data-currency="original" onclick="setInitialCurrency('original')">US$</button>
                        <button class="currency-btn" data-currency="alt" onclick="setInitialCurrency('alt')">RD$</button>
                      </div>
                    </div>
                    <div class="initial-value">
                      <span class="initial-curr" id="initialCurrLabel">${(v.inicial_calculado || '').split(' ')[0]}</span>
                      <span class="initial-amt" id="initialAmtLabel">${(v.inicial_calculado || '').substring((v.inicial_calculado || '').indexOf(' ') + 1)}</span>
                    </div>
                  </div>

                  <!-- Thumbnail Reel -->
                  <div class="thumbs-section">
                    <div class="thumbs-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                      <span>Carrete (${photos.length})</span>
                    </div>
                    <div class="thumbs-reel">
                      ${photos.map((img, idx) => `
                        <div class="thumb-item ${idx === 0 ? 'active' : ''}" onclick="selectImage(${idx})" id="pageThumb${idx}">
                          ${idx === 0 ? '<span class="thumb-badge">Portada</span>' : ''}
                          <img src="${img}" class="thumb-img">
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
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
                      <img src="${r.imagen || logoUrl || 'https://via.placeholder.com/400x225?text=Sin+Imagen'}" style="${!r.imagen && logoUrl ? 'object-fit:contain;background:#f8fafc;padding:10%;' : ''}">
                      <h4>${r.nombre}</h4>
                      <p>${r.precio || ''}</p>
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
                // Update page thumbs
                document.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
                const pageThumb = document.getElementById('pageThumb' + index);
                if (pageThumb) pageThumb.classList.add('active');
              }

              function prevPageImg() {
                currentIndex--;
                if (currentIndex < 0) currentIndex = photos.length - 1;
                selectImage(currentIndex);
              }

              function nextPageImg() {
                currentIndex++;
                if (currentIndex >= photos.length) currentIndex = 0;
                selectImage(currentIndex);
              }

              // Currency toggle functions (visual only - the stored price is what it is)
              function setPriceCurrency(type) {
                const btns = document.querySelectorAll('#priceToggle .currency-btn');
                btns.forEach(b => b.classList.remove('active'));
                btns.forEach(b => { if (b.dataset.currency === type) b.classList.add('active'); });
              }
              function setInitialCurrency(type) {
                const btns = document.querySelectorAll('#initialToggle .currency-btn');
                btns.forEach(b => b.classList.remove('active'));
                btns.forEach(b => { if (b.dataset.currency === type) b.classList.add('active'); });
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
        console.log(`✅ [inventarioIA] Retornando HTML de MODO DETALLE, tamaño: ${html.length}`);
        return res.send(html);
      }

      console.log(`👉 [inventarioIA] Pasando a MODO LISTA (REDISEÑO TIENDA PREMIUM)`);
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
            .container { max-width: 1400px; margin: 0 auto; padding: 0 20px; }
            
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
            
            .inventory-grid { display: grid; grid-template-columns: 1fr; gap: 25px; margin-bottom: 80px; }
            @media (min-width: 640px) { .inventory-grid { grid-template-columns: repeat(2, 1fr); } }
            @media (min-width: 1024px) { .inventory-grid { grid-template-columns: repeat(3, 1fr); } }
            
            .vehicle-card { background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e8ecf1; transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; cursor: pointer; text-decoration: none; color: inherit; position: relative; }
            .vehicle-card:hover { transform: translateY(-8px) scale(1.01); box-shadow: 0 20px 40px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.06); border-color: #d1d5db; }
            
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
              <div class="container" style="text-align:center;">
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
                        <input type="hidden" id="sortFilter" value="marca">
                        <div class="select-trigger" onclick="toggleDropdown('sortSelect')">
                          <span class="trigger-text">Marca (A-Z)</span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                        <div class="options-list">
                          <div class="option selected" onclick="selectOption('sortSelect', 'marca', 'Marca (A-Z)')">Marca (A-Z)</div>
                          <div class="option" onclick="selectOption('sortSelect', 'anio', 'Año')">Año</div>
                          <div class="option" onclick="selectOption('sortSelect', 'precio', 'Precio')">Precio</div>
                          <div class="option" onclick="selectOption('sortSelect', 'recientes', 'Recientes')">Recientes</div>
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
                    ${v.imagen
          ? `<img src="${v.imagen}" class="card-img">`
          : `<img src="${logoUrl || 'https://via.placeholder.com/600x450?text=CarBot'}" class="card-img" style="object-fit:contain;background:#f8fafc;padding:12%;">`}
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
                } else if (sortField === 'marca') {
                   valA = (a.dataset.brand || '').trim().toUpperCase();
                   valB = (b.dataset.brand || '').trim().toUpperCase();
                } else { // anio
                   valA = parseInt(a.dataset.year || 0);
                   valB = parseInt(b.dataset.year || 0);
                }
                
                // sortDir: -1 means higher value first (Down Arrow = Descending??)
                // Wait: User said: "arriba es el mas nuevo o mayor y hacia abajo el menor"
                // So Arrow Up (dir: 1) -> DESC (Highest first)
                // Arrow Down (dir: -1) -> ASC (Lowest first)
                
                if (sortField === 'marca') {
                   // For strings, Dir 1 (which acts like 'DESC' for numbers) will mean A-Z here manually mapped
                   // because A-Z is usually the default. Let's make sortDir === 1 mean A-Z.
                   if (sortDir === 1) {
                     return valA.localeCompare(valB);
                   } else {
                     return valB.localeCompare(valA);
                   }
                } else {
                   if (sortDir === 1) { // Up = DESC
                     return valB - valA;
                   } else { // Down = ASC
                     return valA - valB;
                   }
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

// --- GHL OAUTH2 INTEGRATION ---
// GHL_CLIENT_ID and GHL_CLIENT_SECRET are managed as Firebase secrets

exports.ghlAuthorize = onRequest({ cors: true, secrets: [ghlClientSecret, ghlClientId, supabaseServiceKey] }, (req, res) => {
  const CLIENT_ID = ghlClientId.value();
  const dealerId = req.query.dealerId || 'default';
  const scope = "contacts.readonly contacts.write documents_contracts/list.readonly documents_contracts/sendLink.write documents_contracts_template/list.readonly documents_contracts_template/sendLink.write locations.readonly users.readonly locations/customFields.readonly locations/customFields.write";
  const REDIRECT_URI = "https://lpiwkennlavpzisdvnnh.supabase.co/functions/v1/oauth-callback";

  const authUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scope}&state=${dealerId}`;
  res.redirect(authUrl);
});

exports.ghlCallback = onRequest({ cors: true, secrets: [ghlClientSecret, ghlClientId, supabaseServiceKey] }, async (req, res) => {
  const code = req.query.code;
  const dealerId = req.query.state || 'default';
  if (!code) return res.status(400).send("Falta el código de autorización");

  const CLIENT_ID = ghlClientId.value();
  const CLIENT_SECRET = ghlClientSecret.value();
  const REDIRECT_URI = "https://lpiwkennlavpzisdvnnh.supabase.co/functions/v1/oauth-callback";

  console.log("--- GHL OAuth Diagnostic ---");
  console.log("CLIENT_ID length:", CLIENT_ID ? CLIENT_ID.length : 0);
  console.log("CLIENT_SECRET length:", CLIENT_SECRET ? CLIENT_SECRET.length : 0);
  console.log("HAS_CODE:", !!code);
  console.log("REDIRECT_URI:", REDIRECT_URI);
  console.log("DEALER_ID:", dealerId);

  try {
    const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        user_type: 'Location'
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("❌ GHL Token Exchange Failed:", data);
      throw new Error(data.error_description || data.message || "Error intercambiando token");
    }

    console.log("--- GHL Callback DATA (Token Response) ---");
    console.log(JSON.stringify(data));
    console.log("--- GHL Callback REQ QUERY ---");
    console.log(JSON.stringify(req.query));

    // Intentar extraer locationId/companyId de múltiples fuentes
    const locationId = data.locationId || data.location_id || data.companyId || req.query.locationId || req.query.location_id || req.query.companyId;
    const userId = data.userId || data.user_id || req.query.userId || req.query.user_id;

    if (!locationId) {
      console.error("❌ GHL Callback: No locationId/companyId found anywhere.");
      console.error("Keys in data:", Object.keys(data));
      console.error("Keys in query:", Object.keys(req.query));
      return res.status(400).send(`Error: No se encontró el ID de la ubicación o compañía. Recibido: ${JSON.stringify(data)}`);
    }

    console.log("✅ Conexión establecida para:", locationId, "Usuario:", userId);

    // Guardar tokens en Supabase
    const supabaseAdmin = createClient(SUPABASE_URL, supabaseServiceKey.value());
    const dealerUuid = toUuid(dealerId);
    const expiresAt = new Date(Date.now() + (data.expires_in * 1000));

    const { error: sbError } = await supabaseAdmin
      .from('dealers')
      .update({
        ghl_access_token: data.access_token,
        ghl_refresh_token: data.refresh_token,
        ghl_token_expires_at: expiresAt.toISOString(),
        ghl_location_id: locationId,
        location_id: locationId, // Also update the general location_id if it's used elsewhere
        updated_at: new Date().toISOString()
      })
      .eq('id', dealerUuid);

    if (sbError) {
      console.error("❌ Error guardando tokens en Supabase:", sbError);
      // Fallback a Firestore si falla Supabase (opcional, pero mantengamos compatibilidad por ahora)
    } else {
      console.log("✅ Tokens guardados en Supabase para:", dealerUuid);
    }

    // Función auxiliar para limpiar objetos de valores undefined para Firestore
    const cleanData = (obj) => {
      const newObj = {};
      Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined && obj[key] !== null) {
          newObj[key] = obj[key];
        }
      });
      return newObj;
    };

    // Mantener Firestore por ahora como backup o si el sistema lo requiere
    const tokenRef = admin.firestore().collection("Dealers").doc(dealerId).collection("llave_ghl").doc("config");
    await tokenRef.set(cleanData({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      expires_at: admin.firestore.Timestamp.fromDate(expiresAt),
      locationId: locationId,
      companyId: data.companyId,
      userId: userId,
      userType: data.userType,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }));

    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
        <h1 style="color: #4CAF50;">✅ ¡Conexión Exitosa con GoHighLevel!</h1>
        <p>Ya puedes cerrar esta ventana y volver al sistema.</p>
        <button onclick="window.close()" style="padding: 10px 20px; cursor: pointer;">Cerrar Ventana</button>
      </div>
    `);
  } catch (error) {
    console.error("❌ Error en GHL Callback:", error);
    res.status(500).send("Error procesando la conexión con GHL: " + error.message);
  }
});

// Helper para obtener/refrescar token
// Helper para obtener/refrescar token por Dealer (Migrado a Supabase)
async function getGHLConfig(dealerId, clientId, clientSecret, serviceKey) {
  if (!dealerId) throw new Error("Dealer ID es requerido");
  if (!clientId || !clientSecret || !serviceKey) {
    throw new Error("GHL Client ID, Secret y Supabase Service Key son requeridos");
  }

  const supabaseAdmin = createClient(SUPABASE_URL, serviceKey);

  // Intentar obtener por ID (Slug o UUID)
  const dealerUuid = toUuid(dealerId);
  console.log(`📡 Buscando Dealer en Supabase: ${dealerId} (UUID: ${dealerUuid})`);

  let { data: dealer, error } = await supabaseAdmin
    .from('dealers')
    .select('*')
    .or(`id.eq.${dealerUuid},ghl_location_id.eq.${dealerId},location_id.eq.${dealerId}`)
    .maybeSingle();

  if (error || !dealer) {
    console.warn(`⚠️ No se encontró dealer en Supabase por ID/UUID/GHL_ID: ${dealerId}. Error: ${error?.message}`);
    // Fallback: buscar por nombre si dealerId es un slug-pero-no-exacto
    const { data: dealerByName } = await supabaseAdmin
      .from('dealers')
      .select('*')
      .ilike('nombre', `%${dealerId}%`)
      .limit(1)
      .maybeSingle();

    if (dealerByName) {
      dealer = dealerByName;
    } else {
      throw new Error(`GHL no está conectado para este Dealer (${dealerId}) en Supabase`);
    }
  }

  // Normalizar nombres de columnas dinámicamente
  const tokens = {
    access_token: dealer.ghl_access_token || dealer.access_token,
    refresh_token: dealer.ghl_refresh_token || dealer.refresh_token,
    expires_at: dealer.ghl_token_expires_at || dealer.ghl_expires_at || dealer.expires_at,
    locationId: dealer.ghl_location_id || dealer.location_id
  };

  if (!tokens.access_token) {
    throw new Error(`Dealer ${dealerId} no tiene token de GHL en Supabase`);
  }

  const now = Date.now();
  const expiresAt = tokens.expires_at ? new Date(tokens.expires_at).getTime() : 0;

  // Buffer de 5 minutos para el refresh
  if (now >= (expiresAt - 300000)) {
    console.log(`🔄 Refrescando token GHL para Dealer: ${dealerId}`);
    try {
      const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token,
          user_type: tokens.userType || 'Location'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("❌ Error al refrescar token GHL:", data);
        throw new Error(data.error_description || data.message || "Error refrescando token");
      }

      const newExpiresAt = new Date(Date.now() + (data.expires_in * 1000));

      // Actualizar en Supabase
      const { error: updateError } = await supabaseAdmin
        .from('dealers')
        .update({
          ghl_access_token: data.access_token,
          ghl_refresh_token: data.refresh_token,
          ghl_token_expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', dealer.id);

      if (updateError) {
        console.error("❌ Error actualizando token en Supabase:", updateError);
      }

      console.log("✅ Token GHL refrescado y guardado en Supabase");
      return {
        access_token: data.access_token,
        locationId: tokens.locationId
      };
    } catch (err) {
      console.error("❌ Fallo el flujo de refresh GHL:", err);
      throw err;
    }
  }

  return tokens;
}

exports.ghlTemplates = onRequest({ cors: true, secrets: [ghlClientSecret, ghlClientId, supabaseServiceKey] }, async (req, res) => {
  try {
    const { ghl_access_token, locationId, dealerId } = req.query;

    let accessToken = ghl_access_token;
    let finalLocationId = locationId;

    try {
      if (dealerId) {
        const config = await getGHLConfig(dealerId, ghlClientId.value(), ghlClientSecret.value(), supabaseServiceKey.value());
        accessToken = config.access_token;
        finalLocationId = config.locationId || finalLocationId;
      }
    } catch (e) {
      console.warn("⚠️ No se pudo obtener config de GHL del backend:", e.message);
    }

    if (!accessToken || !finalLocationId) {
      return res.status(400).json({ error: "Faltan parámetros requeridos: ghl_access_token y/o locationId" });
    }

    const response = await fetch(`https://services.leadconnectorhq.com/proposals/templates?locationId=${finalLocationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Error al obtener plantillas de GHL");

    // Mapear a formato simple { id, name }
    const templates = (data.data || []).map(t => ({
      id: t._id || t.id,
      name: t.name
    }));

    return res.status(200).json(templates);
  } catch (err) {
    console.error("❌ Error fetching GHL templates:", err);
    return res.status(500).json({ error: err.message });
  }
});

// 2. Función para Enviar a GHL (Sustituye el placeholder anterior)
exports.apiGHL = onRequest({ cors: true, secrets: [ghlClientSecret, ghlClientId, supabaseServiceKey] }, async (req, res) => {
  const VERSION = "2024-03-05-v5-GOLD";
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { contactData, templateId, ghl_access_token, vehicleData, financialData, documentType, dealerId: bodyDealerId } = req.body;

    console.log(`[${VERSION}] 🟢 Inicia apiGHL. Template: ${templateId}, Dealer: ${bodyDealerId}`);

    if (!contactData || !templateId) {
      return res.status(400).json({ error: "Faltan datos de contacto o templateId" });
    }

    const { locationId, dealerId: contactDealerId } = contactData;
    const queryDealerId = req.query.dealerId;
    const dealerId = bodyDealerId || queryDealerId || contactDealerId;

    let accessToken = ghl_access_token;
    let finalLocationId = locationId;

    try {
      if (dealerId) {
        console.log(`🔍 Intentando obtener config GHL oficial para Dealer: ${dealerId}`);
        const config = await getGHLConfig(dealerId, ghlClientId.value(), ghlClientSecret.value(), supabaseServiceKey.value());
        accessToken = config.access_token;
        finalLocationId = config.locationId || finalLocationId;
        console.log("✅ Usando Token de base de datos (Backend Managed)");
      } else if (accessToken) {
        console.log("ℹ️ Usando Token proporcionado por el Frontend (Auth Pass-through)");
      }
    } catch (e) {
      console.warn("⚠️ No se pudo obtener config de GHL del backend:", e.message);
    }

    if (!finalLocationId) {
      throw new Error("No se encontró Location ID para este Dealer");
    }

    console.log(`🚀 Procesando Contacto para Location: ${finalLocationId}`);

    // 2. Upsert Contact (GHL V2)
    // Limpiar contactData de campos no permitidos por GHL V2 en el root del contacto
    const frontendCustomFields = contactData.customFields || []; // Save to extract cedula etc
    const cleanContactData = { ...contactData };
    delete cleanContactData.dealerId;
    delete cleanContactData.ghl_access_token;
    delete cleanContactData.locationId;
    delete cleanContactData.customFields; // IMPORTANT: Borramos customFields temporales del root para que no den Error 400 en GHL

    const finalPayload = { ...cleanContactData, locationId: finalLocationId };
    console.log("📤 Enviando Upsert Contact a GHL:", {
      firstName: finalPayload.firstName,
      lastName: finalPayload.lastName,
      email: finalPayload.email || 'N/A',
      phone: finalPayload.phone || 'N/A',
      locationId: finalPayload.locationId
    });

    let contactRes = await fetch(`https://services.leadconnectorhq.com/contacts/upsert`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify(finalPayload)
    });

    let contactResult = await contactRes.json();

    // Si falla por email, reintentar sin email (pero SOLO si hay otro identificador como phone)
    if (!contactRes.ok && (JSON.stringify(contactResult).toLowerCase().includes("email"))) {
      if (cleanContactData.phone) {
        console.log("⚠️ Reintentando sin email por error de validación (usando phone como backup)...");
        delete cleanContactData.email;
        const retryPayload = { ...cleanContactData, locationId: finalLocationId };
        contactRes = await fetch(`https://services.leadconnectorhq.com/contacts/upsert`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Version': '2021-07-28'
          },
          body: JSON.stringify(retryPayload)
        });
        contactResult = await contactRes.json();
      } else {
        console.warn("⚠️ Falló por email y no hay teléfono para reintentar.");
      }
    }

    if (!contactRes.ok) {
      console.error("❌ Error Upsert Contact GHL:", contactResult);
      throw new Error(contactResult.message || "Error al crear/actualizar contacto");
    }

    const contactId = contactResult.contact?.id || contactResult.id;
    if (!contactId) {
      throw new Error("No se pudo identificar el contacto en GHL");
    }
    console.log(`✅ Contacto procesado: ${contactId}`);

    // ──────────────────────────────────────────────────────────────────
    // 2.5 INYECTAR CUSTOM FIELDS AL CONTACTO (Vehicle + Financial Data)
    // ──────────────────────────────────────────────────────────────────

    const veh = vehicleData || {};
    const fin = financialData || {};

    // Obtener cedula y datos genericos pasados via customFields en el request original
    const cedulaFromFrontend = frontendCustomFields.find(cf => cf.id === 'cedula' || cf.key === 'cedula')?.value || cleanContactData.cedula || "";

    // 2.5.1 Obtener la definición de los Custom Fields de la Location desde GHL
    let remoteCustomFields = [];
    try {
      const cfRes = await fetch(`https://services.leadconnectorhq.com/locations/${finalLocationId}/customFields`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28',
          'Accept': 'application/json'
        }
      });
      if (cfRes.ok) {
        const cfData = await cfRes.json();
        remoteCustomFields = cfData.customFields || [];
        console.log(`✅ Obtenidos ${remoteCustomFields.length} Custom Fields de la Location`);
      } else {
        const errText = await cfRes.text();
        console.warn(`⚠️ No se pudieron cargar los Custom Fields de GHL. Status: ${cfRes.status}, Body: ${errText}`);
      }
    } catch (e) {
      console.warn("⚠️ Error cargando Custom Fields remotos:", e.message);
    }

    // Helper para buscar ID exactamente por el field_key (Case-insensitive y robusto)
    const findCfIdByKey = (possibleKeys) => {
      for (const k of possibleKeys) {
        const lowerK = k.toLowerCase();
        const match = remoteCustomFields.find(cf => {
          const remoteKey = (cf.fieldKey || "").replace(/^contact\./, "").replace(/^{{\s*contact\./, "").replace(/\s*}}$/, "").toLowerCase();
          return remoteKey === lowerK || cf.fieldKey.toLowerCase() === lowerK;
        });
        if (match) return match.id;
      }
      return null;
    };

    // -- HELPERS DE FORMATEO "BONITO" (Espejo del frontend) --

    // Manual comma formatter (toLocaleString no es confiable en Cloud Functions)
    const addCommas = (n) => {
      const parts = String(n).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts.join('.');
    };

    const ghlBool = (v) => {
      if (v === null || v === undefined || v === "" || v === "-") return "No";
      const s = String(v).toLowerCase().trim();
      const truthy = ["true", "si", "sí", "yes", "s", "y", "1", "es clean carfax"];
      return truthy.includes(s) ? "Sí" : "No";
    };

    const fmtCur = (monto, moneda) => {
      if (!monto) return "";
      const val = Number(String(monto).replace(/[^0-9.-]+/g, ""));
      if (isNaN(val) || val === 0) return "";
      const formatted = addCommas(Math.round(val));
      return (moneda === 'DOP' || moneda === 'RD$') ? `RD$ ${formatted} Pesos` : `US$ ${formatted} Dolares`;
    };

    const fmtMil = (m, veh) => {
      if (!m) return "";
      const val = Number(String(m).replace(/[^0-9.-]+/g, ""));
      if (isNaN(val)) return String(m);

      let suffix = 'Millas';
      if (
        String(m).toLowerCase().includes('km') ||
        (veh && veh.kilometraje) ||
        (veh && veh.mileage_unit && String(veh.mileage_unit).toUpperCase() === 'KM') ||
        (veh && veh.unit && String(veh.unit).toUpperCase() === 'KM')
      ) {
        suffix = 'Km';
      }
      return `${addCommas(Math.round(val))} ${suffix}`;
    };

    const fmtMot = (v) => {
      const parts = [];
      // 1. Cilindrada (CC / Displacement)
      const ccRaw = v.engine_cc || v.cc || "";
      if (ccRaw && ccRaw !== "-") {
        let cc = String(ccRaw).replace(/\s*[Ll]$/, "").replace(/\s*[Cc][Cc]$/, "").trim();
        // Si es un número entero (ej: "2"), agregar .0 para que quede "2.0"
        const ccNum = parseFloat(cc);
        if (!isNaN(ccNum) && !cc.includes('.')) {
          cc = ccNum.toFixed(1);
        }
        parts.push(`${cc} L`);
      }
      // 2. Cilindros
      const cylRaw = v.engine_cyl || v.cilindros || "";
      if (cylRaw && cylRaw !== "-") {
        const cyl = String(cylRaw).replace(/\s*[Cc][Ii][Ll][Ii]?[Nn]?[Dd]?[Rr]?[Oo]?[Ss]?/g, "").trim();
        parts.push(`${cyl} Cilindros`);
      }
      // 3. Tipo / Turbo
      const typeStr = String(v.engine_type || v.turbo || "").toLowerCase();
      if (typeStr.includes("turbo") || v.turbo === true || v.turbo === "Sí" || v.turbo === "si") {
        parts.push("Turbo");
      }
      return parts.join(', ');
    };

    const fmtAsi = (qty) => qty ? `${qty} Filas de asientos` : '';

    const fmtCfx = (cf) => {
      if (cf === true) return 'Es clean CarFax';
      if (cf === false || cf === null || cf === undefined || cf === '' || cf === '-') return '-';
      const s = String(cf).toLowerCase().trim();
      if (s === 'clean' || s.includes('clean carfax') || s === 'si' || s === 'sí' || s === 'true' || s === '1' || s === 'yes' || s === 'es clean carfax') return 'Es clean CarFax';
      return '-';
    };

    // Mapeo dinámico multi-cuenta: Relaciona los fieldKeys de GHL proporcionados por el usuario con el valor local
    // El primer elemento de 'keys' será usado como fallback si no se encuentra el ID en GHL
    // Helper to extract formatted values sent from frontend if available
    const getFrontendCf = (cfKey) => {
      const field = frontendCustomFields.find(cf => cf.key === cfKey || cf.id === cfKey);
      return field && field.value ? String(field.value) : "";
    };

    // ── DETECTAR MONEDA ──
    // Prioridad: financialData > vehicleData > default USD
    const monedaVenta = fin.moneda_venta || fin.monedaVenta || (veh.price_dop > 0 ? 'DOP' : 'USD');
    const monedaInicial = fin.moneda_inicial || fin.monedaInicial || monedaVenta;

    // ── OBTENER RAW NUMBERS para formateo ──
    const rawPrecio = fin.precio_venta || fin.precioFinal || veh.price || veh.precio || 0;
    const rawInicial = fin.pago_inicial || fin.pago_financiar || fin.inicial || 0;
    const rawMileage = veh.mileage || veh.kilometraje || veh.millaje || veh.millas || 0;

    console.log(`[${VERSION}] 🔢 RAW VALUES => precio: ${rawPrecio} (${monedaVenta}), inicial: ${rawInicial} (${monedaInicial}), millaje: ${rawMileage}`);
    console.log(`[${VERSION}] 🔢 FORMATTED => precio: ${fmtCur(rawPrecio, monedaVenta)}, inicial: ${fmtCur(rawInicial, monedaInicial)}, millaje: ${fmtMil(rawMileage, veh)}`);
    console.log(`[${VERSION}] 🔢 carfax raw: "${veh.carfax || veh.clean_carfax || ''}" => formatted: "${fmtCfx(veh.carfax || veh.clean_carfax)}"`);

    // 2. Prepara fallback de email para GHL Proposals (evita error 40035)
    // Si no hay email, o el contacto se creó sin email debido a validación previa,
    // inyectamos uno temporal solo para que la propuesta se pueda generar.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const finalClientEmail = (cleanContactData.email && emailRegex.test(cleanContactData.email))
      ? cleanContactData.email
      : `${cleanContactData.firstName || 'cliente'}.${Date.now()}@carbot-fallback.com`;

    if (!cleanContactData.email || !emailRegex.test(cleanContactData.email)) {
      console.log(`⚠️ Email inválido o ausente para contacto ${contactId}. Usando fallback: ${finalClientEmail}`);
      // Actualizar el contacto con el email de fallback para permitir la propuesta
      try {
        await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
          },
          body: JSON.stringify({ email: finalClientEmail })
        });
      } catch (e) {
        console.warn("⚠️ No se pudo inyectar email de fallback:", e.message);
      }
    }

    const fieldsToInject = [
      // Vehículo (Básico)
      { keys: ["marca"], value: getFrontendCf('marca') || String(veh.make || veh.marca || "").toUpperCase() },
      { keys: ["modelo"], value: getFrontendCf('modelo') || String(veh.model || veh.modelo || "").toUpperCase() },
      { keys: ["ao", "año", "ano"], value: getFrontendCf('ano') || String(veh.year || veh.ano || "") },
      { keys: ["color"], value: getFrontendCf('color') || String(veh.color || veh.exteriorColor || "").toUpperCase() },
      { keys: ["edicin", "edicion", "edicion_version"], value: getFrontendCf('edicion') || String(veh.edition || veh.edicion_version || veh.trim || veh.edicion || "").toUpperCase() },
      { keys: ["chasis", "chasis_vin", "vin"], value: getFrontendCf('chasis') || String(veh.vin || veh.chasis_vin || veh.chasis || "").toUpperCase() },

      // ⬇️ SIEMPRE usar formatter backend para estos campos (no confiar en getFrontendCf)
      { keys: ["millaje", "kilometraje"], value: fmtMil(rawMileage, veh) },
      { keys: ["tipo_de_vehculo", "tipo_vehiculo"], value: getFrontendCf('tipo') || String(veh.type || veh.bodyType || veh.tipo_vehiculo || "") },
      { keys: ["condicion"], value: getFrontendCf('condicion') || String(veh.condition || veh.condicion || "") },
      { keys: ["carfax", "clean_carfax"], value: fmtCfx(veh.carfax || veh.clean_carfax) },

      // Mecánica
      { keys: ["transmisin", "transmision"], value: getFrontendCf('transmision') || String(veh.transmission || veh.transmision || "") },
      { keys: ["traccin", "traccion"], value: getFrontendCf('traccion') || String(veh.traction || veh.drivetrain || veh.traccion || "") },
      { keys: ["tipo_de_combustible", "combustible"], value: getFrontendCf('combustible') || String(veh.fuel || veh.combustible || veh.fuelType || "") },
      { keys: ["motor"], value: fmtMot(veh) },

      // Equipamiento y Extras
      { keys: ["interior"], value: getFrontendCf('interior') || String(veh.seat_material || veh.interior || veh.interiorMaterial || "") },
      { keys: ["techo"], value: getFrontendCf('techo') || String(veh.roof_type || veh.techo || veh.roof || "") },
      { keys: ["carplay", "apple_carplay", "apple_android"], value: ghlBool(getFrontendCf('carplay') || veh.carplay || veh.appleCarplay) },
      { keys: ["camara", "camaa", "cámara", "camera"], value: ghlBool(getFrontendCf('camara') || veh.camera || veh.camara) },
      { keys: ["sensores", "sensors"], value: ghlBool(getFrontendCf('sensores') || veh.sensors || veh.sensores) },
      { keys: ["baul_electrico", "baul", "trunk", "power_trunk"], value: ghlBool(getFrontendCf('baul_electrico') || veh.trunk || veh.baul_electrico || veh.powerTrunk) },
      { keys: ["cristales_electrico", "cristales_electricos", "vidrios", "windows"], value: ghlBool(getFrontendCf('cristales_electrico') || veh.electric_windows || veh.cristales_electricos || veh.cristales_electrico || veh.vidrios_electricos || veh.powerWindows) },
      { keys: ["llave"], value: getFrontendCf('llave') || String(veh.key_type || veh.llave || "") },
      { keys: ["filas_de_asientos", "filas_asientos"], value: getFrontendCf('filas_asientos') || fmtAsi(veh.seats || veh.filas_asientos) },

      // ⬇️ Financiero: SIEMPRE usar formatter backend
      { keys: ["precio", "precio_rd", "precio_venta"], value: fmtCur(rawPrecio, monedaVenta) },
      { keys: ["inicial", "monto_a_financiar_rd", "pago_inicial"], value: fmtCur(rawInicial, monedaInicial) },
      { keys: ["banco_o_financiera", "banco", "financiera"], value: getFrontendCf('banco_o_financiera') || String(fin.banco || "").toUpperCase() },

      // Cliente Extra
      { keys: ["a_que_quien_va_dirigida", "a_quien_va_dirigida"], value: getFrontendCf('a_quien_va_dirigida') || `${cleanContactData.firstName || ''} ${cleanContactData.lastName || ''}`.trim().toUpperCase() },
      { keys: ["cdula", "cedula", "cédula"], value: getFrontendCf('cedula') || String(cedulaFromFrontend) },
      { keys: ["placa"], value: getFrontendCf('placa') || String(veh.plate || veh.placa || "").toUpperCase() },
      { keys: ["cilindros"], value: getFrontendCf('cilindros') || String(veh.cilindros || veh.engine_cyl || "") }
    ];

    // Construir el array final buscando dinámicamente los IDs en la cuenta de GHL actual (Multi-Tenant)
    const customFieldsPayload = [];

    fieldsToInject.forEach(field => {
      const ghlId = findCfIdByKey(field.keys);
      // Fallback: usar el primer elemento de keys como 'key' si no hay ID
      const fallbackKey = field.keys[0];

      if (field.value && field.value !== "undefined" && field.value !== "null" && String(field.value).trim() !== "") {
        const val = String(field.value).trim();
        if (ghlId) {
          customFieldsPayload.push({ id: ghlId, value: val });
        } else {
          // Si no tenemos ID (ej. 401 Unauthorized en fetch cf), intentamos enviar por KEY
          // Nota: Algunos endpoints de GHL aceptan key, otros solo ID. Enviamos ambos para máxima compatibilidad si es posible
          console.log(`ℹ️ Usando fallback por KEY para campo: ${fallbackKey} -> ${val}`);
          customFieldsPayload.push({ id: fallbackKey, value: val, key: fallbackKey });
        }
      }
    });

    if (customFieldsPayload.length > 0) {
      console.log(`[${VERSION}] 📝 Enviando actualización de 30 Custom Fields a GHL para contacto ${contactId}:`, JSON.stringify(customFieldsPayload, null, 2));
      try {
        const updateContactRes = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Version': '2021-07-28'
          },
          body: JSON.stringify({ customFields: customFieldsPayload })
        });
        const updateResult = await updateContactRes.json();
        if (!updateContactRes.ok) {
          console.warn("⚠️ Error actualizando Custom Fields (no-bloqueante):", updateResult);
        } else {
          console.log(`✅ Custom Fields dinámicos actualizados para contacto ${contactId}`);
        }
      } catch (cfError) {
        console.warn("⚠️ Error en actualización de Custom Fields:", cfError.message);
      }
    } else {
      console.log("ℹ️ No se agregaron Custom Fields al payload (No se encontraron IDs coincidentes en GHL o los valores están vacíos).");
    }

    // 3. Generar Documento desde Template (GHL V2 Proposals API)
    // Se requiere `userId` (quien envía el documento) y GHL rechaza el campo `name` en esta ruta.

    let assignedUserId = "GHL_USER_ID"; // placeholder
    try {
      const usersRes = await fetch(`https://services.leadconnectorhq.com/users/?locationId=${finalLocationId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28',
          'Accept': 'application/json'
        }
      });
      const usersData = await usersRes.json();
      if (usersData.users && usersData.users.length > 0) {
        assignedUserId = usersData.users[0].id;
      } else {
        console.warn("⚠️ No se encontraron usuarios válidos en GHL", usersData);
      }
    } catch (e) {
      console.warn("⚠️ Error obteniendo userId", e.message);
    }

    console.log(`📤 Enviando documento via GHL para el Location ${finalLocationId}, User: ${assignedUserId}, Contact: ${contactId}, Template: ${templateId}`);

    const docRes = await fetch(`https://services.leadconnectorhq.com/proposals/templates/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({
        templateId: templateId,
        contactId: contactId,
        locationId: finalLocationId,
        userId: assignedUserId,
        sendDocument: false // EVITA EL ENVÍO DE CORREO QUE CAUSA EL ERROR 40035
      })
    });

    const docResult = await docRes.json();
    console.log("📄 GHL docResult raw:", JSON.stringify(docResult));
    if (!docRes.ok) {
      console.error("❌ Error Generate Document GHL:", docResult);
      throw new Error(docResult.message || docResult.error || "Error al generar documento en GHL");
    }

    // ── AGREGAR ETIQUETAS AL CONTACTO ─────────────────────────────────────────
    // Tags: marca del vehículo + acción (cotizó / compró)
    try {
      const veh = vehicleData || {};
      const make = (veh.make || veh.marca || '').trim().toUpperCase();
      const isQuote = documentType === 'cotizacion';
      // Add both variants for compatibility (cotizó/cotizado, compró/vendido)
      const tagsToAdd = isQuote ? ['cotizó', 'cotizado'] : ['compró', 'vendido'];
      if (make) tagsToAdd.push(make);

      await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Version: '2021-07-28',
        },
        body: JSON.stringify({ tags: tagsToAdd }),
      });
      console.log(`🏷️ Tags añadidos al contacto ${contactId}:`, tagsToAdd);
    } catch (tagErr) {
      // Non-fatal: log but don't fail the response
      console.warn('[apiGHL] Error añadiendo tags:', tagErr.message);
    }

    // GHL returns { document: { _id, ... } }
    const docId = (docResult.document && (docResult.document._id || docResult.document.id || docResult.document.documentId))
      || (docResult.links && docResult.links[0] && docResult.links[0].documentId)
      || docResult.documentId
      || docResult.id
      || null;

    const previewUrl = docId
      ? `https://app.iagil.ai/v2/location/${finalLocationId}/payments/proposals-estimates/edit/preview/${docId}?locale=es`
      : (docResult.url || docResult.documentUrl || `https://app.gohighlevel.com/v2/location/${finalLocationId}/contacts/detail/${contactId}`);

    console.log(`📎 Document URL generado: ${previewUrl} (docId: ${docId})`);

    res.json({
      documentUrl: previewUrl,
      status: "ok",
      ghlDocumentId: docId
    });

  } catch (error) {
    console.error("❌ Fallo crítico en apiGHL:", {
      message: error.message,
      stack: error.stack,
      ghlResponse: error.response?.data || 'N/A'
    });
    res.status(500).json({
      error: error.message,
      details: error.response?.data || null
    });
  }
});

// ── Contacts API ─────────────────────────────────────────────────────────────
exports.ghlContacts = onRequest({ cors: true, secrets: [ghlClientSecret, ghlClientId, supabaseServiceKey] }, async (req, res) => {
  const GHL_BASE = 'https://services.leadconnectorhq.com';

  // Webhook receiver: POST ?webhook=1
  if (req.method === 'POST' && req.query.webhook) {
    const locationId = req.body?.locationId || req.body?.location_id;
    if (locationId) {
      try {
        const supa = createClient(SUPABASE_URL, supabaseServiceKey.value());
        await supa.from('dealers').update({ updated_at: new Date().toISOString() }).eq('ghl_location_id', locationId);
      } catch (_) {}
    }
    return res.status(200).json({ received: true });
  }

  const { dealerId, contactId, limit = '100', startAfterId, query: searchQuery } = req.query;
  if (!dealerId) return res.status(400).json({ error: 'dealerId es requerido' });

  try {
    const { access_token, locationId } = await getGHLConfig(dealerId, ghlClientId.value(), ghlClientSecret.value(), supabaseServiceKey.value());
    const headers = {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      Version: '2021-07-28',
    };

    if (req.method === 'GET') {
      // Fetch custom field schema once to annotate contacts (maps UUID id → readable fieldKey)
      let cfSchema = {}; // id → normalized key (e.g. "cedula", "placa")
      try {
        const cfRes = await fetch(`${GHL_BASE}/locations/${locationId}/customFields`, { headers });
        if (cfRes.ok) {
          const cfData = await cfRes.json();
          console.log('[ghlContacts] Custom field schema:', JSON.stringify((cfData.customFields || []).map(cf => ({ id: cf.id, fieldKey: cf.fieldKey, name: cf.name }))));
          (cfData.customFields || []).forEach(cf => {
            if (cf.id) {
              // Normalize fieldKey: strip "contact." prefix and braces
              const fromKey = (cf.fieldKey || '').replace(/^\{\{?\s*contact\.\s*/i, '').replace(/\s*\}?\}?$/, '').toLowerCase().trim();
              // Also normalize name: remove accents, lowercase
              const fromName = (cf.name || '').toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
                .replace(/[^a-z0-9_]/g, '_').trim();
              // Use fieldKey if available, fall back to normalized name
              cfSchema[cf.id] = fromKey || fromName;
            }
          });
        }
      } catch (_) {}

      // Helper to annotate a contact's customFields with readable key
      const annotateContact = (contact) => {
        if (!contact || !contact.customFields) return contact;
        return {
          ...contact,
          customFields: contact.customFields.map(cf => ({
            ...cf,
            fieldKey: cfSchema[cf.id] || cf.fieldKey || cf.id || '',
          }))
        };
      };

      if (contactId) {
        const r = await fetch(`${GHL_BASE}/contacts/${contactId}`, { headers });
        if (!r.ok) return res.status(r.status).json(await r.json());
        const data = await r.json();
        return res.json(annotateContact(data.contact || data));
      }
      const params = new URLSearchParams({ locationId, limit });
      if (startAfterId) params.set('startAfterId', startAfterId);
      if (searchQuery) params.set('query', searchQuery);
      const r = await fetch(`${GHL_BASE}/contacts/?${params}`, { headers });
      if (!r.ok) return res.status(r.status).json(await r.json());
      const data = await r.json();
      const contacts = (data.contacts || []).map(annotateContact);
      return res.json({ ...data, contacts });
    }

    if (req.method === 'PUT') {
      if (!contactId) return res.status(400).json({ error: 'contactId requerido' });
      const r = await fetch(`${GHL_BASE}/contacts/${contactId}`, { method: 'PUT', headers, body: JSON.stringify(req.body) });
      return res.status(r.status).json(await r.json());
    }

    if (req.method === 'DELETE') {
      if (!contactId) return res.status(400).json({ error: 'contactId requerido' });
      const r = await fetch(`${GHL_BASE}/contacts/${contactId}`, { method: 'DELETE', headers });
      return res.status(r.status).json({ ok: r.ok });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('[ghlContacts] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// X. Función de Depuración (Para el desarrollador)
exports.debugInfo = onRequest({ cors: true }, async (req, res) => {
  try {
    const userSnap = await db.collection("users").doc("janilfernandez@hotmail_com").get();
    const userData = userSnap.exists ? userSnap.data() : "NO EXISTE";

    const collections = await db.listCollections();
    const results = [];

    for (const coll of collections) {
      const snap = await coll.limit(5).get(); // Limit reduced for speed
      const docs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
      results.push({
        id: coll.id,
        count: snap.size,
        docs: docs
      });
    }

    const vehiclesSnap = await db.collection("vehicles").limit(10).get();
    const dealerIdsInVehicles = new Set();
    vehiclesSnap.forEach(doc => {
      const data = doc.data();
      if (data.dealerId) dealerIdsInVehicles.add(data.dealerId);
      if (data.dealerID) dealerIdsInVehicles.add(data.dealerID);
      if (data.locationId) dealerIdsInVehicles.add(data.locationId);
    });

    return res.json({
      project: process.env.GCLOUD_PROJECT,
      collections: results,
      dealerIdsFoundInVehicles: Array.from(dealerIdsInVehicles),
      userSample: userData,
      status: "debug_active"
    });
  } catch (error) {
    console.error("❌ Error en debugInfo:", error);
    res.status(500).send(error.message);
  }
});

// Y. Función de Depuración de Usuarios
exports.debugUsers = onRequest({ cors: true }, async (req, res) => {
  console.log("--- debugUsers Request ---");
  console.log("Method:", req.method);
  console.log("Headers:", JSON.stringify(req.headers));
  console.log("Query:", JSON.stringify(req.query));
  console.log("Body:", JSON.stringify(req.body));

  try {
    const email = req.query.email || req.body.email;
    const userId = req.query.id || req.body.id || req.query.userId || req.body.userId;
    const userEmail = req.query.userEmail || req.body.userEmail;

    const finalEmail = email || userEmail;

    // 1. Intentar búsqueda específica si se provee ID o Email
    if (finalEmail || userId) {
      console.log("🔍 Buscando usuario específico:", { finalEmail, userId });

      // Búsqueda en collectionGroup para mayor alcance
      let userDoc = null;
      if (userId) {
        // userId podría ser el ID del documento en la subcolección
        const snap = await db.collectionGroup("usuarios").get();
        userDoc = snap.docs.find(d => d.id === userId);
      } else if (finalEmail) {
        const snap = await db.collectionGroup("usuarios").where("email", "==", finalEmail.toLowerCase()).limit(1).get();
        userDoc = snap.empty ? null : snap.docs[0];
      }

      if (userDoc) {
        const data = userDoc.data();
        const response = {
          id: userDoc.id,
          name: data.name || data.displayName || data.email?.split('@')[0] || "Usuario",
          email: data.email
        };
        console.log("✅ Usuario encontrado:", JSON.stringify(response));
        return res.json(response);
      }
    }

    // 2. Obtener todos los usuarios vía collectionGroup
    const usersSnap = await db.collectionGroup("usuarios").limit(50).get();
    let users = usersSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || data.displayName || data.email?.split('@')[0] || "Usuario",
        email: data.email,
        dealerId: doc.ref.parent.parent ? doc.ref.parent.parent.id : 'unknown'
      };
    });

    // 3. FALLBACK PARA TEST DE MARKETPLACE:
    // Si no hay usuarios, devolvemos uno de prueba para que GHL pueda mapear los campos
    if (users.length === 0) {
      console.log("⚠️ No se encontraron usuarios reales. Enviando usuario de prueba para el handshake de GHL.");
      users = [{
        id: "test-user-ghl",
        name: "Usuario de Prueba Carbot",
        email: "soporte@carbot.com",
        dealerId: "TEST-DEALER"
      }];
    }

    // 3. RESPUESTA PARA GHL (REQUERIDA PLANA Y RÁPIDA)
    // El Marketplace de GHL requiere un JSON plano y sin caracteres basura al final para el handshake inicial.
    const finalUser = (users && users.length > 0) ? users[0] : {
      id: "carbot-master-id",
      name: "Jean C. Gomez",
      email: "soporte@carbot.com"
    };

    // Preparamos payload completo para asegurar compatibilidad con todos los mapeos posibles
    const responsePayload = {
      id: finalUser.id,
      name: finalUser.name,
      email: finalUser.email,
      count: users.length,
      users: users
    };

    console.log(`✅ Enviando JSON final a GHL (Size: ${JSON.stringify(responsePayload).length} bytes):`, JSON.stringify(responsePayload));

    // Usamos res.json() que maneja automáticamente Content-Type: application/json
    // y la terminación correcta del stream.
    return res.json(responsePayload);

  } catch (error) {
    console.error("❌ Error en debugUsers:", error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Z. Shims para Proveedor OAuth2 (Handshake con GHL External Authentication)
exports.ghlAuth = onRequest({ cors: true }, (req, res) => {
  const { redirect_uri, state } = req.query;
  console.log("--- ghlAuth (Provider Shim) ---");
  console.log("Redirect URI:", redirect_uri);

  if (!redirect_uri) {
    return res.status(400).send("Falta redirect_uri");
  }

  // Generamos un código falso para el handshake
  const mockCode = "carbot-handshake-" + Math.random().toString(36).substring(7);
  const separator = redirect_uri.includes('?') ? '&' : '?';
  const targetUrl = `${redirect_uri}${separator}code=${mockCode}&state=${state || ''}`;

  console.log("✅ Redirigiendo a GHL con mock code:", targetUrl);
  res.redirect(targetUrl);
});

exports.ghlToken = onRequest({ cors: true }, (req, res) => {
  console.log("--- ghlToken (Provider Shim) ---");
  console.log("Method:", req.method);
  console.log("Body:", JSON.stringify(req.body));

  // GHL espera un access_token para poder llamar a debugUsers después
  const mockToken = {
    access_token: "carbot-token-" + Math.random().toString(36).substring(7),
    token_type: "Bearer",
    expires_in: 3600
  };

  console.log("✅ Enviando mock token a GHL");
  res.json(mockToken);
});

// AA. Función para forzar la creación de dealers básicos
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



exports.testSecrets = require('./test_secrets').testSecrets;
