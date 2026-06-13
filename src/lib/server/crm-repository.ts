import "dotenv/config";
import postgres from "postgres";
import type {
  AssetPerformance,
  AssetType,
  Client,
  Holding,
  Transaction,
  TxType,
} from "@/lib/mock-data";
import { clients as seedClients } from "@/lib/mock-data";
import type {
  BenchmarkComponent,
  MarketDataStatus,
  ModelHolding,
  ModelPortfolio,
} from "@/lib/model-portfolio";
import type { PortfolioSnapshotPoint } from "@/lib/portfolio";
import { loadDollarRates, type DollarQuote, loadMarketSnapshots } from "@/lib/server/market-data";

type DataMode = "database" | "seed";

type DbClientRow = {
  id: string;
  advisor_id: string;
  name: string;
  email: string;
  telefono: string;
  fecha_alta: string;
  comitente: string;
  share_token: string;
  expected_commission_pct: number;
  last_activity: string;
};

type DbHoldingRow = {
  client_id: string;
  asset: string;
  type: AssetType;
  quantity: number;
  avg_price: number;
  current_price: number;
  is_peso: boolean | null;
  mep_fx_rate: number | null;
  perf_d1: number;
  perf_d30: number;
  perf_y1: number;
};

type DbTransactionRow = {
  id: string;
  client_id: string;
  date: string;
  created_at: string;
  type: TxType;
  asset: string;
  asset_type: AssetType;
  quantity: number;
  price: number;
  commission: number;
  is_peso: boolean | null;
  mep_fx_rate: number | null;
  status: "Ejecutada" | "Pendiente" | "Cancelada";
};

type DbModelPortfolioRow = {
  id: string;
  name: string;
  benchmark_name: string;
  updated_at: string;
};

type DbModelPortfolioHoldingRow = {
  portfolio_id: string;
  asset: string;
  type: AssetType;
  quantity: number;
  weight_pct: number | null;
  current_price: number;
  is_peso: boolean | null;
  perf_d1: number;
  perf_d30: number;
  perf_y1: number;
};

type DbPortfolioSnapshotRow = {
  client_id: string;
  snapshot_date: string;
  total_value: number;
};

type StoredClient = Client & {
  advisorId?: string;
  portfolioSnapshots?: PortfolioSnapshotPoint[];
};

export type CreateTransactionInput = {
  clientId: string;
  date: string;
  type: TxType;
  asset: string;
  assetType?: AssetType;
  quantity: number;
  price: number;
  commission?: number;
  status?: "Ejecutada" | "Pendiente" | "Cancelada";
  currentPrice?: number;
  isPeso?: boolean;
  mepFxRate?: number;
  performance?: Partial<AssetPerformance>;
};

export type UpdateTransactionInput = CreateTransactionInput & {
  id: string;
};

export type DeleteTransactionInput = {
  clientId: string;
  id: string;
};

export type CreateClientInput = {
  name: string;
  comitente?: string;
  email?: string;
  telefono?: string;
  fechaAlta?: string;
  expectedCommissionPct?: number;
};

export type UpsertModelHoldingInput = {
  asset: string;
  assetType: AssetType;
  weightPct: number;
  currentPrice?: number;
  isPeso?: boolean;
  performance?: Partial<AssetPerformance>;
};

const DEFAULT_MODEL_PORTFOLIO_ID = "portfolio-crm-model";
const DEFAULT_MODEL_PORTFOLIO_NAME = "Cartera Modelo";
const DEFAULT_MODEL_BENCHMARK_NAME = "60% SPY / 40% QQQ";
const SEED_MODEL_HOLDINGS: ModelHolding[] = [
  {
    asset: "SPY",
    type: "CEDEAR",
    weightPct: 40,
    currentPrice: 518,
    isPeso: false,
    performance: { d1: 0.62, d30: 4.1, y1: 18.9 },
  },
  {
    asset: "QQQ",
    type: "CEDEAR",
    weightPct: 35,
    currentPrice: 447,
    isPeso: false,
    performance: { d1: 0.88, d30: 5.7, y1: 23.4 },
  },
  {
    asset: "AL30",
    type: "Bono",
    weightPct: 25,
    currentPrice: 71.4,
    isPeso: true,
    performance: { d1: 0.84, d30: 4.2, y1: 22.7 },
  },
];

let sqlClient: postgres.Sql | undefined;
let bootstrapPromise: Promise<void> | null = null;
let resolvedDataMode: DataMode | null = null;

function isPlaceholderDatabaseUrl(value: string) {
  return /ep-xxx\.neon\.tech|user:password|dbname/i.test(value);
}

function getConfiguredDatabaseUrl() {
  const rawUrl =
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    null;

  if (!rawUrl || isPlaceholderDatabaseUrl(rawUrl)) {
    return null;
  }

  if (rawUrl.includes("neon.tech") && !/sslmode=/i.test(rawUrl)) {
    const separator = rawUrl.includes("?") ? "&" : "?";
    return `${rawUrl}${separator}sslmode=require`;
  }

  return rawUrl;
}

function resolveDatabaseUrl() {
  const rawUrl = getConfiguredDatabaseUrl();
  if (!rawUrl) {
    throw new Error("Falta DATABASE_URL o NEON_DATABASE_URL para conectar Neon.");
  }
  return rawUrl;
}

function getSqlClient() {
  if (sqlClient) return sqlClient;

  const databaseUrl = resolveDatabaseUrl();

  sqlClient = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    ssl: databaseUrl.includes("neon.tech") ? "require" : undefined,
  });

  return sqlClient;
}

function allowSeedFallback() {
  return (
    process.env.CRM_ALLOW_SEED_FALLBACK === "1" || process.env.CRM_ALLOW_SEED_FALLBACK === "true"
  );
}

function currentDataMode(): DataMode {
  if (resolvedDataMode) return resolvedDataMode;
  if (getConfiguredDatabaseUrl()) return "database";
  return allowSeedFallback() ? "seed" : "database";
}

function holdingRowToModel(row: DbHoldingRow): Holding {
  return {
    asset: row.asset,
    type: row.type,
    quantity: Number(row.quantity),
    avgPrice: Number(row.avg_price),
    currentPrice: Number(row.current_price),
    isPeso: Boolean(row.is_peso),
    mepFxRate: row.mep_fx_rate === null ? null : Number(row.mep_fx_rate),
    performance: {
      d1: Number(row.perf_d1),
      d30: Number(row.perf_d30),
      y1: Number(row.perf_y1),
    },
  };
}

function modelHoldingRowToModel(row: DbModelPortfolioHoldingRow): ModelHolding {
  return {
    asset: row.asset,
    type: row.type,
    weightPct: Number(row.weight_pct ?? row.quantity),
    currentPrice: Number(row.current_price),
    isPeso: Boolean(row.is_peso),
    performance: {
      d1: Number(row.perf_d1),
      d30: Number(row.perf_d30),
      y1: Number(row.perf_y1),
    },
  };
}

