-- Neon CRM Audit Checks (read-only)
-- Run this first in Neon SQL Editor to detect data quality and join integrity issues.

-- 1) Core table inventory
select schemaname, relname as table_name, n_live_tup::bigint as est_rows
from pg_stat_user_tables
where schemaname = 'public'
order by relname;

-- 2) Duplicate transactions by business fingerprint (likely double inserts)
select
  client_id,
  date,
  type,
  asset,
  quantity,
  price,
  commission,
  status,
  count(*) as dup_count,
  array_agg(id order by created_at desc) as transaction_ids
from public.transactions
group by client_id, date, type, asset, quantity, price, commission, status
having count(*) > 1
order by dup_count desc, client_id, date desc;

-- 3) Transactions with invalid domain values
select id, client_id, type, asset_type, status
from public.transactions
where type not in ('Compra', 'Venta', 'Suscripción', 'Rescate')
   or asset_type not in ('Bono', 'Acción', 'CEDEAR', 'Fondo', 'ON', 'Letra')
   or status not in ('Ejecutada', 'Pendiente', 'Cancelada')
order by created_at desc;

-- 4) Numeric anomalies in transactions (negative or zero where not allowed)
select id, client_id, date, asset, quantity, price, commission
from public.transactions
where quantity <= 0
   or price <= 0
   or commission < 0
order by date desc, created_at desc;

-- 5) Numeric anomalies in holdings
select client_id, asset, quantity, avg_price, current_price
from public.holdings
where quantity <= 0
   or avg_price <= 0
   or current_price <= 0
order by client_id, asset;

-- 6) Join integrity: holdings without a client (should be zero rows)
select h.*
from public.holdings h
left join public.clients c on c.id = h.client_id
where c.id is null;

-- 7) Join integrity: transactions without a client (should be zero rows)
select t.*
from public.transactions t
left join public.clients c on c.id = t.client_id
where c.id is null;

-- 8) Holdings vs executed transactions reconciliation
-- Positive flow: Compra/Suscripción, negative flow: Venta/Rescate
with tx_net as (
  select
    client_id,
    asset,
    sum(
      case
        when type in ('Compra', 'Suscripción') then quantity
        when type in ('Venta', 'Rescate') then -quantity
        else 0
      end
    ) as net_qty
  from public.transactions
  where status = 'Ejecutada'
  group by client_id, asset
),
diff as (
  select
    coalesce(h.client_id, n.client_id) as client_id,
    coalesce(h.asset, n.asset) as asset,
    coalesce(h.quantity, 0)::numeric as holdings_qty,
    coalesce(n.net_qty, 0)::numeric as tx_net_qty,
    (coalesce(h.quantity, 0)::numeric - coalesce(n.net_qty, 0)::numeric) as delta_qty
  from public.holdings h
  full outer join tx_net n
    on n.client_id = h.client_id
   and n.asset = h.asset
)
select *
from diff
where abs(delta_qty) > 0.000001
order by abs(delta_qty) desc, client_id, asset;

-- 9) Asset type inconsistencies across holdings/transactions
with unioned as (
  select asset, type as asset_type, 'holdings' as source from public.holdings
  union all
  select asset, asset_type, 'transactions' as source from public.transactions
)
select asset, count(distinct asset_type) as distinct_type_count, array_agg(distinct asset_type order by asset_type) as asset_types
from unioned
group by asset
having count(distinct asset_type) > 1
order by distinct_type_count desc, asset;

-- 10) Model portfolio consistency: invalid weights and total weight mismatch
select portfolio_id, asset, weight_pct
from public.model_portfolio_holdings
where weight_pct <= 0 or weight_pct > 100
order by portfolio_id, asset;

select
  portfolio_id,
  sum(weight_pct)::numeric(12,4) as total_weight_pct
from public.model_portfolio_holdings
group by portfolio_id
having abs(sum(weight_pct) - 100) > 0.01
order by portfolio_id;
