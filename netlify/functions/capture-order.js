// Completes (captures) a PayPal order after the shopper approves it,
// and returns a summary for the order confirmation page.
const { apiBase, json, getAccessToken } = require("../lib/paypal");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let orderID;
  try {
    orderID = JSON.parse(event.body || "{}").orderID;
  } catch {
    return json(400, { error: "Invalid request." });
  }
  if (typeof orderID !== "string" || !/^[A-Z0-9]{5,40}$/.test(orderID)) {
    return json(400, { error: "Invalid order." });
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${apiBase()}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        "PayPal-Request-Id": `capture-${orderID}`,
      },
    });
    const data = await res.json();

    if (!res.ok) {
      const issue = data && data.details && data.details[0] && data.details[0].issue;
      console.error("PayPal capture failed", res.status, JSON.stringify(data));
      if (issue === "INSTRUMENT_DECLINED") {
        // The browser restarts checkout so the shopper can pick another payment method.
        return json(422, { error: "Your payment method was declined.", issue });
      }
      if (issue === "ORDER_ALREADY_CAPTURED") {
        return json(409, { error: "This order has already been paid.", issue });
      }
      return json(502, { error: "We couldn't complete your payment. You have not been charged." });
    }

    const unit = (data.purchase_units && data.purchase_units[0]) || {};
    const capture = unit.payments && unit.payments.captures && unit.payments.captures[0];
    const addr = (unit.shipping && unit.shipping.address) || {};

    return json(200, {
      orderId: data.id,
      invoiceId: unit.invoice_id || null,
      status: data.status,
      captureStatus: capture ? capture.status : null,
      date: capture ? capture.create_time : new Date().toISOString(),
      payer: {
        name: [data.payer?.name?.given_name, data.payer?.name?.surname].filter(Boolean).join(" "),
        email: data.payer?.email_address || "",
      },
      shipping: {
        name: unit.shipping?.name?.full_name || "",
        lines: [
          addr.address_line_1,
          addr.address_line_2,
          [addr.admin_area_2, addr.admin_area_1, addr.postal_code].filter(Boolean).join(", "),
          addr.country_code,
        ].filter(Boolean),
      },
      items: (unit.items || []).map((i) => ({
        name: i.name,
        description: i.description || "",
        quantity: Number(i.quantity),
        unitPrice: i.unit_amount?.value,
      })),
      amounts: {
        currency: unit.amount?.currency_code || "USD",
        itemTotal: unit.amount?.breakdown?.item_total?.value || unit.amount?.value,
        shipping: unit.amount?.breakdown?.shipping?.value || "0.00",
        total: unit.amount?.value,
      },
    });
  } catch (err) {
    console.error("capture-order error", err);
    return json(500, { error: "We couldn't confirm your payment. Please contact us before trying again." });
  }
};