function transactionRowToModel(row: DbTransactionRow): Transaction {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    asset: row.asset,
    assetType: row.asset_type,
    quantity: Number(row.quantity),
    price: Number(row.price),
    commission: Number(row.commission),
    isPeso: Boolean(row.is_peso),
    mepFxRate: row.mep_fx_rate === null ? null : Number(row.mep_fx_rate),
    status: row.status,
  };
}

function normalizeUsdValue(value: number, fxRate?: number | null) {
  return fxRate && fxRate > 0 ? value / fxRate : value;
}

function getArgentinaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseDateKey(value: string | Date) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function isTodayInArgentina(date: string | Date) {
  return parseDateKey(date) === getArgentinaDateKey();
}

function assetFxLabel(assetType: AssetType) {
  return assetType === "CEDEAR" ? "CCL" : "MEP";
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function portfolioValueFromHoldings(holdings: Holding[]) {
  return roundMoney(
    holdings.reduce(
      (sum, holding) => sum + Number(holding.quantity) * Number(holding.currentPrice),
      0,
    ),
  );
}

function automaticCommissionRate(assetType: AssetType) {
  if (assetType === "Acción" || assetType === "CEDEAR") return 0.002;
  if (assetType === "Bono" || assetType === "ON" || assetType === "Letra") return 0.001;
  return 0;
}

function calculateAutomaticCommission(assetType: AssetType, amount: number) {
  const commission = amount * automaticCommissionRate(assetType);
  return Number(commission.toFixed(6));
}

function applySnapshotsToHoldings(
  holdings: Holding[],
  snapshots: Map<string, { currentPrice: number; pctChange: number }>,
) {
  return holdings.map((holding) => {
    const snapshot = snapshots.get(holding.asset.trim().toUpperCase());
    const rawCurrentPrice = snapshot?.currentPrice ?? holding.currentPrice;

    return {
      ...holding,
      avgPrice: holding.avgPrice,
      currentPrice: rawCurrentPrice,
      performance: {
        ...holding.performance,
        d1: snapshot?.pctChange ?? holding.performance.d1,
      },
    };
  });
}

function copyTransactionsForPortfolio(transactions: Transaction[]) {
  return transactions.map((transaction) => ({
    ...transaction,
  }));
}

type RebuildAccumulator = {
  asset: string;
  type: AssetType;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  isPeso: boolean;
  mepFxRate: number | null;
  performance: AssetPerformance;
};

function transactionSortValue(row: DbTransactionRow) {
  const dateValue = new Date(row.date).getTime();
  const createdValue = new Date(row.created_at).getTime();
  return dateValue * 1_000_000 + createdValue;
}

function rebuildHoldingsFromTransactions(
  transactions: DbTransactionRow[],
  existingHoldings: DbHoldingRow[],
  clientId: string,
) {
  const existingByAsset = new Map(
    existingHoldings.map((holding) => [
      holding.asset.trim().toUpperCase(),
      {
        type: holding.type,
        currentPrice: Number(holding.current_price),
        isPeso: Boolean(holding.is_peso),
        mepFxRate: holding.mep_fx_rate === null ? null : Number(holding.mep_fx_rate),
        performance: {
          d1: Number(holding.perf_d1),
          d30: Number(holding.perf_d30),
          y1: Number(holding.perf_y1),
        },
      },
    ]),
  );

  const byAsset = new Map<string, RebuildAccumulator>();

  for (const tx of [...transactions].sort(
    (a, b) => transactionSortValue(a) - transactionSortValue(b),
  )) {
    const asset = tx.asset.trim().toUpperCase();
    if (!asset) continue;

    const quantity = Number(tx.quantity);
    const price = Number(tx.price);
    const isPeso = Boolean(tx.is_peso);
    const current =
      byAsset.get(asset) ??
      ({
        asset,
        type: tx.asset_type,
        quantity: 0,
        avgPrice: price,
        currentPrice: existingByAsset.get(asset)?.currentPrice ?? price,
        isPeso,
        mepFxRate: tx.mep_fx_rate === null ? null : Number(tx.mep_fx_rate),
        performance: existingByAsset.get(asset)?.performance ?? { d1: 0, d30: 0, y1: 0 },
      } satisfies RebuildAccumulator);

    if (current.quantity > 0 && current.isPeso !== isPeso) {
      throw new Error(
        "La posición mezcla moneda base distinta. Revisa el historial antes de guardar el cambio.",
      );
    }

    if (tx.type === "Venta" || tx.type === "Rescate") {
      if (current.quantity < quantity - 0.000001) {
        throw new Error("La operación deja la posición en negativo.");
      }

      const avgCost = current.quantity > 0 ? current.avgPrice : 0;
      current.quantity -= quantity;
      current.currentPrice = price;
      if (current.quantity <= 0.000001) {
        current.quantity = 0;
        current.avgPrice = 0;
        current.mepFxRate = null;
      } else {
        current.avgPrice = avgCost;
      }
    } else {
      const previousQuantity = current.quantity;
      const previousRawCost = previousQuantity * current.avgPrice;
      const nextQuantity = previousQuantity + quantity;
      const transactionRate = tx.mep_fx_rate === null ? null : Number(tx.mep_fx_rate);
      const transactionRawCost = quantity * price;
      const transactionUsdCost =
        isPeso && transactionRate
          ? normalizeUsdValue(transactionRawCost, transactionRate)
          : transactionRawCost;
      const previousUsdCost =
        current.isPeso && current.mepFxRate
          ? normalizeUsdValue(previousRawCost, current.mepFxRate)
          : previousRawCost;

      current.quantity = nextQuantity;
      current.avgPrice =
        nextQuantity > 0 ? (previousRawCost + transactionRawCost) / nextQuantity : 0;
      current.currentPrice = price;
      current.isPeso = isPeso;
      current.mepFxRate =
        isPeso && nextQuantity > 0
          ? (() => {
              const combinedRawCost = previousRawCost + transactionRawCost;
              const combinedUsdCost = previousUsdCost + transactionUsdCost;
              return combinedUsdCost > 0 ? combinedRawCost / combinedUsdCost : transactionRate;
            })()
          : null;
    }

    current.type = tx.asset_type;
    byAsset.set(asset, current);
  }

  return [...byAsset.values()]
    .filter((item) => item.quantity > 0.000001)
    .map((item) => ({
      clientId,
      asset: item.asset,
      type: item.type,
      quantity: item.quantity,
      avgPrice: item.avgPrice,
      currentPrice: item.currentPrice,
      isPeso: item.isPeso,
      mepFxRate: item.mepFxRate,
      perfD1: item.performance.d1,
      perfD30: item.performance.d30,
      perfY1: item.performance.y1,
    }));
}

function applySnapshotsToModelHoldings(
  holdings: ModelHolding[],
  snapshots: Map<string, { currentPrice: number; pctChange: number }>,
) {
  return holdings.map((holding) => {
    const snapshot = snapshots.get(holding.asset.trim().toUpperCase());
    if (!snapshot) return holding;

    return {
      ...holding,
      currentPrice: snapshot.currentPrice,
      performance: {
        ...holding.performance,
        d1: snapshot.pctChange,
      },
    };
  });
}

function collectRequestedAssets(holdings: Array<{ asset: string; type: AssetType }>) {
  return holdings.map((holding) => ({
    symbol: holding.asset,
    type: holding.type,
  }));
}

async function persistDailyPortfolioSnapshots(clients: StoredClient[]) {
  if (clients.length === 0) return;

  const sql = getSqlClient();
  const snapshotDate = getArgentinaDateKey();

  await sql.begin(async (tx) => {
    for (const client of clients) {
      if (!client.advisorId) continue;
      await tx`
        insert into portfolio_value_snapshots (
          client_id,
          advisor_id,
          snapshot_date,
          total_value
        ) values (
          ${client.id},
          ${client.advisorId},
          ${snapshotDate},
          ${portfolioValueFromHoldings(client.holdings)}
        )
        on conflict (client_id, snapshot_date) do nothing
      `;
    }
  });
}

async function readPortfolioSnapshotsFromStorage(clientIds: string[]) {
  if (clientIds.length === 0) return new Map<string, PortfolioSnapshotPoint[]>();

  const sql = getSqlClient();
  await ensureDatabaseReady();

  const rows = await sql<DbPortfolioSnapshotRow[]>`
    select
      client_id::text as client_id,
      snapshot_date::text as snapshot_date,
      total_value
    from portfolio_value_snapshots
    where client_id = any(${sql.array(clientIds)})
    order by client_id asc, snapshot_date asc
  `;

  const snapshotsByClient = new Map<string, PortfolioSnapshotPoint[]>();

  for (const row of rows) {
    const bucket = snapshotsByClient.get(row.client_id) ?? [];
    bucket.push({
      date: row.snapshot_date,
      value: Number(row.total_value),
    });
    snapshotsByClient.set(row.client_id, bucket);
  }

  return snapshotsByClient;
}

async function ensureDatabaseReady() {
  const sql = getSqlClient();

  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await sql`
        create table if not exists clients (
          id text primary key,
          name text not null,
          email text not null default '',
          telefono text not null default '',
          fecha_alta date not null default now(),
          comitente text not null unique,
          share_token text not null unique,
          expected_commission_pct double precision not null default 0,
          last_activity date not null,
          created_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists holdings (
          client_id text not null references clients(id) on delete cascade,
          asset text not null,
          type text not null,
          quantity double precision not null,
          avg_price double precision not null,
          current_price double precision not null,
          is_peso boolean not null default false,
          mep_fx_rate double precision,
          perf_d1 double precision not null default 0,
          perf_d30 double precision not null default 0,
          perf_y1 double precision not null default 0,
          updated_at timestamptz not null default now(),
          primary key (client_id, asset)
        )
      `;

      await sql`
        create table if not exists transactions (
          id text primary key,
          client_id text not null references clients(id) on delete cascade,
          date date not null,
          type text not null,
          asset text not null,
          asset_type text not null,
          quantity double precision not null,
          price double precision not null,
          commission double precision not null default 0,
          is_peso boolean not null default false,
          mep_fx_rate double precision,
          status text not null default 'Ejecutada',
          created_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists portfolio_value_snapshots (
          client_id text not null references clients(id) on delete cascade,
          advisor_id uuid not null references advisors(id) on delete restrict,
          snapshot_date date not null,
          total_value double precision not null,
          created_at timestamptz not null default now(),
          primary key (client_id, snapshot_date)
        )
      `;

      await sql`
        alter table holdings
        add column if not exists is_peso boolean not null default false
      `;

      await sql`
        alter table holdings
        add column if not exists mep_fx_rate double precision
      `;

      await sql`
        alter table transactions
        add column if not exists is_peso boolean not null default false
      `;

      await sql`
        alter table transactions
        add column if not exists mep_fx_rate double precision
      `;

      await sql`
        create table if not exists model_portfolios (
          id text primary key,
          name text not null,
          benchmark_name text not null,
          updated_at timestamptz not null default now(),
          created_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists model_portfolio_holdings (
          portfolio_id text not null references model_portfolios(id) on delete cascade,
          asset text not null,
          type text not null,
          quantity double precision not null,
          avg_price double precision not null,
          current_price double precision not null,
          weight_pct double precision not null default 0,
          is_peso boolean not null default false,
          perf_d1 double precision not null default 0,
          perf_d30 double precision not null default 0,
          perf_y1 double precision not null default 0,
          updated_at timestamptz not null default now(),
          primary key (portfolio_id, asset)
        )
      `;

      await sql`
        alter table model_portfolio_holdings
        add column if not exists weight_pct double precision
      `;

      await sql`
        alter table model_portfolio_holdings
        add column if not exists is_peso boolean not null default false
      `;

      await sql`
        with legacy as (
          select
            portfolio_id,
            asset,
            quantity,
            current_price,
            sum(quantity * nullif(current_price, 0)) over (partition by portfolio_id) as total_valued,
            sum(quantity) over (partition by portfolio_id) as total_qty
          from model_portfolio_holdings
          where weight_pct is null
        )
        update model_portfolio_holdings as target
        set weight_pct = case
          when legacy.total_valued > 0 then ((legacy.quantity * legacy.current_price) / legacy.total_valued) * 100
          when legacy.total_qty > 0 then (legacy.quantity / legacy.total_qty) * 100
          else 0
        end
        from legacy
        where target.portfolio_id = legacy.portfolio_id
          and target.asset = legacy.asset
      `;

      await sql`
        alter table model_portfolio_holdings
        alter column weight_pct set default 0
      `;

      await sql`
        update model_portfolio_holdings
        set quantity = weight_pct
        where abs(quantity - weight_pct) > 0.000001
      `;

      await sql`create index if not exists idx_holdings_client_id on holdings (client_id)`;
      await sql`create index if not exists idx_transactions_client_id on transactions (client_id)`;
      await sql`create index if not exists idx_transactions_date on transactions (date desc)`;
      await sql`
        create index if not exists idx_portfolio_value_snapshots_client_date_desc
        on portfolio_value_snapshots (client_id, snapshot_date desc)
      `;
      await sql`
        create index if not exists idx_portfolio_value_snapshots_advisor_date_desc
        on portfolio_value_snapshots (advisor_id, snapshot_date desc)
      `;

      await sql`
        insert into model_portfolios (id, name, benchmark_name)
        values (${DEFAULT_MODEL_PORTFOLIO_ID}, ${DEFAULT_MODEL_PORTFOLIO_NAME}, ${DEFAULT_MODEL_BENCHMARK_NAME})
        on conflict (id) do nothing
      `;

      const [{ count: clientCount }] = await sql<{ count: string }[]>`
        select count(*)::text as count
        from clients
      `;

      if (Number(clientCount) === 0) {
        await seedDatabase(sql);
      }
    })();
  }

  await bootstrapPromise;
}

