// Shared helpers for the PayPal Netlify Functions.
// Prices ALWAYS come from shop/products.json on the server, never from the browser.

const catalog = require("../../shop/products.json");

const API_BASE = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
};

function paypalEnv() {
  return (process.env.PAYPAL_ENV || "sandbox").toLowerCase() === "live" ? "live" : "sandbox";
}

function apiBase() {
  return API_BASE[paypalEnv()];
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

async function getAccessToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PayPal credentials are not configured on the server.");
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`);
  const data = await res.json();
  return data.access_token;
}

// Money helpers work in cents to avoid floating-point errors.
const toCents = (v) => Math.round(parseFloat(v) * 100);
const fromCents = (c) => (c / 100).toFixed(2);

class CartError extends Error {}

// Validate the cart sent by the browser and build a PayPal purchase unit.
function buildPurchaseUnit(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new CartError("Your cart is empty.");
  if (rawItems.length > 50) throw new CartError("Too many items in cart.");

  const max = catalog.maxQuantityPerLine || 25;
  const items = [];
  let itemTotal = 0;

  for (const raw of rawItems) {
    const product = catalog.products.find((p) => p.id === (raw && raw.id));
    if (!product) throw new CartError("One of the items in your cart is no longer available.");
    if (!product.available) throw new CartError(`${product.name} is not available yet.`);

    const qty = Number(raw.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > max) {
      throw new CartError(`Please choose a quantity between 1 and ${max} for ${product.name}.`);
    }

    const chosen = (raw && typeof raw.options === "object" && raw.options) || {};
    const parts = [];
    for (const opt of product.options || []) {
      const val = chosen[opt.name];
      if (!opt.values.includes(val)) throw new CartError(`Please choose a ${opt.name.toLowerCase()} for ${product.name}.`);
      parts.push(`${opt.name}: ${val}`);
    }

    const unit = toCents(product.price);
    itemTotal += unit * qty;
    const optionText = parts.join(", ");
    items.push({
      name: product.name.slice(0, 127),
      description: (optionText || product.description || "").slice(0, 127),
      sku: (product.sku + (parts.length ? "-" + parts.map((p) => p.split(": ")[1]).join("-") : "")).slice(0, 127),
      unit_amount: { currency_code: catalog.currency, value: fromCents(unit) },
      quantity: String(qty),
      category: "PHYSICAL_GOODS",
    });
  }

  const shipping = toCents(catalog.shippingCost || "0");
  const total = itemTotal + shipping;
  const invoiceId = "TE-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

  return {
    invoice_id: invoiceId,
    description: `Order from ${catalog.seller}`.slice(0, 127),
    amount: {
      currency_code: catalog.currency,
      value: fromCents(total),
      breakdown: {
        item_total: { currency_code: catalog.currency, value: fromCents(itemTotal) },
        shipping: { currency_code: catalog.currency, value: fromCents(shipping) },
      },
    },
    items,
  };
}

module.exports = { catalog, paypalEnv, apiBase, json, getAccessToken, buildPurchaseUnit, CartError };
