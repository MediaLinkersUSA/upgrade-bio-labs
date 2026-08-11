-- Affiliate tracking.
--
-- The storefront is headless: customers never touch WordPress until their
-- order is mirrored in after the fact, so a WooCommerce affiliate plugin
-- never sees the visit or the click. Tracking has to live here instead, on
-- the same request that already creates the order.
--
-- Model: a visitor arrives with ?ref=CODE, middleware sets a cookie, and
-- whichever affiliate's cookie is present at checkout gets credited on that
-- order. Last-click: a later ?ref= link overwrites an earlier one. Nothing
-- here is Stripe- or Woo- shaped, so unlike 0001-0004 there is no legacy
-- fallback to preserve - this can assume it is running against the current
-- schema.

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------ 1. affiliates
create table if not exists public.affiliates (
  id                uuid primary key default gen_random_uuid(),
  -- What goes in the ?ref= link and the Zelle-style human-typed reference if
  -- ever needed. Case-insensitive in practice: normalised to lowercase before
  -- every lookup and every insert, so "SARAH" and "sarah" are one affiliate.
  code              text not null unique,
  name              text not null,
  email             text,
  -- Basis points, not a percentage, so the column is an exact integer and
  -- "10%" cannot drift into 0.099999 the way a float would.
  commission_bps    integer not null default 1000 check (commission_bps between 0 and 10000),
  active            boolean not null default true,
  notes             text,
  created_at        timestamptz not null default now()
);

create unique index if not exists affiliates_code_lower_idx
  on public.affiliates (lower(code));

-- ------------------------------------------------------------------ 2. orders
-- Attribution rides on the order row itself rather than a separate join
-- table, because an order's commission must never change after the order is
-- placed even if the affiliate's rate changes later - the rate is captured
-- at order time, not looked up fresh at report time.
alter table public.orders add column if not exists ref_code         text;
alter table public.orders add column if not exists affiliate_id     uuid references public.affiliates(id) on delete set null;
alter table public.orders add column if not exists commission_cents integer not null default 0;

create index if not exists orders_affiliate_idx on public.orders (affiliate_id, created_at desc);
create index if not exists orders_ref_code_idx  on public.orders (ref_code);

comment on column public.orders.commission_cents is
  'Computed once at order creation from the affiliate''s commission_bps at
   that moment, on (total_cents - shipping_cents). Not recalculated if the
   rate changes afterwards.';

-- ------------------------------------------------------------------------ RLS
alter table public.affiliates enable row level security;
-- No anon policy: only the service role (admin dashboard, order creation)
-- touches this table, same as orders and order_items.