async function seedDatabase(sql: postgres.Sql) {
  await sql.begin(async (tx) => {
    for (const client of seedClients) {
      await tx`
        insert into clients (
          id,
          name,
          email,
          telefono,
          fecha_alta,
          comitente,
          share_token,
          expected_commission_pct,
          last_activity
        ) values (
          ${client.id},
          ${client.name},
          ${client.email},
          ${client.telefono},
          ${client.fechaAlta},
          ${client.comitente},
          ${client.shareToken},
          ${client.expectedCommissionPct},
          ${client.lastActivity}
        )
        on conflict (id) do update
        set
          name = excluded.name,
          email = excluded.email,
          telefono = excluded.telefono,
          fecha_alta = excluded.fecha_alta,
          comitente = excluded.comitente,
          share_token = excluded.share_token,
          expected_commission_pct = excluded.expected_commission_pct,
          last_activity = excluded.last_activity
      `;

      for (const holding of client.holdings) {
        await tx`
          insert into holdings (
            client_id,
            asset,
            type,
            quantity,
            avg_price,
            current_price,
            is_peso,
            mep_fx_rate,
            perf_d1,
            perf_d30,
            perf_y1
          ) values (
            ${client.id},
            ${holding.asset},
            ${holding.type},
            ${holding.quantity},
            ${holding.avgPrice},
            ${holding.currentPrice},
            ${holding.isPeso ?? false},
            ${holding.mepFxRate ?? null},
            ${holding.performance.d1},
            ${holding.performance.d30},
            ${holding.performance.y1}
          )
          on conflict (client_id, asset) do update
          set
            type = excluded.type,
            quantity = excluded.quantity,
            avg_price = excluded.avg_price,
            current_price = excluded.current_price,
            is_peso = excluded.is_peso,
            mep_fx_rate = excluded.mep_fx_rate,
            perf_d1 = excluded.perf_d1,
            perf_d30 = excluded.perf_d30,
            perf_y1 = excluded.perf_y1,
            updated_at = now()
        `;
      }

      for (const transaction of client.transactions) {
        await tx`
          insert into transactions (
            id,
            client_id,
            date,
            type,
            asset,
            asset_type,
            quantity,
            price,
            commission,
            is_peso,
            mep_fx_rate,
            status
          ) values (
            ${transaction.id},
            ${client.id},
            ${transaction.date},
            ${transaction.type},
            ${transaction.asset},
            ${transaction.assetType},
            ${transaction.quantity},
            ${transaction.price},
            ${transaction.commission},
            ${transaction.isPeso ?? false},
            ${transaction.mepFxRate ?? null},
            ${transaction.status ?? "Ejecutada"}
          )
          on conflict (id) do nothing
        `;
      }
    }

    for (const holding of SEED_MODEL_HOLDINGS) {
      await tx`
        insert into model_portfolio_holdings (
          portfolio_id,
          asset,
          type,
          quantity,
          avg_price,
          current_price,
          weight_pct,
          is_peso,
          perf_d1,
          perf_d30,
          perf_y1
        ) values (
          ${DEFAULT_MODEL_PORTFOLIO_ID},
          ${holding.asset},
          ${holding.type},
          ${holding.weightPct},
          ${1},
          ${holding.currentPrice},
          ${holding.weightPct},
          ${holding.isPeso ?? false},
          ${holding.performance.d1},
          ${holding.performance.d30},
          ${holding.performance.y1}
        )
        on conflict (portfolio_id, asset) do update
        set
          type = excluded.type,
          quantity = excluded.quantity,
          avg_price = excluded.avg_price,
          current_price = excluded.current_price,
          weight_pct = excluded.weight_pct,
          is_peso = excluded.is_peso,
          perf_d1 = excluded.perf_d1,
          perf_d30 = excluded.perf_d30,
          perf_y1 = excluded.perf_y1,
          updated_at = now()
      `;
    }
  });
}

