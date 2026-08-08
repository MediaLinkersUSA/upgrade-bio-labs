-- Offline payment methods (Zelle, CashApp) and richer checkout capture.
--
-- The original orders table assumed every order came from Stripe:
-- stripe_session_id was NOT NULL UNIQUE, which cannot represent an order the
-- customer places on-site and then pays for by Zelle. The live storefront has
-- offered Zelle and CashApp all along, so the schema has to allow an order
-- that exists before any payment processor is involved.
--
-- Safe to run more than once.

-- 1. Stripe is no longer the only way an order can start.
alter table public.orders
  alter column stripe_session_id drop not null;

-- 2. A human-quotable reference. Zelle and CashApp payments are matched back
--    to an order by the customer typing this into the memo field, so it has to
--    be short, unambiguous, and free of easily confused characters.
alter table public.orders
  add column if not exists order_number text unique;

alter table public.orders
  add column if not exists payment_method text not null default 'card'
    check (payment_method in ('card', 'zelle', 'cashapp'));

-- 3. Checkout captures these; they were previously dropped on the floor.
alter table public.orders add column if not exists phone       text;
alter table public.orders add column if not exists order_notes text;

-- 4. Which fill was bought. Without this a 10mg and a 20mg line are
--    indistinguishable on the packing slip.
alter table public.order_items add column if not exists size text;

-- 5. Offline orders sit unpaid until someone confirms the transfer, so the
--    dashboard needs to find them fast.
create index if not exists orders_status_created_idx
  on public.orders (status, created_at desc);

create index if not exists orders_order_number_idx
  on public.orders (order_number);

-- 6. First-order promo redemptions.
--
-- The 25% code is meant to be once per customer. Nothing tracked that, so it
-- could be reused indefinitely by anyone. Keyed on the NORMALISED address
-- (lowercased, Gmail dots and +tags stripped) so one inbox cannot claim it
-- repeatedly through aliases.
create table if not exists public.promo_redemptions (
  id                uuid primary key default gen_random_uuid(),
  normalized_email  text not null unique,
  code              text not null,
  order_ref         text,
  created_at        timestamptz not null default now()
);

alter table public.promo_redemptions enable row level security;
-- No anon policy: only the service role touches this table.
