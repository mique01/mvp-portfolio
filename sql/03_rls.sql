-- Neon CRM Row-Level Security (RLS)
-- Run AFTER sql/02_production_migration.sql.
-- This setup isolates rows by advisor_id while still allowing owner/service access.

create schema if not exists app;

create or replace function app.current_advisor_id()
returns uuid
language plpgsql
stable
as $$
declare
  v_text text;
  v_claims jsonb;
  v_result uuid;
begin
  -- Option 1: explicit session setting (recommended for backend connections)
  v_text := nullif(current_setting('app.advisor_id', true), '');
  if v_text is not null then
    begin
      v_result := v_text::uuid;
      return v_result;
    exception when others then
      return null;
    end;
  end if;

  -- Option 2: JWT claim from request context (Data API / PostgREST style)
  begin
    v_text := nullif(current_setting('request.jwt.claims', true), '');
    if v_text is not null then
      v_claims := v_text::jsonb;
      if v_claims ? 'advisor_id' then
        begin
          v_result := (v_claims ->> 'advisor_id')::uuid;
          return v_result;
        exception when others then
          return null;
        end;
      end if;
    end if;
  exception when others then
    return null;
  end;

  return null;
end;
$$;

create or replace function app.is_service_access()
returns boolean
language plpgsql
stable
as $$
declare
  v_text text;
  v_claims jsonb;
  v_role text;
begin
  if current_user = 'neondb_owner' then
    return true;
  end if;

  begin
    v_text := nullif(current_setting('request.jwt.claims', true), '');
    if v_text is null then
      return false;
    end if;
    v_claims := v_text::jsonb;
    v_role := v_claims ->> 'role';
    return v_role in ('service_role', 'admin');
  exception when others then
    return false;
  end;
end;
$$;

create or replace function app.can_access_advisor(target_advisor_id uuid)
returns boolean
language sql
stable
as $$
  select app.is_service_access()
      or app.current_advisor_id() = target_advisor_id
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS
-- -----------------------------------------------------------------------------
alter table public.clients enable row level security;
alter table public.holdings enable row level security;
alter table public.transactions enable row level security;
alter table public.model_portfolios enable row level security;
alter table public.model_portfolio_holdings enable row level security;
alter table public.assets enable row level security;
alter table public.advisors enable row level security;

-- -----------------------------------------------------------------------------
-- Clients policies
-- -----------------------------------------------------------------------------
drop policy if exists clients_select_policy on public.clients;
create policy clients_select_policy
on public.clients
for select
using (app.can_access_advisor(advisor_id));

drop policy if exists clients_insert_policy on public.clients;
create policy clients_insert_policy
on public.clients
for insert
with check (app.can_access_advisor(advisor_id));

drop policy if exists clients_update_policy on public.clients;
create policy clients_update_policy
on public.clients
for update
using (app.can_access_advisor(advisor_id))
with check (app.can_access_advisor(advisor_id));

drop policy if exists clients_delete_policy on public.clients;
create policy clients_delete_policy
on public.clients
for delete
using (app.can_access_advisor(advisor_id));

-- -----------------------------------------------------------------------------
-- Holdings policies (via parent client advisor scope)
-- -----------------------------------------------------------------------------
drop policy if exists holdings_select_policy on public.holdings;
create policy holdings_select_policy
on public.holdings
for select
using (
  exists (
    select 1
    from public.clients c
    where c.id = holdings.client_id
      and app.can_access_advisor(c.advisor_id)
  )
);

drop policy if exists holdings_insert_policy on public.holdings;
create policy holdings_insert_policy
on public.holdings
for insert
with check (
  exists (
    select 1
    from public.clients c
    where c.id = holdings.client_id
      and app.can_access_advisor(c.advisor_id)
  )
);

drop policy if exists holdings_update_policy on public.holdings;
create policy holdings_update_policy
on public.holdings
for update
using (
  exists (
    select 1
    from public.clients c
    where c.id = holdings.client_id
      and app.can_access_advisor(c.advisor_id)
  )
)
with check (
  exists (
    select 1
    from public.clients c
    where c.id = holdings.client_id
      and app.can_access_advisor(c.advisor_id)
  )
);

drop policy if exists holdings_delete_policy on public.holdings;
create policy holdings_delete_policy
on public.holdings
for delete
using (
  exists (
    select 1
    from public.clients c
    where c.id = holdings.client_id
      and app.can_access_advisor(c.advisor_id)
  )
);

-- -----------------------------------------------------------------------------
-- Transactions policies (via parent client advisor scope)
-- -----------------------------------------------------------------------------
drop policy if exists transactions_select_policy on public.transactions;
create policy transactions_select_policy
on public.transactions
for select
using (
  exists (
    select 1
    from public.clients c
    where c.id = transactions.client_id
      and app.can_access_advisor(c.advisor_id)
  )
);