function inferAssetType(asset: string): AssetType {
  const normalized = asset.trim().toUpperCase();
  if (normalized.startsWith("AL") || normalized.startsWith("GD")) return "Bono";
  if (
    normalized.includes("FCI") ||
    normalized.includes("RENTA") ||
    normalized.includes("FONDO") ||
    normalized.includes("RETORNO") ||
    normalized.includes("MIXTA") ||
    normalized.includes("FIJA") ||
    normalized.includes("DOLAR") ||
    normalized.includes("AHORRO")
  )
    return "Fondo";
  if (normalized.startsWith("ON")) return "ON";
  if (normalized.startsWith("LE")) return "Letra";
  if (normalized.length <= 5) return "CEDEAR";
  return "Acci\u00f3n";
}

async function readClientsFromStorage(): Promise<StoredClient[]> {
  const sql = getSqlClient();
  await ensureDatabaseReady();

  const [clientRows, holdingRows, transactionRows] = await Promise.all([
    sql<DbClientRow[]>`
      select
        id::text as id,
        advisor_id::text as advisor_id,
        name,
        email,
        telefono,
        fecha_alta::text as fecha_alta,
        comitente,
        share_token,
        expected_commission_pct,
        last_activity::text as last_activity
      from clients
      order by name asc
    `,
    sql<DbHoldingRow[]>`
      select
        client_id::text as client_id,
        asset,
        type,
        quantity,
        avg_price,
        current_price,
        is_peso,
        mep_fx_rate,
        perf_d1,
        perf_d30,
        perf_y1
      from holdings
      order by client_id asc, asset asc
    `,
    sql<DbTransactionRow[]>`
      select
        id::text as id,
        client_id::text as client_id,
        date::text as date,
        created_at::text as created_at,
        type,
        asset,
        asset_type,
        quantity,
        price,
        commission,
        is_peso,
        mep_fx_rate,
        status
      from transactions
      order by date desc, created_at desc
    `,
  ]);

  const holdingsByClient = new Map<string, Holding[]>();
  const transactionsByClient = new Map<string, Transaction[]>();

  for (const row of holdingRows) {
    const bucket = holdingsByClient.get(row.client_id) ?? [];
    bucket.push(holdingRowToModel(row));
    holdingsByClient.set(row.client_id, bucket);
  }

  for (const row of transactionRows) {
    const bucket = transactionsByClient.get(row.client_id) ?? [];
    bucket.push(transactionRowToModel(row));
    transactionsByClient.set(row.client_id, bucket);
  }

  return clientRows.map((row) => ({
    id: row.id,
    advisorId: row.advisor_id,
    name: row.name,
    email: row.email,
    telefono: row.telefono,
    fechaAlta: row.fecha_alta,
    comitente: row.comitente,
    shareToken: row.share_token,
    expectedCommissionPct: Number(row.expected_commission_pct),
    lastActivity: row.last_activity,
    holdings: holdingsByClient.get(row.id) ?? [],
    transactions: transactionsByClient.get(row.id) ?? [],
  }));
}

