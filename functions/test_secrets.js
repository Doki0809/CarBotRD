const { defineSecret } = require("firebase-functions/params");
const { onRequest } = require("firebase-functions/v2/https");
const ghlClientSecret = defineSecret("GHL_CLIENT_SECRET");
const ghlClientId = defineSecret("GHL_CLIENT_ID");

exports.testSecrets = onRequest({ cors: true, secrets: [ghlClientSecret, ghlClientId] }, (req, res) => {
  res.json({
    idLength: ghlClientId.value() ? ghlClientId.value().length : 0,
    secretLength: ghlClientSecret.value() ? ghlClientSecret.value().length : 0,
    idPreview: ghlClientId.value() ? ghlClientId.value().substring(0, 5) : 'none'
  });
});
