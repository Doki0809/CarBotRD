const fs = require('fs');
let code = fs.readFileSync('functions/index.js', 'utf8');

const regexPayload = /const docRes = await fetch\(\`https:\/\/services\.leadconnectorhq\.com\/proposals\/templates\/send\`, \{\r?\n\s*method: 'POST',\r?\n\s*headers: \{\r?\n\s*'Authorization': \`Bearer \$\{accessToken\}\`,\r?\n\s*'Content-Type': 'application\/json',\r?\n\s*'Accept': 'application\/json',\r?\n\s*'Version': '2021-07-28'\r?\n\s*\},\r?\n\s*body: JSON\.stringify\(\{\r?\n\s*templateId: templateId,\r?\n\s*contactId: contactId,\r?\n\s*locationId: finalLocationId,\r?\n\s*name: \`Contrato - \$\{contactData\.firstName \|\| 'Cliente'\} \$\{contactData\.lastName \|\| ''\}\`\r?\n\s*\}\)\r?\n\s*\}\);/g;

const replacementPayload = `    // 2.5 Obtener un userId de GHL (requerido para evaluar variables en V2)
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

if (regexPayload.test(code)) {
   code = code.replace(regexPayload, replacementPayload);
   console.log("PAYLOAD REPLACED");
} else {
   console.log("PAYLOAD NOT FOUND");
}

const regexResponse = /res\.json\(\{\r?\n\s*documentUrl: docResult\.url \|\| docResult\.documentUrl \|\| \(docResult\.document && docResult\.document\.url\) \|\| \`https:\/\/app\.gohighlevel\.com\/v2\/location\/\$\{finalLocationId\}\/contacts\/detail\/\$\{contactId\}\`,\r?\n\s*status: "ok",\r?\n\s*ghlDocumentId: docResult\.id \|\| \(docResult\.document && docResult\.document\.id\)\r?\n\s*\}\);/g;

const replacementResponse = `    // GHL V2 proposals/templates/send devuelve el documento en docResult.document._id cuando sendDocument es false
    const actualDocId = docResult.document?._id || (docResult.links && docResult.links[0]?.documentId) || docResult.id || (docResult.document && docResult.document.id);

    res.json({
      documentUrl: \`https://app.gohighlevel.com/v2/location/\${finalLocationId}/documents/document/\${actualDocId}\`,
      status: "ok",
      ghlDocumentId: actualDocId
    });`;

if (regexResponse.test(code)) {
    code = code.replace(regexResponse, replacementResponse);
    console.log("RESPONSE REPLACED");
} else {
    console.log("RESPONSE NOT FOUND");
}

fs.writeFileSync('functions/index.js', code, 'utf8');
