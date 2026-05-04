-- Run in Supabase → SQL Editor if admin dashboard fails on fashion_videos only.
-- Safe to run multiple times.

create table if not exists public.fashion_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  embed_url text not null,
  created_at timestamptz not null default now()
);

alter table public.fashion_videos enable row level security;

drop policy if exists "videos_read_all" on public.fashion_videos;
create policy "videos_read_all" on public.fashion_videos
for select to authenticated
using (true);
