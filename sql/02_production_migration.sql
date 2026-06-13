-- Neon CRM Production Migration
-- Run AFTER sql/01_audit_checks.sql (and after fixing any critical anomalies).
-- This script hardens schema, data types, constraints, joins, and indexing.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- -----------------------------------------------------------------------------
-- 1) Multi-tenant foundation (advisor scope)
-- -----------------------------------------------------------------------------
create table if not exists public.advisors (
  id uuid primary key,
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_advisors_code_not_blank check (btrim(code) <> ''),
  constraint ck_advisors_name_not_blank check (btrim(name) <> '')
);

insert into public.advisors (id, code, name)
values ('00000000-0000-0000-0000-000000000001', 'default', 'Default Advisor')
on conflict (id) do nothing;

alter table public.clients
  add column if not exists advisor_id uuid,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

update public.clients
set advisor_id = '00000000-0000-0000-0000-000000000001'
where advisor_id is null;

alter table public.clients
  alter column advisor_id set not null,
  alter column advisor_id set default '00000000-0000-0000-0000-000000000001';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fk_clients_advisor'
      and conrelid = 'public.clients'::regclass
  ) then
    alter table public.clients
      add constraint fk_clients_advisor
      foreign key (advisor_id) references public.advisors(id)
      on delete restrict;
  end if;
end $$;

alter table public.model_portfolios
  add column if not exists advisor_id uuid;

update public.model_portfolios
set advisor_id = '00000000-0000-0000-0000-000000000001'
where advisor_id is null;

alter table public.model_portfolios
  alter column advisor_id set not null,
  alter column advisor_id set default '00000000-0000-0000-0000-000000000001';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fk_model_portfolios_advisor'
      and conrelid = 'public.model_portfolios'::regclass
  ) then
    alter table public.model_portfolios
      add constraint fk_model_portfolios_advisor
      foreign key (advisor_id) references public.advisors(id)
      on delete restrict;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2) Domain types for financial consistency
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'asset_type_enum') then
    create type public.asset_type_enum as enum ('Bono', 'Acción', 'CEDEAR', 'Fondo', 'ON', 'Letra');
  end if;

  if not exists (select 1 from pg_type where typname = 'tx_type_enum') then
    create type public.tx_type_enum as enum ('Compra', 'Venta', 'Suscripción', 'Rescate');
  end if;

  if not exists (select 1 from pg_type where typname = 'tx_status_enum') then
    create type public.tx_status_enum as enum ('Ejecutada', 'Pendiente', 'Cancelada');
  end if;
end $$;

-- Normalize textual domains before enum conversion.
update public.holdings
set type = case
  when lower(type) = 'bono' then 'Bono'
  when lower(type) in ('accion', 'acción') then 'Acción'
  when lower(type) = 'cedear' then 'CEDEAR'
  when lower(type) = 'fondo' then 'Fondo'
  when lower(type) = 'on' then 'ON'
  when lower(type) = 'letra' then 'Letra'
  else 'CEDEAR'
end
where type not in ('Bono', 'Acción', 'CEDEAR', 'Fondo', 'ON', 'Letra');

update public.transactions
set type = case
  when lower(type) = 'compra' then 'Compra'
  when lower(type) = 'venta' then 'Venta'
  when lower(type) in ('suscripcion', 'suscripción') then 'Suscripción'
  when lower(type) = 'rescate' then 'Rescate'
  else 'Compra'
end
where type not in ('Compra', 'Venta', 'Suscripción', 'Rescate');

update public.transactions
set asset_type = case
  when lower(asset_type) = 'bono' then 'Bono'
  when lower(asset_type) in ('accion', 'acción') then 'Acción'
  when lower(asset_type) = 'cedear' then 'CEDEAR'
  when lower(asset_type) = 'fondo' then 'Fondo'
  when lower(asset_type) = 'on' then 'ON'
  when lower(asset_type) = 'letra' then 'Letra'
  else 'CEDEAR'
end
where asset_type not in ('Bono', 'Acción', 'CEDEAR', 'Fondo', 'ON', 'Letra');

update public.transactions
set status = case
  when lower(status) = 'ejecutada' then 'Ejecutada'
  when lower(status) = 'pendiente' then 'Pendiente'
  when lower(status) = 'cancelada' then 'Cancelada'
  else 'Ejecutada'
end
where status not in ('Ejecutada', 'Pendiente', 'Cancelada');

update public.model_portfolio_holdings
set type = case
  when lower(type) = 'bono' then 'Bono'
  when lower(type) in ('accion', 'acción') then 'Acción'
  when lower(type) = 'cedear' then 'CEDEAR'
  when lower(type) = 'fondo' then 'Fondo'
  when lower(type) = 'on' then 'ON'
  when lower(type) = 'letra' then 'Letra'
  else 'CEDEAR'
