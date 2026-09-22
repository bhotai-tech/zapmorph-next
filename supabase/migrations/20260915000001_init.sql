-- ZapMorph — initial schema.
-- Every table has RLS enabled in this migration. Money and entitlement tables
-- have NO client write policies: all writes go through the service-role client
-- in trusted server code (checkout API, Paddle webhook, usage API).

-- ─────────────────────────────────────────────────────────────────────────────
-- Shared helpers
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.update_updated_at()
returns trigger language plpgsql set search_path = public as
$$ begin new.updated_at = now(); return new; end; $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles — 1:1 with auth.users
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users_read_own_profile"
on public.profiles for select
using (auth.uid() = id);

create policy "users_update_own_profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as
$$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Users who signed up before this migration ran have no profile yet.
insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', '') from auth.users
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- plans — authoritative prices (public read, server-managed)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.plans (
  id text primary key,
  name text not null,
  price_cents integer not null check (price_cents > 0),
  compare_at_price_cents integer check (compare_at_price_cents > price_cents),
  currency text not null default 'USD',
  billing_period text not null check (billing_period in ('monthly', 'yearly', 'lifetime')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.plans enable row level security;

create policy "anyone_reads_active_plans"
on public.plans for select
using (is_active = true);

-- Keep in sync with src/lib/plans.ts (display catalog).
insert into public.plans (id, name, price_cents, compare_at_price_cents, billing_period) values
  ('pro-monthly', 'Pro', 900, null, 'monthly'),
  ('pro-yearly', 'Pro', 7200, 10800, 'yearly'),
  ('pro-lifetime', 'Lifetime', 9900, 14900, 'lifetime')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- billing_customers — app user ↔ Paddle customer (no client access at all).
-- Not a profiles column: profiles has a client update policy, and a user must
-- never be able to point their account at another customer.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.billing_customers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  paddle_customer_id text not null unique,
  created_at timestamptz not null default now()
);

alter table public.billing_customers enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- subscriptions — mirrors the Paddle subscription created by a monthly/yearly checkout
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status text not null default 'initialized'
    check (status in ('initialized', 'active', 'past_due', 'paused', 'cancelled', 'failed')),
  paddle_subscription_id text unique,
  next_charge_at timestamptz,
  -- End of the period the customer has paid for (Paddle current_billing_period.ends_at).
  current_period_ends_at timestamptz,
  -- Set when auto-renewal is cancelled: the date the subscription actually ends.
  cancel_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "users_read_own_subscriptions"
on public.subscriptions for select
using (auth.uid() = user_id);

create index subscriptions_user_id_idx on public.subscriptions(user_id);

create trigger subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- orders — one row per Paddle transaction (checkout or renewal)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null references public.plans(id),
  subscription_id uuid references public.subscriptions(id),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'USD',
  status text not null default 'created'
    check (status in ('created', 'pending', 'paid', 'failed', 'refunded')),
  paddle_transaction_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "users_read_own_orders"
on public.orders for select
using (auth.uid() = user_id);

create index orders_user_id_idx on public.orders(user_id);
create index orders_subscription_id_idx on public.orders(subscription_id);

create trigger orders_updated_at
before update on public.orders
for each row execute function public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- payments — payment record per completed Paddle transaction
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  paddle_transaction_id text unique,
  amount_cents integer,
  method text,
  status text not null check (status in ('success', 'refunded')),
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "users_read_own_payments"
on public.payments for select
using (exists (
  select 1 from public.orders o
  where o.id = payments.order_id and o.user_id = auth.uid()
));

create index payments_order_id_idx on public.payments(order_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- entitlements — Pro access. Lifetime: expires_at null. Subscription: end of
-- the paid period, extended on each renewal. Revoked on full refund/chargeback.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null references public.plans(id),
  order_id uuid not null unique references public.orders(id),
  subscription_id uuid references public.subscriptions(id),
  status text not null default 'active' check (status in ('active', 'revoked')),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

create policy "users_read_own_entitlements"
on public.entitlements for select
using (auth.uid() = user_id);

create index entitlements_user_id_idx on public.entitlements(user_id);
create index entitlements_subscription_id_idx on public.entitlements(subscription_id);

create trigger entitlements_updated_at
before update on public.entitlements
for each row execute function public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- webhook_events — idempotency ledger (no client access at all)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  payload jsonb not null,               -- sanitized subset only
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

alter table public.webhook_events enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_logs — billing/entitlement change trail (no client access at all)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,                  -- user id | 'system' | 'webhook'
  action text not null,
  entity text,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create index audit_logs_entity_idx on public.audit_logs(entity, entity_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- rate_limits — fixed-window limiter (service role only)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;

create or replace function public.rate_limit_hit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as r (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count = case when r.reset_at <= now() then 1 else r.count + 1 end,
        reset_at = case
          when r.reset_at <= now() then now() + make_interval(secs => p_window_seconds)
          else r.reset_at
        end
  returning r.count into v_count;

  if random() < 0.01 then
    delete from public.rate_limits where reset_at < now() - interval '1 hour';
  end if;

  return v_count <= p_limit;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- usage_daily — files converted per subject ('user:<uuid>' | 'ip:<hmac>') per UTC day
-- converter_stats — runs per converter per day (product analytics)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.usage_daily (
  subject text not null,
  day date not null,
  conversions integer not null default 0,
  pro_conversions integer not null default 0,
  bytes bigint not null default 0,
  primary key (subject, day)
);

alter table public.usage_daily enable row level security;
revoke all on table public.usage_daily from anon, authenticated;

create table if not exists public.converter_stats (
  slug text not null,
  day date not null,
  runs integer not null default 0,
  files integer not null default 0,
  primary key (slug, day)
);

alter table public.converter_stats enable row level security;
revoke all on table public.converter_stats from anon, authenticated;

-- Atomically checks and records one conversion run of p_files files.
-- A null limit means unlimited. The row lock makes concurrent runs count exactly.
create or replace function public.consume_usage(
  p_subject text,
  p_slug text,
  p_files integer,
  p_bytes bigint,
  p_is_pro_tool boolean,
  p_file_limit integer,
  p_pro_limit integer
)
returns table (allowed boolean, reason text, used integer, pro_used integer)
language plpgsql
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_conversions integer;
  v_pro integer;
begin
  insert into public.usage_daily (subject, day) values (p_subject, v_day)
  on conflict (subject, day) do nothing;

  select u.conversions, u.pro_conversions into v_conversions, v_pro
  from public.usage_daily u
  where u.subject = p_subject and u.day = v_day
  for update;

  if p_file_limit is not null and v_conversions + p_files > p_file_limit then
    return query select false, 'daily_limit'::text, v_conversions, v_pro;
    return;
  end if;

  if p_is_pro_tool and p_pro_limit is not null and v_pro + 1 > p_pro_limit then
    return query select false, 'pro_limit'::text, v_conversions, v_pro;
    return;
  end if;

  update public.usage_daily u
  set conversions = u.conversions + p_files,
      pro_conversions = u.pro_conversions + (case when p_is_pro_tool then 1 else 0 end),
      bytes = u.bytes + greatest(p_bytes, 0)
  where u.subject = p_subject and u.day = v_day;

  insert into public.converter_stats as s (slug, day, runs, files)
  values (p_slug, v_day, 1, p_files)
  on conflict (slug, day) do update
    set runs = s.runs + 1, files = s.files + excluded.files;

  return query select
    true,
    null::text,
    v_conversions + p_files,
    v_pro + (case when p_is_pro_tool then 1 else 0 end);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Function hardening: Postgres grants EXECUTE to PUBLIC by default.
-- ─────────────────────────────────────────────────────────────────────────────
revoke execute on function public.update_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.rate_limit_hit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

revoke execute on function public.consume_usage(text, text, integer, bigint, boolean, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_usage(text, text, integer, bigint, boolean, integer, integer)
  to service_role;
