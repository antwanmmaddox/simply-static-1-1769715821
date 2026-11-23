// Creates a PayPal order from the shopper's cart.
// Every price is looked up on the server so the browser can't change what is charged.
const { catalog, apiBase, json, getAccessToken, buildPurchaseUnit, CartError } = require("../lib/paypal");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid request." });
  }

  let purchaseUnit;
  try {
    purchaseUnit = buildPurchaseUnit(body.items);
  } catch (err) {
    if (err instanceof CartError) return json(400, { error: err.message });
    throw err;
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${apiBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": purchaseUnit.invoice_id,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [purchaseUnit],
        application_context: {
          brand_name: catalog.seller,
          shipping_preference: "GET_FROM_FILE",
          user_action: "PAY_NOW",
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("PayPal create order failed", res.status, JSON.stringify(data));
      return json(502, { error: "We couldn't start checkout with PayPal. Please try again." });
    }
    return json(200, { id: data.id });
  } catch (err) {
    console.error("create-order error", err);
    return json(500, { error: "Checkout is temporarily unavailable. Please try again shortly." });
  }
};
