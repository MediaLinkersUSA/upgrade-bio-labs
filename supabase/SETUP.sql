-- Upgrade Bio Labs - complete database setup
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.

-- Upgrade Bio Labs schema.
--
-- Scope note: the 60-SKU catalogue stays in src/data/products.ts and is NOT
-- the responsibility of this database. That file is typed, statically built
-- into all 60 product pages, and needs no round trip to render. Supabase owns
-- the things a static file cannot: data captured from real people, and order
-- history.
--
-- Every table is RLS-on with no anonymous read policy. Inserts happen through
-- server routes using the service-role key, so the publishable key can never
-- read a customer email.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- subscribers
create table if not exists public.subscribers (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  source       text not null default 'unknown',   -- inline | exit-intent | checkout
  discount_code text,
  created_at   timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create unique index if not exists subscribers_email_key
  on public.subscribers (lower(email));

-- ------------------------------------------------------- back-in-stock demand
-- Several SKUs are out of stock at any time. Today that demand is discarded;
-- this is where it lands instead.
create table if not exists public.stock_requests (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  product_slug text not null,
  notified_at  timestamptz,
  created_at   timestamptz not null default now()
);

create unique index if not exists stock_requests_unique
  on public.stock_requests (lower(email), product_slug)
  where notified_at is null;

create index if not exists stock_requests_by_product
  on public.stock_requests (product_slug) where notified_at is null;

-- --------------------------------------------------------------------- orders
create table if not exists public.orders (
  id                      uuid primary key default gen_random_uuid(),
  stripe_session_id       text not null unique,
  stripe_payment_intent   text,
  email                   text,
  status                  text not null default 'paid',
  -- money in integer cents. Never store currency as float.
  subtotal_cents          integer not null default 0,
  discount_cents          integer not null default 0,
  shipping_cents          integer not null default 0,
  total_cents             integer not null default 0,
  distinct_compounds      integer not null default 0,
  stack_discount_rate     numeric(4,3) not null default 0,
  shipping_name           text,
  shipping_address        jsonb,
  created_at              timestamptz not null default now()
);

create index if not exists orders_email_idx on public.orders (lower(email));
create index if not exists orders_created_idx on public.orders (created_at desc);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_slug  text not null,
  product_name  text not null,
  format        text not null,
  quantity      integer not null check (quantity > 0),
  unit_cents    integer not null,
  line_cents    integer not null
);

create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_slug_idx  on public.order_items (product_slug);

-- -------------------------------------------------------------------- reviews
-- The storefront gates its reviews section, hero rating and aggregateRating
-- schema on there being 25+ APPROVED rows here. Nothing renders until real
-- reviews exist, because marking up a rating you cannot evidence is a
-- manual-action risk.
create table if not exists public.reviews (
  id                uuid primary key default gen_random_uuid(),
  product_slug      text not null,
  rating            smallint not null check (rating between 1 and 5),
  headline          text not null,
  body              text not null,
  first_name        text not null,
  last_initial      text not null,
  verified_purchase boolean not null default false,
  approved          boolean not null default false,
  order_id          uuid references public.orders(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index if not exists reviews_public_idx
  on public.reviews (product_slug) where approved;

-- ------------------------------------------------------------------------ RLS
alter table public.subscribers    enable row level security;
alter table public.stock_requests enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.reviews        enable row level security;

-- No policies for subscribers / stock_requests / orders / order_items on
-- purpose: with RLS enabled and no policy, the anon and authenticated roles
-- get nothing. The service-role key used by our server routes bypasses RLS.

-- Approved reviews are the one thing safe to read publicly, and only these
-- columns matter to the storefront.
drop policy if exists "approved reviews are public" on public.reviews;
create policy "approved reviews are public"
  on public.reviews for select
  to anon, authenticated
  using (approved = true);


-- Client-uploaded certificates of analysis.
--
-- COAs currently point at PDFs on the old WordPress site, which the client
-- cannot change without a developer. This table lets her upload a new document
-- per SKU from the admin dashboard; /api/coa/[slug] prefers the newest row here
-- and only falls back to the legacy URL when none exists.

create table if not exists public.coa_documents (
  id            uuid primary key default gen_random_uuid(),
  product_slug  text not null,
  storage_path  text not null,          -- path within the `coas` storage bucket
  batch         text,                    -- optional printed batch id
  original_name text,
  size_bytes    integer,
  uploaded_at   timestamptz not null default now()
);

-- The newest upload per SKU is the live document.
create index if not exists coa_documents_slug_idx
  on public.coa_documents (product_slug, uploaded_at desc);

alter table public.coa_documents enable row level security;
-- No anon policy. Reads and writes go through server routes on the service-role
-- key, exactly like orders and subscribers.

-- ---------------------------------------------------------------------------
-- Storage bucket. Run once; ignore the error if it already exists.
-- Kept PRIVATE: the API route streams documents through our own origin, so the
-- bucket never needs to be publicly listable.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('coas', 'coas', false)
on conflict (id) do nothing;
