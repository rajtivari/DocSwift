-- DocSwift free-tier database foundation for Supabase.
-- Run this file in Supabase Dashboard -> SQL Editor.
-- Keep service-role keys on the server only. Never place them in Vite/client variables.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  status text not null default 'inactive' check (status in ('inactive', 'active', 'expired', 'cancelled', 'pending')),
  provider text check (provider in ('razorpay')),
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists subscriptions_status_period_idx on public.subscriptions(status, current_period_end);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'razorpay' check (provider in ('razorpay')),
  provider_order_id text unique,
  provider_payment_id text unique,
  amount_paise integer not null check (amount_paise >= 0),
  currency text not null default 'INR',
  status text not null default 'created' check (status in ('created', 'authorized', 'captured', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments(user_id);

create table if not exists public.operation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null,
  file_name text,
  input_bytes bigint check (input_bytes is null or input_bytes >= 0),
  output_bytes bigint check (output_bytes is null or output_bytes >= 0),
  status text not null default 'completed' check (status in ('completed', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists operation_history_user_created_idx
  on public.operation_history(user_id, created_at desc);

-- Razorpay webhook events are recorded once to make processing idempotent.
create table if not exists public.webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.operation_history enable row level security;
alter table public.webhook_events enable row level security;

-- Signed-in users may read their own profile, subscription and payment history.
-- Writes to billing entitlements/payments must happen only from trusted server code.
drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Insert own profile" on public.profiles;
create policy "Insert own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Read own subscription" on public.subscriptions;
create policy "Read own subscription" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Read own payments" on public.payments;
create policy "Read own payments" on public.payments
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Read own operation history" on public.operation_history;
create policy "Read own operation history" on public.operation_history
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Insert own operation history" on public.operation_history;
create policy "Insert own operation history" on public.operation_history
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- No client policies for webhook_events, subscription writes or payment writes.
-- The server uses the Supabase service-role key to perform verified billing updates.