async function readModelPortfolioFromStorage(): Promise<ModelPortfolio> {
  const sql = getSqlClient();
  await ensureDatabaseReady();

  const [portfolioRow] = await sql<DbModelPortfolioRow[]>`
    select id, name, benchmark_name, updated_at::text as updated_at
    from model_portfolios
    where id = ${DEFAULT_MODEL_PORTFOLIO_ID}
    limit 1
  `;

  const holdingRows = await sql<DbModelPortfolioHoldingRow[]>`
    select
      portfolio_id,
      asset,
      type,
      quantity,
      weight_pct,
      current_price,
      is_peso,
      perf_d1,
      perf_d30,
      perf_y1
    from model_portfolio_holdings
    where portfolio_id = ${DEFAULT_MODEL_PORTFOLIO_ID}
    order by asset asc
  `;

  return {
    id: portfolioRow?.id ?? DEFAULT_MODEL_PORTFOLIO_ID,
    name: portfolioRow?.name ?? DEFAULT_MODEL_PORTFOLIO_NAME,
    benchmarkName: portfolioRow?.benchmark_name ?? DEFAULT_MODEL_BENCHMARK_NAME,
    updatedAt: portfolioRow?.updated_at ?? new Date().toISOString(),
    holdings: holdingRows.map(modelHoldingRowToModel),
  };
}

async function getSeedClientsBundle(): Promise<{
  clients: StoredClient[];
  dataMode: DataMode;
  marketDataStatus: MarketDataStatus;
  dollarRates: {
    mep: DollarQuote | null;
    ccl: DollarQuote | null;
  };
}> {
  const [{ snapshots, status: marketDataStatus }, dollarRates] = await Promise.all([
    loadMarketSnapshots(collectRequestedAssets(seedClients.flatMap((client) => client.holdings))),
    loadDollarRates(),
  ]);

  resolvedDataMode = "seed";

  return {
    clients: seedClients.map((client) => ({
      ...client,
      holdings: applySnapshotsToHoldings(client.holdings, snapshots),
      transactions: copyTransactionsForPortfolio(client.transactions),
    })),
    dataMode: "seed",
    marketDataStatus,
    dollarRates: {
      mep: dollarRates.mep,
      ccl: dollarRates.ccl,
    },
  };
}

async function getSeedModelPortfolioBundle(): Promise<{
  portfolio: ModelPortfolio;
  dataMode: DataMode;
  marketDataStatus: MarketDataStatus;
  benchmark: BenchmarkComponent[];
  dollarRates: {
    mep: DollarQuote | null;
    ccl: DollarQuote | null;
  };
}> {
  const requestedAssets = [
    ...collectRequestedAssets(SEED_MODEL_HOLDINGS),
    { symbol: "SPY", type: "CEDEAR" as AssetType },
    { symbol: "QQQ", type: "CEDEAR" as AssetType },
  ];
  const [{ snapshots, status }, dollarRates] = await Promise.all([
    loadMarketSnapshots(requestedAssets),
    loadDollarRates(),
  ]);

  resolvedDataMode = "seed";

  return {
    portfolio: {
      id: DEFAULT_MODEL_PORTFOLIO_ID,
      name: DEFAULT_MODEL_PORTFOLIO_NAME,
      benchmarkName: DEFAULT_MODEL_BENCHMARK_NAME,
      updatedAt: new Date().toISOString(),
      holdings: applySnapshotsToModelHoldings(SEED_MODEL_HOLDINGS, snapshots),
    },
    dataMode: "seed",
    marketDataStatus: status,
    benchmark: [
      {
        symbol: "SPY",
        weight: 0.6,
        currentPrice: snapshots.get("SPY")?.currentPrice ?? 0,
        pctChange: snapshots.get("SPY")?.pctChange ?? 0,
      },
      {
        symbol: "QQQ",
        weight: 0.4,
        currentPrice: snapshots.get("QQQ")?.currentPrice ?? 0,
        pctChange: snapshots.get("QQQ")?.pctChange ?? 0,
      },
    ],
    dollarRates: {
      mep: dollarRates.mep,
      ccl: dollarRates.ccl,
    },
  };
}

export async function getClientsBundle(): Promise<{
  clients: StoredClient[];
  dataMode: DataMode;
  marketDataStatus: MarketDataStatus;
  dollarRates: {
    mep: DollarQuote | null;
    ccl: DollarQuote | null;
  };
}> {
  if (!getConfiguredDatabaseUrl()) {
    if (allowSeedFallback()) {
      return getSeedClientsBundle();
    }

    throw new Error(
      "Neon no esta configurado. Defini NEON_DATABASE_URL o DATABASE_URL para usar datos reales.",
    );
  }

  try {
    const baseClients = await readClientsFromStorage();
    const allHoldings = baseClients.flatMap((client) => client.holdings);
    const [{ snapshots, status: marketDataStatus }, dollarRates] = await Promise.all([
      loadMarketSnapshots(collectRequestedAssets(allHoldings)),
      loadDollarRates(),
    ]);
    const clientsWithLiveValues = baseClients.map((client) => ({
      ...client,
      holdings: applySnapshotsToHoldings(client.holdings, snapshots),
      transactions: copyTransactionsForPortfolio(client.transactions),
    }));

    try {
      await persistDailyPortfolioSnapshots(clientsWithLiveValues);
    } catch (error) {
      console.warn("[crm-repository] Error saving portfolio snapshots", error);
    }

    let snapshotHistory = new Map<string, PortfolioSnapshotPoint[]>();
    try {
      snapshotHistory = await readPortfolioSnapshotsFromStorage(
        clientsWithLiveValues.map((client) => client.id),
      );
    } catch (error) {
      console.warn("[crm-repository] Error loading portfolio snapshots", error);
    }

    resolvedDataMode = "database";

    return {
      clients: clientsWithLiveValues.map((client) => ({
        ...client,
        portfolioSnapshots: snapshotHistory.get(client.id) ?? [],
      })),
      dataMode: currentDataMode(),
      marketDataStatus,
      dollarRates: {
        mep: dollarRates.mep,
        ccl: dollarRates.ccl,
      },
    };
  } catch (error) {
    console.error("[crm-repository] Error loading clients bundle", error);
    if (allowSeedFallback()) {
      return getSeedClientsBundle();
    }
    throw error;
  }
}

