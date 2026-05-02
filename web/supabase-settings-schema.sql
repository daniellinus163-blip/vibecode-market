-- Profiles extension for settings page + admin dashboard
alter table if exists public.profiles
  add column if not exists full_name text,
  add column if not exists username text unique,
  add column if not exists avatar_url text,
  add column if not exists updated_at timestamptz default now(),
  add column if not exists is_admin boolean not null default false;

-- Addresses table
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

-- Wishlist table
create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- Notification settings table
create table if not exists public.notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  order_updates boolean not null default true,
  promotions boolean not null default true,
  new_arrivals boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.addresses enable row level security;
alter table public.wishlist enable row level security;
alter table public.notification_settings enable row level security;

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

drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update" on public.profiles
for all to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
