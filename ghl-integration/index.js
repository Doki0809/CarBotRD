const { onRequest } = require("firebase-functions/v2/https");
exports.enviarContratoAGHL = onRequest({ cors: true }, async (req, res) => {
  res.json({ status: "ok" });
});
