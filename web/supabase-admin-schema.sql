-- If you already have profiles without is_admin, run first:
-- web/supabase-profiles-add-is-admin.sql

-- Profiles table linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  created_at timestamptz not null default now(),
  is_admin boolean not null default false
);

-- Products table for admin management
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12,2) not null default 0,
  image_url text not null,
  category text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

-- Fashion videos
create table if not exists public.fashion_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  embed_url text not null,
  created_at timestamptz not null default now()
);

-- Auto create profile on signup
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
alter table public.products enable row level security;
alter table public.fashion_videos enable row level security;

-- Basic read policies (admin mutations are handled by service role in API routes)
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles
for select to authenticated
using (auth.uid() = id);

drop policy if exists "products_read_all" on public.products;
create policy "products_read_all" on public.products
for select to authenticated
using (true);

drop policy if exists "videos_read_all" on public.fashion_videos;
create policy "videos_read_all" on public.fashion_videos
for select to authenticated
using (true);