export async function getClientDetailBundle(clientId: string) {
  const bundle = await getClientsBundle();
  const normalizedInput = String(clientId).trim();
  const client =
    bundle.clients.find(
      (item) =>
        String(item.id).trim() === normalizedInput ||
        String(item.comitente).trim() === normalizedInput,
    ) ?? null;
  return { ...bundle, client };
}

export async function getPublicPortfolioBundle(token: string) {
  const bundle = await getClientsBundle();
  const client = bundle.clients.find((item) => item.shareToken === token) ?? null;
  return {
    client,
    marketDataStatus: bundle.marketDataStatus,
    dollarRates: bundle.dollarRates,
  };
}

export async function getModelPortfolioBundle(): Promise<{
  portfolio: ModelPortfolio;
  dataMode: DataMode;
  marketDataStatus: MarketDataStatus;
  benchmark: BenchmarkComponent[];
  dollarRates: {
    mep: DollarQuote | null;
    ccl: DollarQuote | null;
  };
}> {
  if (!getConfiguredDatabaseUrl()) {
    if (allowSeedFallback()) {
      return getSeedModelPortfolioBundle();
    }

    throw new Error(
      "Neon no esta configurado. Defini NEON_DATABASE_URL o DATABASE_URL para usar datos reales.",
    );
  }

  try {
    const portfolio = await readModelPortfolioFromStorage();
    const requestedAssets = [
      ...collectRequestedAssets(portfolio.holdings),
      { symbol: "SPY", type: "CEDEAR" as AssetType },
      { symbol: "QQQ", type: "CEDEAR" as AssetType },
    ];
    const [{ snapshots, status }, dollarRates] = await Promise.all([
      loadMarketSnapshots(requestedAssets),
      loadDollarRates(),
    ]);

    const benchmark: BenchmarkComponent[] = [
      {
        symbol: "SPY",
        weight: 0.6,
        currentPrice: snapshots.get("SPY")?.currentPrice ?? 0,
        pctChange: snapshots.get("SPY")?.pctChange ?? 0,
      },
      {
        symbol: "QQQ",
        weight: 0.4,
        currentPrice: snapshots.get("QQQ")?.currentPrice ?? 0,
        pctChange: snapshots.get("QQQ")?.pctChange ?? 0,
      },
    ];

    resolvedDataMode = "database";

    return {
      portfolio: {
        ...portfolio,
        holdings: applySnapshotsToModelHoldings(portfolio.holdings, snapshots),
      },
      dataMode: currentDataMode(),
      marketDataStatus: status,
      benchmark,
      dollarRates: {
        mep: dollarRates.mep,
        ccl: dollarRates.ccl,
      },
    };
  } catch (error) {
    console.error("[crm-repository] Error loading model portfolio bundle", error);
    if (allowSeedFallback()) {
      return getSeedModelPortfolioBundle();
    }
    throw error;
  }
}

export async function getDataMode(): Promise<DataMode> {
  return currentDataMode();
}

function generateComitenteCandidate() {
  const base = Date.now().toString().slice(-6);
  const suffix = Math.floor(Math.random() * 90 + 10).toString();
  return `${base}${suffix}`.slice(0, 8);
}

function generateShareToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

