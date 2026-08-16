/* NOOR PERFUMES — Supabase data + checkout layer.
   - loadProducts(): fetch the live catalogue from Supabase (falls back to the
     built-in NOOR_PRODUCTS array if Supabase isn't configured yet, so the site
     never breaks during setup).
   - checkout(cart, customer): call the create-payment Edge Function and return
     a Mollie checkout URL to redirect to.
   Loaded via CDN: @supabase/supabase-js (see index.html). */

window.NOOR_STORE = (function () {
  "use strict";

  var cfg = window.NOOR_CONFIG || {};
  var configured = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  var client = configured
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
    : null;

  function mapRow(r) {
    return {
      id: r.id,
      name: r.name,
      ml: r.volume || "",
      notes: r.notes || "",
      fact: r.fun_fact || "",
      price: Math.round((r.price_cents || 0) / 100), // whole euros for display
      priceCents: r.price_cents || 0,
      photo: r.image_path || "",
      initial: (r.name || "?").slice(0, 2).toUpperCase(),
      available: r.available !== false,
      // Out-of-stock products stay in the grid so customers can join the waitlist.
      soldOut: r.available === false
    };
  }

  function loadProducts() {
    if (!client) {
      // not configured yet — use the bundled catalogue so the page still works
      return Promise.resolve(window.NOOR_PRODUCTS || []);
    }
    return client
      .from("products")
      .select("id,name,volume,notes,fun_fact,price_cents,image_path,available,sort_order")
      // No availability filter: sold-out items still render, with a waitlist
      // button instead of an order button.
      .order("sort_order", { ascending: true })
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) {
          console.warn("Supabase products load failed, using bundled catalogue:", res.error);
          return window.NOOR_PRODUCTS || [];
        }
        return res.data.map(mapRow);
      })
      .catch(function (e) {
        console.warn("Supabase unreachable, using bundled catalogue:", e);
        return window.NOOR_PRODUCTS || [];
      });
  }

  function checkout(cartMap, customer) {
    var items = Object.keys(cartMap).map(function (id) {
      return { id: id, qty: cartMap[id] };
    });
    if (!items.length) return Promise.reject(new Error("Cart is empty"));

    var base = cfg.functionsUrl || (cfg.supabaseUrl ? cfg.supabaseUrl + "/functions/v1" : null);
    if (!base) return Promise.reject(new Error("Checkout is not configured yet"));

    return fetch(base + "/create-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + cfg.supabaseAnonKey,
        "apikey": cfg.supabaseAnonKey
      },
      body: JSON.stringify({ items: items, customer: customer })
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.error || "Checkout failed");
        return data; // { checkoutUrl, orderId }
      });
    });
  }

  return { configured: configured, loadProducts: loadProducts, checkout: checkout };
})();
