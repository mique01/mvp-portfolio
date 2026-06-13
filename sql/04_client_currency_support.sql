begin;

alter table public.holdings
  add column if not exists is_peso boolean not null default false;

alter table public.holdings
  add column if not exists mep_fx_rate double precision;

alter table public.transactions
  add column if not exists is_peso boolean not null default false;

alter table public.transactions
  add column if not exists mep_fx_rate double precision;

alter table public.holdings
  drop constraint if exists holdings_mep_fx_rate_positive;

alter table public.holdings
  add constraint holdings_mep_fx_rate_positive
  check (mep_fx_rate is null or mep_fx_rate > 0);

alter table public.transactions
  drop constraint if exists transactions_mep_fx_rate_positive;

alter table public.transactions
  add constraint transactions_mep_fx_rate_positive
  check (mep_fx_rate is null or mep_fx_rate > 0);

comment on column public.holdings.is_peso is
  'Marca si la tenencia se cargó originalmente en ARS y debe valuarse dolarizada vía MEP.';

comment on column public.holdings.mep_fx_rate is
  'Tipo de cambio MEP histórico usado para convertir el costo de la tenencia cuando se cargó en ARS.';

comment on column public.transactions.is_peso is
  'Marca si la operación se ingresó en ARS.';

comment on column public.transactions.mep_fx_rate is
  'Tipo de cambio MEP del momento de la operación cuando la carga se hizo en ARS.';

commit;