export async function createClient(input: CreateClientInput) {
  const sql = getSqlClient();
  await ensureDatabaseReady();

  const name = input.name.trim();
  if (!name) throw new Error("El nombre del cliente es obligatorio.");

  const requestedComitente = input.comitente?.trim();
  const email = input.email?.trim() ?? "";
  const telefono = input.telefono?.trim() ?? "";
  const fechaAlta = input.fechaAlta?.trim() || new Date().toISOString().slice(0, 10);
  const expectedCommissionPct = Number(input.expectedCommissionPct ?? 0);

  if (!Number.isFinite(expectedCommissionPct) || expectedCommissionPct < 0) {
    throw new Error("La comision esperada debe ser un numero mayor o igual a 0.");
  }

  let comitente = requestedComitente || generateComitenteCandidate();
  let attempts = 0;

  while (attempts < 5) {
    const existing = await sql<{ exists: number }[]>`
      select 1 as exists
      from clients
      where comitente = ${comitente}
      limit 1
    `;

    if (existing.length === 0) break;
    if (requestedComitente) {
      throw new Error("El comitente ya existe. Usa un valor diferente.");
    }

    comitente = generateComitenteCandidate();
    attempts += 1;
  }

  if (attempts >= 5) {
    throw new Error("No se pudo generar un comitente unico. Intenta nuevamente.");
  }

  await sql`
    insert into clients (
      id,
      name,
      email,
      telefono,
      fecha_alta,
      comitente,
      share_token,
      expected_commission_pct,
      last_activity
    ) values (
      ${crypto.randomUUID()},
      ${name},
      ${email},
      ${telefono},
      ${fechaAlta},
      ${comitente},
      ${generateShareToken()},
      ${expectedCommissionPct},
      ${fechaAlta}
    )
  `;

  return getClientsBundle();
}
export async function createTransaction(input: CreateTransactionInput) {
  const sql = getSqlClient();
  await ensureDatabaseReady();

  const normalizedAsset = input.asset.trim().toUpperCase();
  const quantity = Number(input.quantity);
  const price = Number(input.price);
  const currentPrice = Number(input.currentPrice ?? input.price);
  const isPeso = Boolean(input.isPeso);
  const normalizedType = String(input.type).toLowerCase();
  const isPositiveFlow = normalizedType === "compra" || normalizedType.includes("suscrip");
  const assetType = input.assetType ?? inferAssetType(normalizedAsset);
  const status = input.status ?? "Ejecutada";
  let transactionFxRate: number | null = null;

  if (!normalizedAsset) throw new Error("El activo es obligatorio.");
  if (!Number.isFinite(quantity) || quantity <= 0)
    throw new Error("La cantidad debe ser mayor a 0.");
  if (!Number.isFinite(price) || price <= 0) throw new Error("El precio debe ser mayor a 0.");
  if (isPeso) {
    const manualFxRate = Number(input.mepFxRate ?? 0);
    if (Number.isFinite(manualFxRate) && manualFxRate > 0) {
      transactionFxRate = manualFxRate;
    } else if (isTodayInArgentina(input.date)) {
      const dollarRates = await loadDollarRates({ forceRefresh: true });
      transactionFxRate =
        assetType === "CEDEAR"
          ? Number(dollarRates.ccl?.venta ?? 0)
          : Number(dollarRates.mep?.venta ?? 0);
    }

    if (!(transactionFxRate && transactionFxRate > 0)) {
      throw new Error(
        `Para operaciones en pesos anteriores a hoy necesitás cargar el tipo de cambio del momento (${assetFxLabel(assetType)}).`,
      );
    }
  }
  const commission = calculateAutomaticCommission(assetType, quantity * price);
  await sql.begin(async (tx) => {
    const [holding] = await tx<DbHoldingRow[]>`
      select
        client_id::text as client_id,
        asset,
        type,
        quantity,
        avg_price,
        current_price,
        is_peso,
        mep_fx_rate,
        perf_d1,
        perf_d30,
        perf_y1
      from holdings
      where client_id = ${input.clientId}
        and asset = ${normalizedAsset}
      limit 1
    `;

    const previousQuantity = Number(holding?.quantity ?? 0);
    const nextQuantity = isPositiveFlow ? previousQuantity + quantity : previousQuantity - quantity;

    if (!isPositiveFlow && !holding) {
      throw new Error("No existe una posicion previa para registrar esta venta.");
    }

    if (nextQuantity < -0.000001) {
      throw new Error("La operacion deja la posicion en negativo.");
    }

    const holdingIsPeso = Boolean(holding?.is_peso);
    if (holding && holdingIsPeso !== isPeso) {
      throw new Error(
        "La posición ya existe con otra moneda base. Cerrá la posición o mantené la misma referencia.",
      );
    }

    const previousAvgPrice = Number(holding?.avg_price ?? 0);
    const previousMepRate = holding?.mep_fx_rate === null ? null : Number(holding?.mep_fx_rate);
    if (holdingIsPeso && previousQuantity > 0 && !(previousMepRate && previousMepRate > 0)) {
      throw new Error(
        "La tenencia en pesos no tiene un MEP histórico guardado. Regularizá esa posición antes de seguir.",
      );
    }

    const previousRawCost = previousQuantity * previousAvgPrice;
    const previousUsdCost =
      holdingIsPeso && previousQuantity > 0
        ? normalizeUsdValue(previousRawCost, previousMepRate)
        : previousRawCost;
    const transactionRawCost = quantity * price;
    const transactionUsdCost =
      isPeso && transactionFxRate
        ? normalizeUsdValue(transactionRawCost, transactionFxRate)
        : transactionRawCost;

    const nextAvgPrice =
      isPositiveFlow && nextQuantity > 0
        ? (previousRawCost + transactionRawCost) / nextQuantity
        : Number(holding?.avg_price ?? price);
    const nextMepFxRate =
      isPositiveFlow && isPeso
        ? (() => {
            const combinedRawCost = previousRawCost + transactionRawCost;
            const combinedUsdCost = previousUsdCost + transactionUsdCost;
            return combinedUsdCost > 0 ? combinedRawCost / combinedUsdCost : transactionFxRate;
          })()
        : holdingIsPeso
          ? previousMepRate
          : null;

    const nextPerformance = {
      d1: Number(input.performance?.d1 ?? holding?.perf_d1 ?? 0),
      d30: Number(input.performance?.d30 ?? holding?.perf_d30 ?? 0),
      y1: Number(input.performance?.y1 ?? holding?.perf_y1 ?? 0),
    };

    await tx`
      insert into transactions (
        id,
        client_id,
        date,
        type,
        asset,
        asset_type,
        quantity,
        price,
        commission,
        is_peso,
        mep_fx_rate,
        status
      ) values (
        ${crypto.randomUUID()},
        ${input.clientId},
        ${input.date},
        ${input.type},
        ${normalizedAsset},
        ${assetType},
        ${quantity},
        ${price},
        ${commission},
        ${isPeso},
        ${transactionFxRate},
        ${status}
      )
    `;

    if (nextQuantity <= 0.000001) {
      await tx`
        delete from holdings
        where client_id = ${input.clientId}
          and asset = ${normalizedAsset}
      `;
    } else {
      await tx`
        insert into holdings (
          client_id,
          asset,
          type,
          quantity,
          avg_price,
          current_price,
          is_peso,
          mep_fx_rate,
          perf_d1,
          perf_d30,
          perf_y1
        ) values (
          ${input.clientId},
          ${normalizedAsset},
          ${assetType},
          ${nextQuantity},
          ${nextAvgPrice},
          ${currentPrice},
          ${isPeso},
          ${nextMepFxRate},
          ${nextPerformance.d1},
          ${nextPerformance.d30},
          ${nextPerformance.y1}
        )
        on conflict (client_id, asset) do update
        set
          type = excluded.type,
          quantity = excluded.quantity,
          avg_price = excluded.avg_price,
          current_price = excluded.current_price,
          is_peso = excluded.is_peso,
          mep_fx_rate = excluded.mep_fx_rate,
          perf_d1 = excluded.perf_d1,
          perf_d30 = excluded.perf_d30,
          perf_y1 = excluded.perf_y1,
          updated_at = now()
      `;
    }

    await tx`
      update clients
      set last_activity = ${input.date}
      where id = ${input.clientId}
    `;
  });

  return getClientDetailBundle(input.clientId);
}

async function rebuildClientHoldings(tx: postgres.TransactionSql, clientId: string) {
  const [transactionRows, existingHoldingRows, clientRows] = await Promise.all([
    tx<DbTransactionRow[]>`
      select
        id::text as id,
        client_id::text as client_id,
        date::text as date,
        created_at::text as created_at,
        type,
        asset,
        asset_type,
        quantity,
        price,
        commission,
        is_peso,
        mep_fx_rate,
        status
      from transactions
      where client_id = ${clientId}
      order by date asc, created_at asc
    `,
    tx<DbHoldingRow[]>`
      select
        client_id::text as client_id,
        asset,
        type,
        quantity,
        avg_price,
        current_price,
        is_peso,
        mep_fx_rate,
        perf_d1,
        perf_d30,
        perf_y1
      from holdings
      where client_id = ${clientId}
    `,
    tx<{ fecha_alta: string }[]>`
      select fecha_alta::text as fecha_alta
      from clients
      where id = ${clientId}
      limit 1
    `,
  ]);

  const rebuiltHoldings = rebuildHoldingsFromTransactions(
    transactionRows,
    existingHoldingRows,
    clientId,
  );

  await tx`
    delete from holdings
    where client_id = ${clientId}
  `;

  for (const holding of rebuiltHoldings) {
    await tx`
      insert into holdings (
        client_id,
        asset,
        type,
        quantity,
        avg_price,
        current_price,
        is_peso,
        mep_fx_rate,
        perf_d1,
        perf_d30,
        perf_y1
      ) values (
        ${holding.clientId},
        ${holding.asset},
        ${holding.type},
        ${holding.quantity},
        ${holding.avgPrice},
        ${holding.currentPrice},
        ${holding.isPeso},
        ${holding.mepFxRate},
        ${holding.perfD1},
        ${holding.perfD30},
        ${holding.perfY1}
      )
    `;
  }

  const latestTxDate = transactionRows[transactionRows.length - 1]?.date ?? null;
  const fallbackDate = clientRows[0]?.fecha_alta ?? new Date().toISOString().slice(0, 10);
  const lastActivity = latestTxDate ?? fallbackDate;

  await tx`
    update clients
    set last_activity = ${lastActivity}
    where id = ${clientId}
  `;
}

