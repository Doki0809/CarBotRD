const fs = require('fs');
const file = 'functions/index.js';
let content = fs.readFileSync(file, 'utf8');

const oldLines = `        "FOTOS Y DETALLES:": v.has_images && v.link_catalogo ? \`aqui puedes ver las fotos: \${v.link_catalogo}\` : "No tengo las fotos en este momento, un compañero te ayudará",`;

const dealerSlugLine = `      const dealerSlugForLinks = slugify(dealerName);`;

// We need dealerSlugForLinks inside the map.
// Let's move dealerSlugForLinks before the map.

content = content.replace(
  `    if (req.query.format === 'json') {
      const sortedForJson = [...inventory].sort((a, b) => (a.marca || "").localeCompare(b.marca || ""));`,
  `    if (req.query.format === 'json') {
      const dealerSlugForLinks = slugify(dealerName);
      const catalogoUrl = \`https://carbotsystem.com/inventario/\${dealerSlugForLinks}/catalogo\`;
      const sortedForJson = [...inventory].sort((a, b) => (a.marca || "").localeCompare(b.marca || ""));`
);

content = content.replace(
  `        "FOTOS Y DETALLES:": v.has_images && v.link_catalogo ? \`aqui puedes ver las fotos: \${v.link_catalogo}\` : "No tengo las fotos en este momento, un compañero te ayudará",`,
  `        "FOTOS Y DETALLES:": v.has_images && v.link_catalogo ? \`aqui puedes ver las fotos: \${v.link_catalogo} y el catalogo: Mira este es nuestro catalogo actual, puedes ver y decirme cual te interesa: \${catalogoUrl}\` : "No tengo las fotos en este momento, un compañero te ayudará",`
);

content = content.replace(
  `      const dealerSlugForLinks = slugify(dealerName);
      return res.status(200).json({
        dealer: dealerName,
        total: flatInventory.length,
        link_catalogo: \`Mira este es nuestro catalogo actual, puedes ver y decirme cual te interesa: https://carbotsystem.com/inventario/\${dealerSlugForLinks}/catalogo\`,
        vehiculos: flatInventory
      });`,
  `      return res.status(200).json({
        dealer: dealerName,
        total: flatInventory.length,
        link_catalogo: catalogoUrl,
        vehiculos: flatInventory
      });`
);

fs.writeFileSync(file, content);
console.log('Done!');
