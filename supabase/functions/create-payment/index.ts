// Edge Function: create-payment
// POST { items: [{id, qty}], customer: {email, first_name, last_name, phone, address, postal_code, city, country} }
// -> looks up REAL prices in Postgres, creates a pending order, opens a Mollie
//    payment, and returns { checkoutUrl }. The browser never sets the price.
//
// Deploy:  supabase functions deploy create-payment --no-verify-jwt
// Secrets: MOLLIE_API_KEY, SITE_URL  (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
//          are injected automatically by the platform)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface CartItem { id: string; qty: number; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => null);
    const items: CartItem[] = Array.isArray(body?.items) ? body.items : [];
    const customer = body?.customer ?? {};

    // ---- validate input ----
    if (items.length === 0) return json({ error: "Cart is empty" }, 400);
    if (!isEmail(customer.email)) return json({ error: "Valid email required" }, 400);

    // collapse duplicate ids, clamp quantities
    const wanted = new Map<string, number>();
    for (const it of items) {
      if (typeof it?.id !== "string") continue;
      const q = Math.min(Math.max(parseInt(String(it.qty), 10) || 0, 1), 99);
      wanted.set(it.id, (wanted.get(it.id) ?? 0) + q);
    }
    if (wanted.size === 0) return json({ error: "No valid items" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---- authoritative prices from the DB ----
    const { data: products, error: pErr } = await admin
      .from("products")
      .select("id, name, price_cents, available")
      .in("id", [...wanted.keys()]);
    if (pErr) throw pErr;

    const lineItems: { product_id: string; name: string; unit_cents: number; quantity: number }[] = [];
    let amount = 0;
    for (const p of products ?? []) {
      if (!p.available) continue;
      const qty = wanted.get(p.id)!;
      amount += p.price_cents * qty;
      lineItems.push({ product_id: p.id, name: p.name, unit_cents: p.price_cents, quantity: qty });
    }
    if (lineItems.length === 0 || amount <= 0) {
      return json({ error: "None of the items are available" }, 400);
    }

    // ---- create the pending order ----
    const { data: order, error: oErr } = await admin
      .from("orders")
      .insert({
        status: "pending",
        email: String(customer.email).slice(0, 200),
        first_name: str(customer.first_name),
        last_name: str(customer.last_name),
        phone: str(customer.phone),
        address: str(customer.address),
        postal_code: str(customer.postal_code),
        city: str(customer.city),
        country: str(customer.country) || "BE",
        amount_cents: amount,
        currency: "EUR",
      })
      .select("id")
      .single();
    if (oErr) throw oErr;

    await admin.from("order_items").insert(
      lineItems.map((li) => ({ ...li, order_id: order.id })),
    );

    // ---- open the Mollie payment ----
    const siteUrl = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
    const mollieRes = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("MOLLIE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: { currency: "EUR", value: (amount / 100).toFixed(2) },
        description: `NOOR PERFUMES order ${order.id.slice(0, 8)}`,
        redirectUrl: `${siteUrl}/thank-you.html?order=${order.id}`,
        webhookUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mollie-webhook`,
        metadata: { order_id: order.id },
      }),
    });
    const mollie = await mollieRes.json();
    if (!mollieRes.ok) {
      await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
      return json({ error: mollie?.detail ?? "Payment provider error" }, 502);
    }

    await admin.from("orders").update({ mollie_id: mollie.id }).eq("id", order.id);

    return json({ checkoutUrl: mollie._links.checkout.href, orderId: order.id });
  } catch (e) {
    console.error("create-payment error:", e);
    return json({ error: "Server error" }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function isEmail(v: unknown) { return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function str(v: unknown) { return typeof v === "string" ? v.slice(0, 300) : null; }