export async function updateTransaction(input: UpdateTransactionInput) {
  const sql = getSqlClient();
  await ensureDatabaseReady();

  const normalizedAsset = input.asset.trim().toUpperCase();
  const quantity = Number(input.quantity);
  const price = Number(input.price);
  const assetType = input.assetType ?? inferAssetType(normalizedAsset);
  const currentPrice = Number(input.currentPrice ?? input.price);
  const isPeso = Boolean(input.isPeso);
  const status = input.status ?? "Ejecutada";
  let transactionFxRate: number | null = null;

  if (!input.id.trim()) throw new Error("La operacion es obligatoria.");
  if (!normalizedAsset) throw new Error("El activo es obligatorio.");
  if (!Number.isFinite(quantity) || quantity <= 0)
    throw new Error("La cantidad debe ser mayor a 0.");
  if (!Number.isFinite(price) || price <= 0) throw new Error("El precio debe ser mayor a 0.");

  if (isPeso) {
    const manualFxRate = Number(input.mepFxRate ?? 0);
    if (Number.isFinite(manualFxRate) && manualFxRate > 0) {
      transactionFxRate = manualFxRate;
    } else if (isTodayInArgentina(input.date)) {
      const dollarRates = await loadDollarRates({ forceRefresh: true });
      transactionFxRate = Number(dollarRates.mep?.venta ?? 0);
    }

    if (!(transactionFxRate && transactionFxRate > 0)) {
      throw new Error(
        `Para operaciones en pesos anteriores a hoy necesitás cargar el tipo de cambio del momento (${assetFxLabel(assetType)}).`,
      );
    }
  }

  await sql.begin(async (tx) => {
    const [existing] = await tx<DbTransactionRow[]>`
      select
        id::text as id,
        client_id::text as client_id,
        date::text as date,
        created_at::text as created_at,
        type,
        asset,
        asset_type,
        quantity,
        price,
        commission,
        is_peso,
        mep_fx_rate,
        status
      from transactions
      where id = ${input.id}
        and client_id = ${input.clientId}
      limit 1
    `;

    if (!existing) {
      throw new Error("No encontramos la operacion para editar.");
    }

    const commission = calculateAutomaticCommission(assetType, quantity * price);

    await tx`
      update transactions
      set
        date = ${input.date},
        type = ${input.type},
        asset = ${normalizedAsset},
        asset_type = ${assetType},
        quantity = ${quantity},
        price = ${price},
        commission = ${commission},
        is_peso = ${isPeso},
        mep_fx_rate = ${transactionFxRate},
        status = ${status}
      where id = ${input.id}
        and client_id = ${input.clientId}
    `;

    await rebuildClientHoldings(tx, input.clientId);
  });

  return getClientDetailBundle(input.clientId);
}

export async function deleteTransaction(input: DeleteTransactionInput) {
  const sql = getSqlClient();
  await ensureDatabaseReady();

  await sql.begin(async (tx) => {
    const [existing] = await tx<DbTransactionRow[]>`
      select
        id::text as id,
        client_id::text as client_id,
        date::text as date,
        created_at::text as created_at,
        type,
        asset,
        asset_type,
        quantity,
        price,
        commission,
        is_peso,
        mep_fx_rate,
        status
      from transactions
      where id = ${input.id}
        and client_id = ${input.clientId}
      limit 1
    `;

    if (!existing) {
      throw new Error("No encontramos la operacion para borrar.");
    }

    await tx`
      delete from transactions
      where id = ${input.id}
        and client_id = ${input.clientId}
    `;

    await rebuildClientHoldings(tx, input.clientId);
  });

  return getClientDetailBundle(input.clientId);
}

export async function upsertModelHolding(input: UpsertModelHoldingInput) {
  const sql = getSqlClient();
  await ensureDatabaseReady();

  const normalizedAsset = input.asset.trim().toUpperCase();
  const weightPct = Number(input.weightPct);
  const currentPrice = Number(input.currentPrice ?? 0);
  const isPeso = Boolean(input.isPeso);

  if (!normalizedAsset) throw new Error("El activo es obligatorio.");
  if (!Number.isFinite(weightPct) || weightPct <= 0)
    throw new Error("El peso debe ser mayor a 0%.");
  if (weightPct > 100) throw new Error("El peso no puede superar 100%.");

  await sql`
    insert into model_portfolio_holdings (
      portfolio_id,
      asset,
      type,
      quantity,
      avg_price,
      current_price,
      weight_pct,
      is_peso,
      perf_d1,
      perf_d30,
      perf_y1
    ) values (
      ${DEFAULT_MODEL_PORTFOLIO_ID},
      ${normalizedAsset},
      ${input.assetType},
      ${weightPct},
      ${1},
      ${currentPrice},
      ${weightPct},
      ${isPeso},
      ${Number(input.performance?.d1 ?? 0)},
      ${Number(input.performance?.d30 ?? 0)},
      ${Number(input.performance?.y1 ?? 0)}
    )
    on conflict (portfolio_id, asset) do update
    set
      type = excluded.type,
      quantity = excluded.quantity,
      avg_price = excluded.avg_price,
      current_price = excluded.current_price,
      weight_pct = excluded.weight_pct,
      is_peso = excluded.is_peso,
      perf_d1 = excluded.perf_d1,
      perf_d30 = excluded.perf_d30,
      perf_y1 = excluded.perf_y1,
      updated_at = now()
  `;

  await sql`
    update model_portfolios
    set updated_at = now()
    where id = ${DEFAULT_MODEL_PORTFOLIO_ID}
  `;

  return getModelPortfolioBundle();
}

export async function deleteModelHolding(asset: string) {
  const sql = getSqlClient();
  await ensureDatabaseReady();

  await sql`
    delete from model_portfolio_holdings
    where portfolio_id = ${DEFAULT_MODEL_PORTFOLIO_ID}
      and asset = ${asset.trim().toUpperCase()}
  `;

  await sql`
    update model_portfolios
    set updated_at = now()
    where id = ${DEFAULT_MODEL_PORTFOLIO_ID}
  `;

  return getModelPortfolioBundle();
}
