// Edge Function: mollie-webhook
// Mollie POSTs { id: "tr_..." } here after a payment changes state. We NEVER
// trust that body for the status — we re-fetch the payment from Mollie with our
// secret key and then update the order. This is the secure pattern.
//
// Deploy:  supabase functions deploy mollie-webhook --no-verify-jwt
// Secret:  MOLLIE_API_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    // Mollie sends application/x-www-form-urlencoded: id=tr_xxx
    const form = await req.formData().catch(() => null);
    const paymentId = form?.get("id");
    if (typeof paymentId !== "string" || !paymentId.startsWith("tr_")) {
      return new Response("Bad request", { status: 400 });
    }

    // Re-fetch the authoritative status from Mollie.
    const res = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${Deno.env.get("MOLLIE_API_KEY")}` },
    });
    if (!res.ok) return new Response("Cannot verify payment", { status: 502 });
    const payment = await res.json();

    const orderId = payment?.metadata?.order_id;
    if (!orderId) return new Response("ok", { status: 200 }); // nothing to map — ack anyway

    const status = mapStatus(payment.status);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await admin
      .from("orders")
      .update({
        status,
        mollie_id: paymentId,
        paid_at: status === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", orderId);

    // Always 200 so Mollie stops retrying once we've processed it.
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("mollie-webhook error:", e);
    // 500 makes Mollie retry later, which is the safe behaviour on a transient error.
    return new Response("error", { status: 500 });
  }
});

function mapStatus(mollieStatus: string): string {
  switch (mollieStatus) {
    case "paid": return "paid";
    case "canceled": return "canceled";
    case "expired": return "expired";
    case "failed": return "failed";
    default: return "pending"; // open / pending / authorized
  }
}
