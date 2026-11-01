-- Run once in the Finanzplaner project's Supabase SQL editor, after supabase.sql.
begin;
create table if not exists public.klar_push_subscriptions (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null check (octet_length(subscription::text) < 5000),
  created_at timestamptz not null default now()
);
create index if not exists klar_push_owner on public.klar_push_subscriptions(owner_id);
create table if not exists public.klar_push_deliveries (
  subscription_id text not null references public.klar_push_subscriptions(id) on delete cascade,
  delivery_key text not null,
  created_at timestamptz not null default now(),
  primary key (subscription_id, delivery_key)
);
alter table public.klar_push_subscriptions enable row level security;
alter table public.klar_push_deliveries enable row level security;
revoke all on public.klar_push_subscriptions, public.klar_push_deliveries from anon, authenticated;
grant select,insert,update,delete on public.klar_push_subscriptions, public.klar_push_deliveries to service_role;
grant select on public.klar_financial_plans to service_role;
commit;
