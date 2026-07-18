-- NOOR PERFUMES — custom shop schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query) once.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.

-- ============================================================
-- PRODUCTS  (public catalogue — anyone may read, nobody may write from the browser)
-- ============================================================
create table if not exists public.products (
  id            text primary key,               -- stable slug, e.g. "memorable"
  name          text not null,
  volume        text,                            -- "30ml"
  notes         text,                            -- "Red saffron, ambergris, praline"
  fun_fact      text,
  price_cents   integer not null check (price_cents >= 0),  -- price in euro cents, incl. 21% BTW
  currency      text not null default 'EUR',
  image_path    text,                            -- repo-relative ("assets/img/x.jpg") or full https URL
  available     boolean not null default true,
  stock         integer,                         -- null = not tracked
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- ORDERS  (private — only the Edge Functions, via the service role, touch these)
-- ============================================================
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  status         text not null default 'pending'
                   check (status in ('pending','paid','failed','expired','canceled','refunded')),
  email          text not null,
  first_name     text,
  last_name      text,
  phone          text,
  address        text,
  postal_code    text,
  city           text,
  country        text default 'BE',
  amount_cents   integer not null check (amount_cents >= 0),   -- server-computed total
  currency       text not null default 'EUR',
  mollie_id      text,                                          -- Mollie payment id (tr_...)
  created_at     timestamptz not null default now(),
  paid_at        timestamptz
);
create index if not exists orders_mollie_id_idx on public.orders (mollie_id);
create index if not exists orders_status_idx on public.orders (status);

create table if not exists public.order_items (
  id            bigint generated always as identity primary key,
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    text not null references public.products(id),
  name          text not null,          -- snapshot of name at purchase time
  unit_cents    integer not null,       -- snapshot of price at purchase time
  quantity      integer not null check (quantity > 0)
);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Products: anyone (anon key) may read available products. No client writes.
drop policy if exists "products are publicly readable" on public.products;
create policy "products are publicly readable"
  on public.products for select
  using (true);

-- Orders / order_items: NO policies for anon or authenticated => the browser
-- can neither read nor write them. The Edge Functions use the service_role key,
-- which bypasses RLS entirely. That is exactly what we want.
