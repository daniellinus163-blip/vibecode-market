-- Run this in Supabase SQL Editor if profiles exists but is_admin is missing.
-- Fixes: column profiles.is_admin does not exist

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is 'When true, user may access /admin APIs (also use admin_users or ADMIN_EMAILS).';
