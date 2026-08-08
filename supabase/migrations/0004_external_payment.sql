-- External payment handoff.
--
-- Payments are not processed by this storefront. Card orders are created here,
-- then the customer is sent to the WordPress property at
-- upgradebiolabservices.com (UBL Stripe Connect Pro) to pay, and returned to
-- /thank-you afterwards. Stripe never touches this codebase, so the schema can
-- no longer be shaped around a Stripe session.
--
-- This migration is SELF-SUFFICIENT and idempotent: it folds in everything
-- 0003 did, so it is safe whether or not 0003 was ever run. Run this one file.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- 1. orders
-- Stripe is not the origin of an order any more, and on a card order the row
-- has to exist BEFORE payment - that is the whole point of the handoff, since
-- the payment site is handed nothing but this row's id.
alter table public.orders alter column stripe_session_id drop not null;

-- The id in the payment URL. uuid, unguessable, and already the primary key -
-- so the handoff needs no extra token.
--
-- The human-quotable reference is separate: customers type it into a Zelle
-- memo, so it is short and excludes I/1 and O/0.
alter table public.orders add column if not exists order_number text unique;

alter table public.orders
  add column if not exists payment_method text not null default 'card';

-- Dropped and recreated rather than `if not exists`: a constraint added by an
-- earlier run would not know about any method added since.
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('card', 'zelle', 'cashapp'));

-- Captured at checkout, previously dropped on the floor.
alter table public.orders add column if not exists phone       text;
alter table public.orders add column if not exists order_notes text;

-- ------------------------------------------------- 2. external payment state
-- What the payment site tells us, once it tells us anything.
--
-- `payment_reference` is its transaction/order id, kept so a payment can be
-- traced back across the two systems. Both stay null until something
-- server-to-server confirms the payment: a customer landing on /thank-you is
-- not proof of anything, because the URL can simply be typed.
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists paid_at           timestamptz;

comment on column public.orders.status is
  'pending_payment  - card order created, customer sent to the payment site
   awaiting_payment - Zelle/CashApp, waiting on the transfer
   paid             - payment confirmed, needs packing
   shipped          - dispatched, tracking_number set
   completed        - delivered and closed
   cancelled        - will not be fulfilled
   refunded         - money returned
   Kept in step with src/lib/order-status.ts - change both together.';

-- Existing rows predate the vocabulary above and were all completed Stripe
-- orders, so they are paid by definition.
update public.orders set status = 'paid' where status not in
  ('pending_payment', 'awaiting_payment', 'paid', 'shipped',
   'completed', 'cancelled', 'refunded');

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('pending_payment', 'awaiting_payment', 'paid', 'shipped',
                    'completed', 'cancelled', 'refunded'));

-- ------------------------------------------------------------- fulfilment
-- WooCommerce gave the client a status dropdown and somewhere to put a
-- tracking number. Both have to exist here or that record is simply lost.
-- The join to WooCommerce. Orders are mirrored there because ShipStation,
-- UPS Labels and UBL Invoices all read from it; this is how a status change
-- here finds the right order there.
alter table public.orders add column if not exists woo_order_id integer;
create index if not exists orders_woo_id_idx on public.orders (woo_order_id);

alter table public.orders add column if not exists tracking_number  text;
alter table public.orders add column if not exists tracking_carrier text;
alter table public.orders add column if not exists shipped_at       timestamptz;

-- ----------------------------------------------------------- 3. order_items
-- Which fill was bought. Without this a 10mg and a 20mg line are
-- indistinguishable on the packing slip.
alter table public.order_items add column if not exists size text;

-- ---------------------------------------------------------------- 4. indexes
-- Unpaid orders are the ones a human has to chase, so the dashboard filters on
-- exactly this pair.
create index if not exists orders_status_created_idx
  on public.orders (status, created_at desc);

create index if not exists orders_order_number_idx
  on public.orders (order_number);

-- ------------------------------------------------------ 5. promo redemptions
-- The 25% code is once per customer and nothing tracked that, so it could be
-- reused indefinitely. Keyed on the NORMALISED address (lowercased, Gmail dots
-- and +tags stripped) so one inbox cannot claim it repeatedly through aliases.
create table if not exists public.promo_redemptions (
  id               uuid primary key default gen_random_uuid(),
  normalized_email text not null unique,
  code             text not null,
  order_ref        text,
  created_at       timestamptz not null default now()
);

alter table public.promo_redemptions enable row level security;
-- No anon policy: only the service role touches this table.
