-- Orders + line snapshot storage (checkout). Run in Supabase SQL Editor after profiles exist.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  shipping_address jsonb not null default '{}',
  items jsonb not null default '[]',
  total_price numeric(12,2) not null default 0,
  status text not null default 'placed',
  coupon_code text,
  status_events jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.orders enable row level security;

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
for select to authenticated
using (auth.uid() = user_id);

-- Inserts happen from Next.js Route Handlers using the service role (bypasses RLS).
