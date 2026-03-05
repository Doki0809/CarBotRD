const fs = require('fs');
let code = fs.readFileSync('functions/index.js', 'utf8');

const target1 = `    // 3. Generar Documento desde Template (GHL V2 Proposals API)
    const docRes = await fetch(\`https://services.leadconnectorhq.com/proposals/templates/send\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${accessToken}\`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({
        templateId: templateId,
        contactId: contactId,
        locationId: finalLocationId,
        name: \`Contrato - \${contactData.firstName || 'Cliente'} \${contactData.lastName || ''}\`
      })
    });`;

const replacement1 = `    // 2.5 Obtener un userId de GHL (requerido para evaluar variables en V2)
    let ghlUserId = null;
    try {
      const usersRes = await fetch(\`https://services.leadconnectorhq.com/users/?locationId=\${finalLocationId}\`, {
        headers: {
          'Authorization': \`Bearer \${accessToken}\`,
          'Version': '2021-07-28',
          'Accept': 'application/json'
        }
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        // Tomar el primer usuario válido de la localidad
        ghlUserId = (usersData.users && usersData.users.length > 0) ? usersData.users[0].id : null;
      }
    } catch (e) {
      console.warn("⚠️ No se pudo obtener usuarios para location", finalLocationId, e.message);
    }

    if (!ghlUserId) {
      console.warn("⚠️ Advertencia: No se encontró userId. El documento se generará sin asignar a un usuario (las variables podrían quedar vacías).");
    }

    // 3. Generar Documento desde Template (GHL V2 Proposals API)
    const payloadDoc = {
      templateId: templateId,
      contactId: contactId,
      locationId: finalLocationId,
      sendDocument: false // Generar en draft (no enviar email)
    };
    
    if (ghlUserId) {
      payloadDoc.userId = ghlUserId;
    }

    const docRes = await fetch(\`https://services.leadconnectorhq.com/proposals/templates/send\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${accessToken}\`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify(payloadDoc)
    });`;


const target2 = `    res.json({
      documentUrl: docResult.url || docResult.documentUrl || (docResult.document && docResult.document.url) || \`https://app.gohighlevel.com/v2/location/\${finalLocationId}/contacts/detail/\${contactId}\`,
      status: "ok",
      ghlDocumentId: docResult.id || (docResult.document && docResult.document.id)
    });`;

const replacement2 = `    // GHL V2 proposals/templates/send devuelve el documento en docResult.document._id cuando sendDocument es false
    const actualDocId = docResult.document?._id || (docResult.links && docResult.links[0]?.documentId) || docResult.id || (docResult.document && docResult.document.id);

    res.json({
      documentUrl: \`https://app.gohighlevel.com/v2/location/\${finalLocationId}/documents/document/\${actualDocId}\`,
      status: "ok",
      ghlDocumentId: actualDocId
    });`;

if (code.includes(target1)) {
  code = code.replace(target1, replacement1);
  console.log("target1 replaced");
} else {
  console.log("target1 NOT found");
}

if (code.includes(target2)) {
  code = code.replace(target2, replacement2);
  console.log("target2 replaced");
} else {
  console.log("target2 NOT found");
}

fs.writeFileSync('functions/index.js', code, 'utf8');
console.log("Done");