end
where type not in ('Bono', 'Acción', 'CEDEAR', 'Fondo', 'ON', 'Letra');

-- -----------------------------------------------------------------------------
-- 3) Precision-safe financial types + normalized symbols
-- -----------------------------------------------------------------------------
update public.holdings set asset = upper(btrim(asset)) where asset <> upper(btrim(asset));
update public.transactions set asset = upper(btrim(asset)) where asset <> upper(btrim(asset));
update public.model_portfolio_holdings set asset = upper(btrim(asset)) where asset <> upper(btrim(asset));

alter table public.clients
  alter column email type citext using email::citext,
  alter column comitente type citext using comitente::citext,
  alter column expected_commission_pct type numeric(8,4) using round(expected_commission_pct::numeric, 4);

alter table public.holdings
  alter column type type public.asset_type_enum using type::public.asset_type_enum,
  alter column quantity type numeric(28,10) using round(quantity::numeric, 10),
  alter column avg_price type numeric(28,10) using round(avg_price::numeric, 10),
  alter column current_price type numeric(28,10) using round(current_price::numeric, 10),
  alter column perf_d1 type numeric(9,4) using round(perf_d1::numeric, 4),
  alter column perf_d30 type numeric(9,4) using round(perf_d30::numeric, 4),
  alter column perf_y1 type numeric(9,4) using round(perf_y1::numeric, 4);

alter table public.transactions
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists external_ref text;

alter table public.transactions
  alter column type type public.tx_type_enum using type::public.tx_type_enum,
  alter column asset_type type public.asset_type_enum using asset_type::public.asset_type_enum,
  alter column status type public.tx_status_enum using status::public.tx_status_enum,
  alter column quantity type numeric(28,10) using round(quantity::numeric, 10),
  alter column price type numeric(28,10) using round(price::numeric, 10),
  alter column commission type numeric(28,10) using round(commission::numeric, 10);

alter table public.model_portfolio_holdings
  alter column type type public.asset_type_enum using type::public.asset_type_enum,
  alter column quantity type numeric(28,10) using round(quantity::numeric, 10),
  alter column avg_price type numeric(28,10) using round(avg_price::numeric, 10),
  alter column current_price type numeric(28,10) using round(current_price::numeric, 10),
  alter column weight_pct type numeric(7,4) using round(coalesce(weight_pct, quantity)::numeric, 4),
  alter column weight_pct set not null,
  alter column perf_d1 type numeric(9,4) using round(perf_d1::numeric, 4),
  alter column perf_d30 type numeric(9,4) using round(perf_d30::numeric, 4),
  alter column perf_y1 type numeric(9,4) using round(perf_y1::numeric, 4);

-- -----------------------------------------------------------------------------
-- 4) Asset catalog + validated joins
-- -----------------------------------------------------------------------------
create table if not exists public.assets (
  symbol text primary key,
  asset_type public.asset_type_enum not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_assets_symbol_upper check (symbol = upper(symbol)),
  constraint ck_assets_symbol_not_blank check (btrim(symbol) <> '')
);

with candidate_types as (
  select upper(btrim(asset)) as symbol, type::text as asset_type from public.holdings
  union all
  select upper(btrim(asset)) as symbol, asset_type::text as asset_type from public.transactions
  union all
  select upper(btrim(asset)) as symbol, type::text as asset_type from public.model_portfolio_holdings
),
ranked as (
  select
    symbol,
    asset_type,
    count(*) as c,
    row_number() over (partition by symbol order by count(*) desc, asset_type asc) as rn
  from candidate_types
  where symbol <> ''
  group by symbol, asset_type
)
insert into public.assets (symbol, asset_type)
select symbol, asset_type::public.asset_type_enum
from ranked
where rn = 1
on conflict (symbol) do update
set
  asset_type = excluded.asset_type,
  updated_at = now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fk_holdings_asset'
      and conrelid = 'public.holdings'::regclass
  ) then
    alter table public.holdings
      add constraint fk_holdings_asset
      foreign key (asset) references public.assets(symbol)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fk_transactions_asset'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint fk_transactions_asset
      foreign key (asset) references public.assets(symbol)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fk_model_portfolio_holdings_asset'
      and conrelid = 'public.model_portfolio_holdings'::regclass
  ) then
    alter table public.model_portfolio_holdings
      add constraint fk_model_portfolio_holdings_asset
      foreign key (asset) references public.assets(symbol)
      on delete restrict
      not valid;
  end if;
end $$;

alter table public.holdings validate constraint fk_holdings_asset;
alter table public.transactions validate constraint fk_transactions_asset;
alter table public.model_portfolio_holdings validate constraint fk_model_portfolio_holdings_asset;

