create extension if not exists pgcrypto;

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  slug text unique,
  title text,
  data jsonb not null default '{}'::jsonb,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists content_items_type_idx on public.content_items(type);
create index if not exists content_items_published_idx on public.content_items(published);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  path text not null unique,
  mime_type text,
  size bigint default 0,
  bucket text not null default 'prolisok-files',
  url text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
alter table public.content_items enable row level security;
alter table public.files enable row level security;
alter table public.admin_users enable row level security;

insert into public.site_settings(key, value) values
('general', '{"siteName":"ЦРД «Пролісок»","city":"смт Макарів","phone":"+38 (0XX) XXX-XX-XX","email":"prolisok@makariv.gov.ua","workingHours":"Понеділок — П’ятниця: 08:00 – 18:30","heroTitle":"Затишний дитячий садок для щасливого зростання","heroSub":"У ЦРД «Пролісок» ми створюємо простір, де кожна дитина почувається в безпеці, розкриває свої таланти та знаходить перших справжніх друзів."}'::jsonb)
on conflict (key) do nothing;

-- У Supabase Dashboard: Storage -> New bucket -> prolisok-files -> Public OFF.
-- Файли віддаються через довгі signed URL, які створює сервер із service role key.


-- Storage bucket for the site. Keep it private; the server uses the service-role key to create signed URLs.
insert into storage.buckets (id, name, public) values ('prolisok-files', 'prolisok-files', false)
on conflict (id) do update set public = false;
