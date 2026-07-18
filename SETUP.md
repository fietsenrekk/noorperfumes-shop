# NOOR PERFUMES — going live (Supabase + Vercel + Mollie)

This turns the static site into a real shop:

- **Vercel** hosts the frontend (auto-deploys from this repo, your domain + HTTPS)
- **Supabase** holds products + orders and runs the payment functions
- **Mollie** takes the actual money (Bancontact, iDEAL, cards)

Do the steps in order. **Never send me any secret keys** — you paste them into the
Supabase/Vercel/Mollie dashboards yourself. Only the *anon* key and project URL are
public and go in the frontend.

---

## 1. Supabase project + database
1. Create a project at https://supabase.com (region: Frankfurt/EU).
2. Open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql), Run.
3. New query again, paste [`supabase/seed.sql`](supabase/seed.sql), Run. (You now have the 7 products.)
4. **Settings → API** — copy three values:
   - **Project URL** → public
   - **anon / publishable key** → public (goes in the frontend)
   - **service_role key** → SECRET (only used by the functions; never in the frontend)

## 2. Mollie (payments)
1. Create an account at https://www.mollie.com and add your business details
   (KVK/BTW `BE1016832588`). Enabling **live** payments requires Mollie's KYC
   verification — start this early, it can take a day or two.
2. Enable payment methods: **Bancontact, iDEAL, credit card** (and Apple/Google Pay if offered).
3. **Developers → API keys** — copy the **Test API key** (`test_…`) first. Swap to the
   **Live key** (`live_…`) once verified.

## 3. Deploy the Edge Functions
Install the Supabase CLI (`npm i -g supabase`), then from the repo root:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF

# secrets (server-side only — SUPABASE_URL and SERVICE_ROLE are injected for you)
supabase secrets set MOLLIE_API_KEY=test_xxxxxxxx
supabase secrets set SITE_URL=https://YOUR-VERCEL-URL       # set/adjust after step 5
supabase secrets set ALLOWED_ORIGIN=https://YOUR-DOMAIN     # or * while testing

supabase functions deploy create-payment --no-verify-jwt
supabase functions deploy mollie-webhook --no-verify-jwt
```

## 4. Frontend config
1. Copy `js/config.example.js` → `js/config.js`.
2. Fill in `supabaseUrl`, `supabaseAnonKey`, and `functionsUrl`
   (`https://YOUR-PROJECT-ref.supabase.co/functions/v1`).
   `js/config.js` is gitignored — that's fine, Vercel gets its copy in the next step
   (either commit it — the anon key is public and safe — or set it as a Vercel build step).

## 5. Deploy to Vercel
1. Go to https://vercel.com → **Add New → Project** → import `fietsenrekk/noorperfumes-shop`.
2. Framework preset: **Other** (it's a static site — no build command, output = repo root).
3. Deploy. You get a `*.vercel.app` URL.
4. Go back and set the Supabase secret `SITE_URL` to that URL (step 3), then
   `supabase functions deploy create-payment --no-verify-jwt` again so the redirect
   and webhook URLs are correct.
5. **Project → Settings → Domains**: add your domain (e.g. `noorperfumes.be`) and follow
   the DNS instructions. HTTPS is automatic.

## 6. Test end-to-end (test mode)
1. Open the site, add a perfume, fill the form, click checkout.
2. You should land on Mollie's **test** checkout → choose "paid".
3. Back in Supabase → **Table editor → orders**: the row should flip to `status = paid`.
   If it stays `pending`, check **Edge Functions → Logs → mollie-webhook**.

## 7. Go live
1. Swap `MOLLIE_API_KEY` to the **live** key (`supabase secrets set …`) and redeploy the functions.
2. Confirm the domain is attached in Vercel.
3. Done — real payments now work.

---

## Before real customers (don't skip)
- **Order confirmation e-mail** — not built yet. Add a Supabase DB webhook / trigger on
  `orders` → `paid` that sends mail via Resend or Postmark. (I can build this next.)
- **VAT invoice** — Belgium legally requires a proper invoice per sale. Generate one from
  the order (prices already include 21% BTW) and e-mail it. (I can build this next.)
- **Stock** — the `products.stock` column exists but isn't decremented yet; add that if you
  track inventory.
- **Abuse protection** — `create-payment` is public; add Supabase rate-limiting if it gets hit.

## Architecture recap
```
Browser ─ reads products ─────► Supabase Postgres (public read via RLS)
Browser ─ POST cart+customer ─► Edge fn create-payment (service role)
                                  → prices from DB (never trust the browser)
                                  → insert pending order
                                  → Mollie payment → checkout URL
Browser ◄ redirect ───────────── Mollie hosted checkout
Mollie ─ webhook ─────────────► Edge fn mollie-webhook
                                  → re-check status with Mollie
                                  → mark order paid
Vercel hosts the static frontend (this repo) on your domain.
```
Swapping Mollie for **Stripe** later means changing only the two Edge Functions — the
frontend and database stay the same.
