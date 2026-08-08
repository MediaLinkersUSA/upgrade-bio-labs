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
