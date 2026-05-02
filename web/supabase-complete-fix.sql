-- Complete schema fixer for admin + settings + chatbot product usage.
-- Run this once in Supabase SQL Editor.

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists username text unique,
  add column if not exists avatar_url text,
  add column if not exists updated_at timestamptz default now(),
  add column if not exists is_admin boolean not null default false;

-- Admin users allowlist table
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12,2) not null default 0,
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.products
  add column if not exists category text not null default 'general',
  add column if not exists description text not null default '';

-- Fashion videos
create table if not exists public.fashion_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  embed_url text not null,
  created_at timestamptz not null default now()
);

-- Settings tables
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone_number text not null,
  address_line text not null,
  city text not null,
  state text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  order_updates boolean not null default true,
  promotions boolean not null default true,
  new_arrivals boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Auto profile creation
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

-- RLS
alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.fashion_videos enable row level security;
alter table public.addresses enable row level security;
alter table public.wishlist enable row level security;
alter table public.notification_settings enable row level security;

-- Policies
drop policy if exists "profiles_owner_all" on public.profiles;
create policy "profiles_owner_all" on public.profiles
for all to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "admin_users_read_own" on public.admin_users;
create policy "admin_users_read_own" on public.admin_users
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "products_read_all" on public.products;
create policy "products_read_all" on public.products
for select to authenticated
using (true);

drop policy if exists "videos_read_all" on public.fashion_videos;
create policy "videos_read_all" on public.fashion_videos
for select to authenticated
using (true);

drop policy if exists "addresses_owner_all" on public.addresses;
create policy "addresses_owner_all" on public.addresses
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "wishlist_owner_all" on public.wishlist;
create policy "wishlist_owner_all" on public.wishlist
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "notification_owner_all" on public.notification_settings;
create policy "notification_owner_all" on public.notification_settings
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
