// Gives the browser the PUBLIC PayPal client ID so it can load the PayPal buttons.
// The client secret never leaves the server.
const { catalog, paypalEnv, json } = require("../lib/paypal");

exports.handler = async () => {
  if (!process.env.PAYPAL_CLIENT_ID) {
    return json(500, { error: "PayPal is not configured yet." });
  }
  return json(200, {
    clientId: process.env.PAYPAL_CLIENT_ID,
    env: paypalEnv(),
    currency: catalog.currency,
  });
};
