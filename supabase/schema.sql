-- GalaxyEx simulation schema
-- Compatible with Supabase Postgres

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text unique not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  asset text not null check (asset in ('USDT', 'BTC', 'ETH')),
  available numeric(20, 8) not null default 0,
  in_earn numeric(20, 8) not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, asset)
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  pair text not null check (pair in ('BTC/USDT', 'ETH/USDT')),
  side text not null check (side in ('buy', 'sell')),
  quantity numeric(20, 8) not null,
  price numeric(20, 8) not null,
  fee numeric(20, 8) not null,
  status text not null default 'filled' check (status in ('filled')),
  created_at timestamptz not null default now()
);

create index if not exists trades_user_created_idx on public.trades(user_id, created_at desc);

create table if not exists public.yield_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount numeric(20, 8) not null,
  apy numeric(8, 4) not null,
  accrued_profit numeric(20, 8) not null default 0,
  started_at timestamptz not null default now(),
  last_accrued_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'closed'))
);

create index if not exists yield_positions_user_status_idx on public.yield_positions(user_id, status);

create table if not exists public.platform_config (
  id boolean primary key default true,
  apy numeric(8, 4) not null default 12,
  trading_fee_bps integer not null default 8,
  spread_bps integer not null default 18,
  bot_enabled boolean not null default true,
  bot_trades_per_minute integer not null default 6,
  bot_max_order_notional numeric(20, 8) not null default 1200,
  updated_at timestamptz not null default now(),
  check (id)
);

insert into public.platform_config (id)
values (true)
on conflict (id) do nothing;

alter table public.users enable row level security;
alter table public.balances enable row level security;
alter table public.trades enable row level security;
alter table public.yield_positions enable row level security;

create policy "Users can read own profile"
on public.users
for select
using (auth.uid() = auth_user_id);

create policy "Users can read own balances"
on public.balances
for select
using (
  exists (
    select 1
    from public.users u
    where u.id = balances.user_id
      and u.auth_user_id = auth.uid()
  )
);

create policy "Users can read own trades"
on public.trades
for select
using (
  exists (
    select 1
    from public.users u
    where u.id = trades.user_id
      and u.auth_user_id = auth.uid()
  )
);

create policy "Users can read own yield positions"
on public.yield_positions
for select
using (
  exists (
    select 1
    from public.users u
    where u.id = yield_positions.user_id
      and u.auth_user_id = auth.uid()
  )
);
