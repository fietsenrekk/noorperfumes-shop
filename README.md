# NOOR PERFUMES — Official Shop

Production-ready storefront for **Noorperfumes** (Abdijstraat 197, 2020 Antwerpen · BTW BE1016832588), built as a static site that is deliberately structured for a later port to a **custom Shopify theme**.

Run locally: launch config `noorperfumes-shop` → http://localhost:4202/ (`serve-noorshop.ps1` in the workspace root).

## Architecture

Zero-dependency vanilla HTML/CSS/JS. No build step, no framework — the entire runtime is three files plus assets, so the code can be pasted into a Shopify theme (or anywhere else) without tooling.

```
noorperfumes-shop/
├── index.html        # markup shell + inline SVG payment-logo symbol library
├── css/style.css     # full design system (CSS custom properties as tokens)
├── js/products.js    # catalogue data (7 real products + 193 generated placeholders)
├── js/app.js         # grid, search, cart, checkout validation, page overlay router
└── assets/
    ├── favicon.svg
    └── img/*.jpg     # product photography (extracted from the original base64)
```

## Data flow

1. `products.js` exposes `window.NOOR_PRODUCTS` — 7 curated products (photo, notes, fun fact) + generated fillers with per-note facts.
2. `app.js` renders the grid from that array (pagination 12/page, debounced search over name+notes), using **one delegated click listener** on the grid (no per-render rebinding).
3. Cart is a `{id: qty}` map, persisted to `localStorage["noor-cart"]` (validated & clamped on load, survives refresh — verified).
4. Checkout form validates 7 fields (street, postal, city, first/last name, phone, email) on blur + on submit; first invalid field gets focus.
5. Sub-pages (store info, privacy, terms, shipping, cookies) are a hash-routed full-screen overlay: `#info`, `#privacy`, … — browser back button and Escape both close them. The **store-info page is only reachable via the toolbar ⓘ button** (no other link points to it), per spec.

## Trust & legal layer

- **Payment logos**: Bancontact, Visa, Mastercard, Amex, Apple Pay, Google Pay, iDEAL, PayPal, Klarna as a self-contained inline `<symbol>` library (no external requests, brand colors), shown at the Pay button and in the footer.
- **Legal pages** written for a Belgian B2C webshop: GDPR privacy policy (controller = Noorperfumes, GBA complaint route), terms (21% VAT, art. VI.53 WER hygiene exception, EU ODR + Consumentenombudsdienst), shipping & returns (14-day withdrawal, sealed-bottle condition), honest cookie policy (no trackers → no banner needed).
- **Footer** carries the real company data: address, BTW BE1016832588, ondernemingsnummer 1016832588, email, phone.

## Edge cases handled

- Empty search → "No perfumes found" + clear-search button.
- Corrupt/foreign localStorage cart → sanitized on load; private-mode write failures swallowed.
- Photo info panel: hover on pointer devices (`@media (hover:hover)`), tap-to-toggle on touch, Enter/Space + `aria-expanded` for keyboard; only one panel open at a time; sized to ≥⅓ of the photo, grows with content.
- Escape closes (in order): page overlay → cart drawer → open photo panels. Body scroll locked while either layer is open.
- Header title uses negative `margin-right` to cancel the trailing letter-spacing so the double frame is optically centered on the text; `clamp()` floor lowered so it never overflows at 320px.
- `prefers-reduced-motion` kills all animation/transitions.

## Shopify port plan (keep in mind)

| This site | Shopify custom theme |
|---|---|
| `js/products.js` CURATED array | real products; `notes`/`fact` → product **metafields** |
| grid render in `app.js` | `{% for product in collection.products %}` section |
| cart + drawer + pay form | Shopify cart AJAX API + native checkout (drop the form entirely) |
| payment logo row | keep the SVG symbols, or Shopify's `payment_icons` filter |
| overlay pages (`#info`, `#privacy`, …) | Shopify **Pages** + `templates/page.*.json`; info page stays linked only from the toolbar button |
| `css/style.css` | `assets/theme.css`; `:root` tokens → `settings_schema.json` |

## Performance notes

- Product photos are real files (18–36 KB each) with `loading="lazy"` — first paint no longer parses ~220 KB of base64 HTML like the original single-file version.
- No JS libraries; total JS < 30 KB unminified. Single grid listener; search debounced 120 ms.
- Google Fonts is the only external request (preconnected).

## Verified (Claude Preview, desktop + 375px mobile)

0 console errors, all requests 200. Tested: hover/tap fact panel, full-width buy, cart add/remove/persist-across-reload, drawer drag/Escape/backdrop, empty-form validation + focus, successful pay reset, info page via ⓘ only, all legal pages, search/no-results/clear, load-more, no horizontal overflow on mobile.
