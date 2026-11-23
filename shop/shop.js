/*
 * Teresa Edwards shop — custom cart + native PayPal checkout.
 * Replaces Snipcart. Works with:
 *   [data-te-product="<id>"]   product purchase widget (options, quantity, Add to Cart, Buy Now)
 *   [data-te-cart-open]        any button that opens the cart
 *   .te-cart-count             any element that shows the number of items in the cart
 *   [data-te-confirmation]     order confirmation page container
 * Prices shown here are for display only; the server re-prices every order from shop/products.json.
 */
(function () {
  "use strict";

  var CART_KEY = "te_cart_v1";
  var ORDER_KEY = "te_last_order";
  var FN = "/.netlify/functions/";

  var catalog = null;
  var cart = [];
  var lastFocus = null;
  var els = {};
  var sdkPromise = null;
  var cartButtonsRendered = false;

  /* ---------- small helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(v) {
    var n = typeof v === "number" ? v : parseFloat(v || 0);
    return new Intl.NumberFormat("en-US", { style: "currency", currency: (catalog && catalog.currency) || "USD" }).format(n);
  }
  function cents(v) { return Math.round(parseFloat(v) * 100); }
  function product(id) {
    return catalog && catalog.products.filter(function (p) { return p.id === id; })[0];
  }
  function storageGet(store, key) {
    try { return JSON.parse(store.getItem(key)); } catch (e) { return null; }
  }
  function storageSet(store, key, val) {
    try { store.setItem(key, JSON.stringify(val)); } catch (e) { /* storage blocked: cart lives in memory */ }
  }
  function lineKey(id, options) {
    var keys = Object.keys(options || {}).sort();
    return id + "|" + keys.map(function (k) { return k + "=" + options[k]; }).join("&");
  }
  function optionText(options) {
    return Object.keys(options || {}).map(function (k) { return k + ": " + options[k]; }).join(" · ");
  }
  function announce(msg) {
    if (!els.live) return;
    els.live.textContent = "";
    setTimeout(function () { els.live.textContent = msg; }, 30);
  }

  function api(name, body) {
    return fetch(FN + name, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }

  /* ---------- cart state ---------- */
  function loadCart() {
    var saved = storageGet(localStorage, CART_KEY);
    cart = Array.isArray(saved) ? saved : [];
    // Drop anything that no longer exists or isn't for sale.
    cart = cart.filter(function (l) {
      var p = product(l.id);
      return p && p.available && l.quantity > 0;
    });
  }
  function saveCart() {
    storageSet(localStorage, CART_KEY, cart);
    renderCart();
  }
  function cartCount() {
    return cart.reduce(function (n, l) { return n + l.quantity; }, 0);
  }
  function cartSubtotalCents() {
    return cart.reduce(function (sum, l) { return sum + cents(product(l.id).price) * l.quantity; }, 0);
  }
  function addToCart(id, options, qty) {
    var max = catalog.maxQuantityPerLine || 25;
    var key = lineKey(id, options);
    var line = cart.filter(function (l) { return l.key === key; })[0];
    if (line) line.quantity = Math.min(max, line.quantity + qty);
    else cart.push({ key: key, id: id, options: options, quantity: Math.min(max, qty) });
    saveCart();
  }
  function setQty(key, qty) {
    var max = catalog.maxQuantityPerLine || 25;
    cart = cart.map(function (l) {
      if (l.key === key) l.quantity = Math.max(0, Math.min(max, qty));
      return l;
    }).filter(function (l) { return l.quantity > 0; });
    saveCart();
  }
  function itemsForServer(lines) {
    return lines.map(function (l) { return { id: l.id, options: l.options, quantity: l.quantity }; });
  }

  /* ---------- cart drawer ---------- */
  function buildDrawer() {
    var wrap = document.createElement("div");
    wrap.className = "te-shop-root";
    wrap.innerHTML =
      '<div class="te-cart-overlay" data-te-cart-close hidden></div>' +
      '<aside class="te-cart" id="te-cart" role="dialog" aria-modal="true" aria-labelledby="te-cart-title" aria-hidden="true" tabindex="-1">' +
        '<header class="te-cart__header">' +
          '<h2 id="te-cart-title" class="te-cart__title">Your Cart</h2>' +
          '<button type="button" class="te-cart__close" data-te-cart-close aria-label="Close cart">&times;</button>' +
        '</header>' +
        '<div class="te-cart__body"></div>' +
        '<footer class="te-cart__footer">' +
          '<dl class="te-cart__totals">' +
            '<div><dt>Subtotal</dt><dd class="te-cart__subtotal"></dd></div>' +
            '<div><dt>Shipping</dt><dd>Free</dd></div>' +
            '<div class="te-cart__grand"><dt>Total</dt><dd class="te-cart__total"></dd></div>' +
          '</dl>' +
          '<p class="te-msg te-cart__msg" role="alert"></p>' +
          '<div class="te-cart__paypal" id="te-cart-paypal"><p class="te-loading">Loading secure checkout…</p></div>' +
          '<p class="te-cart__note">Secure checkout by PayPal. Pay with your PayPal account or a debit/credit card. Shipping is free.</p>' +
        '</footer>' +
      '</aside>' +
      '<div class="te-sr-only" aria-live="polite" role="status"></div>';
    document.body.appendChild(wrap);

    els.overlay = wrap.querySelector(".te-cart-overlay");
    els.drawer = wrap.querySelector(".te-cart");
    els.body = wrap.querySelector(".te-cart__body");
    els.footer = wrap.querySelector(".te-cart__footer");
    els.subtotal = wrap.querySelector(".te-cart__subtotal");
    els.total = wrap.querySelector(".te-cart__total");
    els.msg = wrap.querySelector(".te-cart__msg");
    els.live = wrap.querySelector("[aria-live]");

    wrap.addEventListener("click", function (e) {
      if (e.target.closest("[data-te-cart-close]")) closeCart();
      var btn = e.target.closest("[data-te-line]");
      if (!btn) return;
      var key = btn.getAttribute("data-te-line");
      var line = cart.filter(function (l) { return l.key === key; })[0];
      if (!line) return;
      var act = btn.getAttribute("data-te-act");
      if (act === "inc") setQty(key, line.quantity + 1);
      if (act === "dec") setQty(key, line.quantity - 1);
      if (act === "remove") { setQty(key, 0); announce("Item removed from cart"); }
    });
    wrap.addEventListener("change", function (e) {
      var input = e.target.closest("input[data-te-line]");
      if (!input) return;
      var v = parseInt(input.value, 10);
      setQty(input.getAttribute("data-te-line"), isNaN(v) ? 1 : v);
    });
    els.drawer.addEventListener("keydown", trapFocus);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) closeCart();
    });
  }

  function renderCart() {
    var count = cartCount();
    document.querySelectorAll(".te-cart-count").forEach(function (el) {
      el.textContent = count ? String(count) : "";
      el.hidden = !count;
    });
    document.querySelectorAll("[data-te-cart-open]").forEach(function (el) {
      el.setAttribute("aria-label", "Cart, " + count + (count === 1 ? " item" : " items"));
    });
    document.querySelectorAll(".te-cart-fab").forEach(function (el) { el.hidden = !count; });
    if (!els.body) return;

    if (!cart.length) {
      els.body.innerHTML =
        '<div class="te-cart__empty"><p>Your cart is empty.</p>' +
        '<a class="te-btn te-btn--ghost" href="/#Products" data-te-cart-close>Shop products</a></div>';
      els.footer.hidden = true;
      return;
    }
    els.footer.hidden = false;
    els.body.innerHTML = '<ul class="te-cart__lines">' + cart.map(function (l) {
      var p = product(l.id);
      var k = esc(l.key);
      return '<li class="te-line">' +
        '<img class="te-line__img" src="' + esc(p.image) + '" alt="" width="64" height="64">' +
        '<div class="te-line__info">' +
          '<a class="te-line__name" href="' + esc(p.url) + '">' + esc(p.name) + '</a>' +
          (l.options && Object.keys(l.options).length ? '<span class="te-line__opts">' + esc(optionText(l.options)) + '</span>' : '') +
          '<span class="te-line__unit">' + money(p.price) + ' each</span>' +
          '<div class="te-qty te-qty--sm">' +
            '<button type="button" data-te-line="' + k + '" data-te-act="dec" aria-label="Decrease quantity of ' + esc(p.name) + '">−</button>' +
            '<input type="number" inputmode="numeric" min="1" max="' + (catalog.maxQuantityPerLine || 25) + '" value="' + l.quantity + '" data-te-line="' + k + '" aria-label="Quantity of ' + esc(p.name) + '">' +
            '<button type="button" data-te-line="' + k + '" data-te-act="inc" aria-label="Increase quantity of ' + esc(p.name) + '">+</button>' +
          '</div>' +
        '</div>' +
        '<div class="te-line__right">' +
          '<span class="te-line__total">' + money(cents(p.price) * l.quantity / 100) + '</span>' +
          '<button type="button" class="te-line__remove" data-te-line="' + k + '" data-te-act="remove">Remove</button>' +
        '</div>' +
      '</li>';
    }).join("") + '</ul>';

    var sub = cartSubtotalCents() / 100;
    els.subtotal.textContent = money(sub);
    els.total.textContent = money(sub + parseFloat(catalog.shippingCost || 0));
  }

  function isOpen() { return els.drawer && els.drawer.classList.contains("is-open"); }

  function openCart() {
    if (!els.drawer) return;
    lastFocus = document.activeElement;
    els.overlay.hidden = false;
    els.drawer.setAttribute("aria-hidden", "false");
    // next frame so the CSS transition runs
    requestAnimationFrame(function () {
      els.overlay.classList.add("is-open");
      els.drawer.classList.add("is-open");
    });
    document.documentElement.classList.add("te-no-scroll");
    els.msg.textContent = "";
    var close = els.drawer.querySelector(".te-cart__close");
    setTimeout(function () { close.focus(); }, 50);
    renderCartButtons();
  }

  function closeCart() {
    if (!isOpen()) return;
    els.overlay.classList.remove("is-open");
    els.drawer.classList.remove("is-open");
    els.drawer.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("te-no-scroll");
    setTimeout(function () { els.overlay.hidden = true; }, 250);
    if (location.hash === "#cart") history.replaceState(null, "", location.pathname + location.search);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function trapFocus(e) {
    if (e.key !== "Tab") return;
    var f = Array.prototype.filter.call(
      els.drawer.querySelectorAll('a[href], button:not([disabled]), input, iframe, [tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetParent !== null; }
    );
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function wireCartToggles() {
    var toggles = document.querySelectorAll("[data-te-cart-open]");
    if (!toggles.length) {
      // Pages without a cart button in the menu get a floating one.
      var fab = document.createElement("button");
      fab.type = "button";
      fab.className = "te-cart-fab";
      fab.setAttribute("data-te-cart-open", "");
      fab.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM5.2 4l.4 2H21l-2.2 8.2a2 2 0 0 1-1.9 1.5H8.4a2 2 0 0 1-2-1.6L4.3 2H1V0h4.9l.3 2"/></svg><span class="te-cart-count" hidden></span>';
      document.body.appendChild(fab);
    }
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-te-cart-open]");
      if (t) { e.preventDefault(); openCart(); }
    });
  }

  /* ---------- PayPal ---------- */
  function loadPayPal() {
    if (sdkPromise) return sdkPromise;
    sdkPromise = api("paypal-config").then(function (r) {
      if (r.status === 404) throw new Error("PayPal checkout only loads on the Netlify site (or with `netlify dev`). It can't run on a plain local preview.");
      if (!r.ok || !r.data.clientId) throw new Error((r.data && r.data.error) || "PayPal is not available right now.");
      return new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(r.data.clientId) +
          "&currency=" + encodeURIComponent(r.data.currency || "USD") + "&intent=capture&components=buttons";
        // Own namespace so it can never clash with any leftover PayPal code on the page.
        s.setAttribute("data-namespace", "tePayPal");
        s.async = true;
        s.onload = function () { window.tePayPal ? resolve(window.tePayPal) : reject(new Error("PayPal failed to load.")); };
        s.onerror = function () { reject(new Error("PayPal failed to load. Check your connection or ad blocker.")); };
        document.head.appendChild(s);
      });
    });
    sdkPromise.catch(function () { sdkPromise = null; });
    return sdkPromise;
  }

  function shippingGuard(config) {
    var allowed = (catalog.shipToCountries || []).map(function (c) { return c.toUpperCase(); });
    if (!allowed.length) return config;
    config.onShippingAddressChange = function (data, actions) {
      var cc = data.shippingAddress && data.shippingAddress.countryCode;
      if (cc && allowed.indexOf(cc.toUpperCase()) === -1) {
        return actions.reject(data.errors && data.errors.COUNTRY_ERROR);
      }
    };
    return config;
  }

  // Shared PayPal button behaviour. getLines() returns the lines being purchased.
  function paypalConfig(opts) {
    var lastError = "";
    return shippingGuard({
      style: opts.style,
      onClick: function (data, actions) {
        opts.showMsg("");
        var problem = opts.validate ? opts.validate() : "";
        if (problem) { opts.showMsg(problem); return actions.reject(); }
        return actions.resolve();
      },
      createOrder: function () {
        lastError = "";
        return api("create-order", { items: itemsForServer(opts.getLines()) }).then(function (r) {
          if (!r.ok || !r.data.id) {
            lastError = (r.data && r.data.error) || "We couldn't start checkout. Please try again.";
            throw new Error(lastError);
          }
          return r.data.id;
        });
      },
      onApprove: function (data, actions) {
        opts.showMsg("Completing your payment…", "info");
        return api("capture-order", { orderID: data.orderID }).then(function (r) {
          if (r.status === 422 && r.data.issue === "INSTRUMENT_DECLINED") {
            opts.showMsg("Your payment method was declined. Please choose another one.");
            return actions.restart();
          }
          if (!r.ok) {
            opts.showMsg((r.data && r.data.error) || "We couldn't complete your payment. You have not been charged.");
            return;
          }
          storageSet(sessionStorage, ORDER_KEY, r.data);
          if (opts.clearCartOnSuccess) { cart = []; saveCart(); }
          window.location.href = "/order-confirmation/?order=" + encodeURIComponent(r.data.orderId);
        });
      },
      onCancel: function () {
        opts.showMsg(opts.clearCartOnSuccess ? "Checkout cancelled — your cart is saved." : "Checkout cancelled.", "info");
      },
      onError: function (err) {
        if (window.console) console.error("PayPal error", err);
        opts.showMsg(lastError || "Something went wrong with PayPal. Please try again.");
      },
    });
  }

  function renderCartButtons() {
    if (cartButtonsRendered || !cart.length) return;
    var target = document.getElementById("te-cart-paypal");
    loadPayPal().then(function (paypal) {
      if (cartButtonsRendered) return;
      cartButtonsRendered = true;
      target.innerHTML = "";
      return paypal.Buttons(paypalConfig({
        style: { layout: "vertical", color: "gold", shape: "pill", label: "checkout" },
        getLines: function () { return cart; },
        validate: function () { return cart.length ? "" : "Your cart is empty."; },
        clearCartOnSuccess: true,
        showMsg: function (m, kind) { setMsg(els.msg, m, kind); },
      })).render(target);
    }).catch(function (err) {
      target.innerHTML = "";
      setMsg(els.msg, err.message || "Checkout is unavailable right now.");
    });
  }

  function setMsg(el, text, kind) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("te-msg--info", kind === "info");
  }

  /* ---------- product widgets ---------- */
  function renderProduct(el, index) {
    var p = product(el.getAttribute("data-te-product"));
    if (!p) { el.innerHTML = ""; return; }
    var uid = "te-p" + index;

    if (!p.available) {
      el.innerHTML =
        '<div class="te-product te-product--unavailable">' +
          '<button type="button" class="te-btn te-btn--disabled" disabled aria-disabled="true">' + esc(p.unavailableLabel || "Coming soon") + '</button>' +
        '</div>';
      return;
    }

    var max = catalog.maxQuantityPerLine || 25;
    var opts = (p.options || []).map(function (o, oi) {
      return '<fieldset class="te-opt" data-te-opt="' + esc(o.name) + '">' +
        '<legend>' + esc(o.name) + ' <span class="te-opt__req">(required)</span></legend>' +
        '<div class="te-opt__values">' + o.values.map(function (v, vi) {
          var id = uid + "-o" + oi + "-" + vi;
          return '<input type="radio" class="te-sr-only" name="' + uid + "-o" + oi + '" id="' + id + '" value="' + esc(v) + '">' +
            '<label for="' + id + '">' + esc(v) + '</label>';
        }).join("") + '</div></fieldset>';
    }).join("");

    el.innerHTML =
      '<div class="te-product">' +
        '<span class="te-price">' + money(p.price) + '</span>' +
        opts +
        '<div class="te-row">' +
          '<label class="te-sr-only" for="' + uid + '-qty">Quantity</label>' +
          '<div class="te-qty">' +
            '<button type="button" data-te-q="-1" aria-label="Decrease quantity">−</button>' +
            '<input type="number" id="' + uid + '-qty" inputmode="numeric" min="1" max="' + max + '" value="1">' +
            '<button type="button" data-te-q="1" aria-label="Increase quantity">+</button>' +
          '</div>' +
          '<button type="button" class="te-btn te-add">Add to Cart</button>' +
        '</div>' +
        '<p class="te-msg" role="alert"></p>' +
        '<div class="te-buynow" aria-label="Buy now with PayPal"></div>' +
      '</div>';

    var qtyInput = el.querySelector(".te-qty input");
    var msg = el.querySelector(".te-msg");

    function selection() {
      var chosen = {}, missing = [];
      (p.options || []).forEach(function (o) {
        var fs = el.querySelector('[data-te-opt="' + o.name.replace(/"/g, '\\"') + '"]');
        var checked = fs && fs.querySelector("input:checked");
        if (checked) chosen[o.name] = checked.value; else missing.push(o.name.toLowerCase());
      });
      var q = parseInt(qtyInput.value, 10);
      if (isNaN(q) || q < 1) q = 1;
      if (q > max) q = max;
      qtyInput.value = q;
      return { options: chosen, quantity: q, missing: missing };
    }
    function problem() {
      var s = selection();
      if (s.missing.length) {
        el.querySelectorAll(".te-opt").forEach(function (fs) {
          fs.classList.toggle("te-opt--error", !fs.querySelector("input:checked"));
        });
        return "Please choose a " + s.missing.join(" and ") + ".";
      }
      return "";
    }

    el.addEventListener("click", function (e) {
      var step = e.target.closest("[data-te-q]");
      if (step) {
        var q = (parseInt(qtyInput.value, 10) || 1) + parseInt(step.getAttribute("data-te-q"), 10);
        qtyInput.value = Math.max(1, Math.min(max, q));
      }
      if (e.target.closest(".te-add")) {
        var err = problem();
        if (err) { setMsg(msg, err); return; }
        var s = selection();
        addToCart(p.id, s.options, s.quantity);
        setMsg(msg, "Added to cart.", "info");
        announce(p.name + " added to cart");
        openCart();
      }
    });
    el.addEventListener("change", function (e) {
      var fs = e.target.closest(".te-opt");
      if (fs) { fs.classList.remove("te-opt--error"); setMsg(msg, ""); }
    });

    // Buy Now: PayPal button for just this item.
    var buy = el.querySelector(".te-buynow");
    var render = function () {
      loadPayPal().then(function (paypal) {
        return paypal.Buttons(paypalConfig({
          style: { layout: "horizontal", color: "gold", shape: "pill", label: "buynow", tagline: false, height: 40 },
          validate: problem,
          getLines: function () {
            var s = selection();
            return [{ id: p.id, options: s.options, quantity: s.quantity }];
          },
          clearCartOnSuccess: false,
          showMsg: function (m, kind) { setMsg(msg, m, kind); },
        })).render(buy);
      }).catch(function () { buy.innerHTML = ""; });
    };
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (en) { return en.isIntersecting; })) { io.disconnect(); render(); }
      }, { rootMargin: "300px" });
      io.observe(el);
    } else {
      render();
    }
  }

  /* ---------- order confirmation page ---------- */
  function renderConfirmation(el) {
    var params = new URLSearchParams(location.search);
    var id = params.get("order") || "";
    var o = storageGet(sessionStorage, ORDER_KEY);
    if (!o || (id && o.orderId !== id)) {
      el.innerHTML =
        '<h1>Thank you for your order!</h1>' +
        (id ? '<p>Your PayPal order number is <strong>' + esc(id) + '</strong>.</p>' : '') +
        '<p>A receipt has been emailed to you by PayPal.</p>' +
        '<p><a class="te-btn" href="/">Back to home</a></p>';
      return;
    }
    var date = new Date(o.date);
    el.innerHTML =
      '<p class="te-confirm__eyebrow">Payment complete</p>' +
      '<h1>Thank you' + (o.payer && o.payer.name ? ", " + esc(o.payer.name.split(" ")[0]) : "") + '!</h1>' +
      '<p class="te-confirm__lead">Your order is confirmed. PayPal has emailed a receipt' + (o.payer && o.payer.email ? " to <strong>" + esc(o.payer.email) + "</strong>" : "") + '.</p>' +
      '<div class="te-confirm__grid">' +
        '<section class="te-card"><h2>Order details</h2><dl class="te-kv">' +
          '<div><dt>Order number</dt><dd>' + esc(o.orderId) + '</dd></div>' +
          (o.invoiceId ? '<div><dt>Reference</dt><dd>' + esc(o.invoiceId) + '</dd></div>' : '') +
          '<div><dt>Date</dt><dd>' + esc(isNaN(date) ? "" : date.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })) + '</dd></div>' +
          '<div><dt>Status</dt><dd>' + esc(o.captureStatus === "COMPLETED" ? "Paid" : (o.captureStatus || o.status)) + '</dd></div>' +
        '</dl></section>' +
        '<section class="te-card"><h2>Shipping to</h2><address>' +
          (o.shipping && o.shipping.name ? esc(o.shipping.name) + "<br>" : "") +
          ((o.shipping && o.shipping.lines) || []).map(esc).join("<br>") +
        '</address></section>' +
      '</div>' +
      '<section class="te-card"><h2>Items</h2><ul class="te-confirm__items">' +
        (o.items || []).map(function (i) {
          return '<li><div><strong>' + esc(i.name) + '</strong>' + (i.description ? '<span>' + esc(i.description) + '</span>' : '') +
            '<span>Qty ' + esc(i.quantity) + ' × ' + money(i.unitPrice) + '</span></div>' +
            '<span>' + money(parseFloat(i.unitPrice) * i.quantity) + '</span></li>';
        }).join("") +
      '</ul><dl class="te-cart__totals">' +
        '<div><dt>Subtotal</dt><dd>' + money(o.amounts.itemTotal) + '</dd></div>' +
        '<div><dt>Shipping</dt><dd>' + (parseFloat(o.amounts.shipping) ? money(o.amounts.shipping) : "Free") + '</dd></div>' +
        '<div class="te-cart__grand"><dt>Total paid</dt><dd>' + money(o.amounts.total) + '</dd></div>' +
      '</dl></section>' +
      '<p class="te-confirm__actions"><button type="button" class="te-btn te-btn--ghost" onclick="window.print()">Print receipt</button> <a class="te-btn" href="/">Back to home</a></p>' +
      '<p class="te-confirm__seller">Sold by ' + esc(catalog.seller) + '</p>';
  }

  /* ---------- boot ---------- */
  function boot() {
    fetch("/shop/products.json", { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        catalog = data;
        loadCart();
        buildDrawer();
        wireCartToggles();
        renderCart();
        document.querySelectorAll("[data-te-product]").forEach(renderProduct);
        var conf = document.querySelector("[data-te-confirmation]");
        if (conf) renderConfirmation(conf);
        if (location.hash === "#cart") openCart();
        window.addEventListener("hashchange", function () { if (location.hash === "#cart") openCart(); });
        // Keep carts in sync across open tabs.
        window.addEventListener("storage", function (e) { if (e.key === CART_KEY) { loadCart(); renderCart(); } });
      })
      .catch(function (err) {
        if (window.console) console.error("Shop failed to load", err);
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
