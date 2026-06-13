-- Portfolio value tracking snapshots
-- Run after sql/02_production_migration.sql and sql/03_rls.sql.

create table if not exists public.portfolio_value_snapshots (
  client_id text not null references public.clients(id) on delete cascade,
  advisor_id uuid not null references public.advisors(id) on delete restrict,
  snapshot_date date not null,
  total_value double precision not null,
  created_at timestamptz not null default now(),
  primary key (client_id, snapshot_date)
);

create index if not exists idx_portfolio_value_snapshots_client_date_desc
  on public.portfolio_value_snapshots (client_id, snapshot_date desc);

create index if not exists idx_portfolio_value_snapshots_advisor_date_desc
  on public.portfolio_value_snapshots (advisor_id, snapshot_date desc);

alter table public.portfolio_value_snapshots enable row level security;

drop policy if exists portfolio_value_snapshots_select_policy on public.portfolio_value_snapshots;
create policy portfolio_value_snapshots_select_policy
on public.portfolio_value_snapshots
for select
using (app.can_access_advisor(advisor_id));

drop policy if exists portfolio_value_snapshots_insert_policy on public.portfolio_value_snapshots;
create policy portfolio_value_snapshots_insert_policy
on public.portfolio_value_snapshots
for insert
with check (app.can_access_advisor(advisor_id));

drop policy if exists portfolio_value_snapshots_update_policy on public.portfolio_value_snapshots;
create policy portfolio_value_snapshots_update_policy
on public.portfolio_value_snapshots
for update
using (app.can_access_advisor(advisor_id))
with check (app.can_access_advisor(advisor_id));

drop policy if exists portfolio_value_snapshots_delete_policy on public.portfolio_value_snapshots;
create policy portfolio_value_snapshots_delete_policy
on public.portfolio_value_snapshots
for delete
using (app.can_access_advisor(advisor_id));