-- -----------------------------------------------------------------------------
-- 5) Check constraints (financial correctness)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ck_clients_expected_commission_pct') then
    alter table public.clients
      add constraint ck_clients_expected_commission_pct
      check (expected_commission_pct >= 0 and expected_commission_pct <= 100) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ck_clients_name_not_blank') then
    alter table public.clients
      add constraint ck_clients_name_not_blank
      check (btrim(name) <> '') not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ck_holdings_quantity_positive') then
    alter table public.holdings
      add constraint ck_holdings_quantity_positive
      check (quantity > 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ck_holdings_prices_positive') then
    alter table public.holdings
      add constraint ck_holdings_prices_positive
      check (avg_price > 0 and current_price > 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ck_transactions_quantity_positive') then
    alter table public.transactions
      add constraint ck_transactions_quantity_positive
      check (quantity > 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ck_transactions_price_positive') then
    alter table public.transactions
      add constraint ck_transactions_price_positive
      check (price > 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ck_transactions_commission_non_negative') then
    alter table public.transactions
      add constraint ck_transactions_commission_non_negative
      check (commission >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ck_model_holdings_weight_pct_range') then
    alter table public.model_portfolio_holdings
      add constraint ck_model_holdings_weight_pct_range
      check (weight_pct > 0 and weight_pct <= 100) not valid;
  end if;
end $$;

alter table public.clients validate constraint ck_clients_expected_commission_pct;
alter table public.clients validate constraint ck_clients_name_not_blank;
alter table public.holdings validate constraint ck_holdings_quantity_positive;
alter table public.holdings validate constraint ck_holdings_prices_positive;
alter table public.transactions validate constraint ck_transactions_quantity_positive;
alter table public.transactions validate constraint ck_transactions_price_positive;
alter table public.transactions validate constraint ck_transactions_commission_non_negative;
alter table public.model_portfolio_holdings validate constraint ck_model_holdings_weight_pct_range;

-- -----------------------------------------------------------------------------
-- 6) Updated-at automation + indexes
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists trg_model_portfolios_updated_at on public.model_portfolios;
create trigger trg_model_portfolios_updated_at
before update on public.model_portfolios
for each row execute function public.set_updated_at();

drop trigger if exists trg_model_portfolio_holdings_updated_at on public.model_portfolio_holdings;
create trigger trg_model_portfolio_holdings_updated_at
before update on public.model_portfolio_holdings
for each row execute function public.set_updated_at();

drop trigger if exists trg_assets_updated_at on public.assets;
create trigger trg_assets_updated_at
before update on public.assets
for each row execute function public.set_updated_at();

drop trigger if exists trg_advisors_updated_at on public.advisors;
create trigger trg_advisors_updated_at
before update on public.advisors
for each row execute function public.set_updated_at();

create index if not exists idx_clients_advisor_id on public.clients (advisor_id);
create index if not exists idx_clients_last_activity_desc on public.clients (last_activity desc);
create index if not exists idx_holdings_asset on public.holdings (asset);
create index if not exists idx_transactions_asset on public.transactions (asset);
create index if not exists idx_transactions_client_asset_date on public.transactions (client_id, asset, date desc);
create index if not exists idx_transactions_client_date_created on public.transactions (client_id, date desc, created_at desc);
create index if not exists idx_model_portfolios_advisor_id on public.model_portfolios (advisor_id);
create index if not exists idx_model_portfolio_holdings_asset on public.model_portfolio_holdings (asset);
create unique index if not exists uq_transactions_external_ref on public.transactions (external_ref) where external_ref is not null;

-- -----------------------------------------------------------------------------
-- 7) Portfolio tracking reconciliation view
-- -----------------------------------------------------------------------------
create or replace view public.vw_holdings_reconciliation as
with tx_net as (
  select
    t.client_id,
    t.asset,
    sum(
      case
        when t.type in ('Compra', 'Suscripción') then t.quantity
        when t.type in ('Venta', 'Rescate') then -t.quantity
        else 0::numeric
      end
    ) as net_qty
  from public.transactions t
  where t.status = 'Ejecutada'
  group by t.client_id, t.asset
)
select
  coalesce(h.client_id, x.client_id) as client_id,
  coalesce(h.asset, x.asset) as asset,
  coalesce(h.quantity, 0::numeric) as holdings_qty,
  coalesce(x.net_qty, 0::numeric) as tx_net_qty,
  coalesce(h.quantity, 0::numeric) - coalesce(x.net_qty, 0::numeric) as delta_qty
from public.holdings h
full outer join tx_net x
  on x.client_id = h.client_id
 and x.asset = h.asset;