drop policy if exists transactions_insert_policy on public.transactions;
create policy transactions_insert_policy
on public.transactions
for insert
with check (
  exists (
    select 1
    from public.clients c
    where c.id = transactions.client_id
      and app.can_access_advisor(c.advisor_id)
  )
);

drop policy if exists transactions_update_policy on public.transactions;
create policy transactions_update_policy
on public.transactions
for update
using (
  exists (
    select 1
    from public.clients c
    where c.id = transactions.client_id
      and app.can_access_advisor(c.advisor_id)
  )
)
with check (
  exists (
    select 1
    from public.clients c
    where c.id = transactions.client_id
      and app.can_access_advisor(c.advisor_id)
  )
);

drop policy if exists transactions_delete_policy on public.transactions;
create policy transactions_delete_policy
on public.transactions
for delete
using (
  exists (
    select 1
    from public.clients c
    where c.id = transactions.client_id
      and app.can_access_advisor(c.advisor_id)
  )
);

-- -----------------------------------------------------------------------------
-- Model portfolio policies
-- -----------------------------------------------------------------------------
drop policy if exists model_portfolios_select_policy on public.model_portfolios;
create policy model_portfolios_select_policy
on public.model_portfolios
for select
using (app.can_access_advisor(advisor_id));

drop policy if exists model_portfolios_insert_policy on public.model_portfolios;
create policy model_portfolios_insert_policy
on public.model_portfolios
for insert
with check (app.can_access_advisor(advisor_id));

drop policy if exists model_portfolios_update_policy on public.model_portfolios;
create policy model_portfolios_update_policy
on public.model_portfolios
for update
using (app.can_access_advisor(advisor_id))
with check (app.can_access_advisor(advisor_id));

drop policy if exists model_portfolios_delete_policy on public.model_portfolios;
create policy model_portfolios_delete_policy
on public.model_portfolios
for delete
using (app.can_access_advisor(advisor_id));

drop policy if exists model_portfolio_holdings_select_policy on public.model_portfolio_holdings;
create policy model_portfolio_holdings_select_policy
on public.model_portfolio_holdings
for select
using (
  exists (
    select 1
    from public.model_portfolios p
    where p.id = model_portfolio_holdings.portfolio_id
      and app.can_access_advisor(p.advisor_id)
  )
);

drop policy if exists model_portfolio_holdings_insert_policy on public.model_portfolio_holdings;
create policy model_portfolio_holdings_insert_policy
on public.model_portfolio_holdings
for insert
with check (
  exists (
    select 1
    from public.model_portfolios p
    where p.id = model_portfolio_holdings.portfolio_id
      and app.can_access_advisor(p.advisor_id)
  )
);

drop policy if exists model_portfolio_holdings_update_policy on public.model_portfolio_holdings;
create policy model_portfolio_holdings_update_policy
on public.model_portfolio_holdings
for update
using (
  exists (
    select 1
    from public.model_portfolios p
    where p.id = model_portfolio_holdings.portfolio_id
      and app.can_access_advisor(p.advisor_id)
  )
)
with check (
  exists (
    select 1
    from public.model_portfolios p
    where p.id = model_portfolio_holdings.portfolio_id
      and app.can_access_advisor(p.advisor_id)
  )
);

drop policy if exists model_portfolio_holdings_delete_policy on public.model_portfolio_holdings;
create policy model_portfolio_holdings_delete_policy
on public.model_portfolio_holdings
for delete
using (
  exists (
    select 1
    from public.model_portfolios p
    where p.id = model_portfolio_holdings.portfolio_id
      and app.can_access_advisor(p.advisor_id)
  )
);

-- -----------------------------------------------------------------------------
-- Reference data policies
-- -----------------------------------------------------------------------------
drop policy if exists assets_select_policy on public.assets;
create policy assets_select_policy
on public.assets
for select
using (true);

drop policy if exists assets_write_policy on public.assets;
create policy assets_write_policy
on public.assets
for all
using (app.is_service_access())
with check (app.is_service_access());

drop policy if exists advisors_select_policy on public.advisors;
create policy advisors_select_policy
on public.advisors
for select
using (app.is_service_access() or id = app.current_advisor_id());

drop policy if exists advisors_write_policy on public.advisors;
create policy advisors_write_policy
on public.advisors
for all
using (app.is_service_access())
with check (app.is_service_access());

-- -----------------------------------------------------------------------------
-- Optional hard lock (commented on purpose)
-- If you uncomment FORCE RLS, even table owners are bound by policies.
-- -----------------------------------------------------------------------------
-- alter table public.clients force row level security;
-- alter table public.holdings force row level security;
-- alter table public.transactions force row level security;
-- alter table public.model_portfolios force row level security;
-- alter table public.model_portfolio_holdings force row level security;
-- alter table public.assets force row level security;
-- alter table public.advisors force row level security;
