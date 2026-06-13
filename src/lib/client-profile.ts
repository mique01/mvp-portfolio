import type { AssetType, Client, Holding, Transaction, TxType } from "@/lib/mock-data";
import {
  allocationByType,
  clientSummary,
  fmtDate,
  fmtMoney,
  fmtPct,
  holdingsSummary,
  type PortfolioSnapshotPoint,
  type HoldingValued,
} from "@/lib/portfolio";

export type PerformanceFilter = "1D" | "30D" | "1Y" | "YTD" | "HISTORICO";

type EvolutionPoint = {
  date: string;
  invested: number;
  value: number;
};

type ClientProfileSource = Client & {
  portfolioSnapshots?: PortfolioSnapshotPoint[];
};

type PerformanceMetric = {
  value: number;
  pct: number;
};

export type PortfolioSlice = {
  name: AssetType;
  value: number;
  pct: number;
};

export type OperationRow = {
  id: string;
  date: string;
  type: TxType;
  asset: string;
  assetType: AssetType;
  quantity: number;
  price: number;
  amount: number;
  commission: number;
  isPeso: boolean;
  mepFxRate: number | null;
  status: "Ejecutada" | "Pendiente" | "Cancelada";
};

export type PositionByAsset = {
  asset: string;
  assetType: AssetType;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  costTotal: number;
  pnl: number;
  pnlPct: number;
  weightPct: number;
  isPeso: boolean;
  mepFxRate: number | null;
  performance: {
    d1: number;
    d30: number;
    y1: number;
  };
};

export type PortfolioCurrencyMode = "ARS" | "USD_MEP_TODAY";

export type ResolvedPositionDisplay = {
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  costTotal: number;
  pnl: number;
  pnlPct: number;
  fxLabel?: "MEP" | "CCL";
  fxComparison?: {
    historicalRate: number;
    todayRate: number;
    delta: number;
    deltaPct: number;
  };
};

export type ClientProfileViewModel = {
  client: Client;
  summary: ReturnType<typeof clientSummary>;
  valuedHoldings: HoldingValued[];
  positions: PositionByAsset[];
  cards: {
    totalValue: number;
    pnl: number;
    pnlPct: number;
    availableToOperate: number;
    sinceInception: PerformanceMetric;
  };
  performance: {
    fullSeries: EvolutionPoint[];
    byFilter: Record<PerformanceFilter, EvolutionPoint[]>;
    metrics: {
      d1: PerformanceMetric;
      d30: PerformanceMetric;
      y1: PerformanceMetric;
      ytd: PerformanceMetric;
      sinceStart: PerformanceMetric;
      max: EvolutionPoint;
      min: EvolutionPoint;
    };
  };
  portfolio: {
    slices: PortfolioSlice[];
    total: number;
    positions: PositionByAsset[];
  };
  operations: {
    recent: OperationRow[];
    all: OperationRow[];
  };
};

export type ClientProfileHeaderMeta = {
  status: "Cliente activo" | "Cliente inactivo";
  createdAtLabel: string;
  email: string;
  phone: string;
  comitente: string;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function toDateOnly(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function txAmount(tx: Pick<Transaction, "quantity" | "price">) {
  return Number(tx.quantity) * Number(tx.price);
}

function txInvestment(tx: Pick<Transaction, "quantity" | "price" | "commission" | "type">) {
  const amount = txAmount(tx);
  const commission = Number(tx.commission ?? 0);
  return quantitySignal(tx.type) > 0 ? amount + commission : 0;
}

function quantitySignal(type: TxType) {
  const normalized = String(type).toLowerCase();
  return normalized === "compra" || normalized.includes("suscrip") ? 1 : -1;
}

function normalizeAsset(value: string) {
  return value.trim().toUpperCase();
}

function assetFxLabel(assetType: AssetType) {
  return assetType === "CEDEAR" ? "CCL" : "MEP";
}

function sortTransactionsAsc(transactions: Transaction[]) {
  return [...transactions].sort((a, b) => +toDateOnly(a.date) - +toDateOnly(b.date));
}

function formatRateReference(
  position: Pick<PositionByAsset, "assetType" | "isPeso" | "mepFxRate">,
  mepRate: number,
  cclRate: number,
) {
  const fxLabel = assetFxLabel(position.assetType);
  const marketRate = fxLabel === "CCL" ? cclRate : mepRate;
  const historicalRate =
    position.mepFxRate && position.mepFxRate > 0 ? position.mepFxRate : marketRate;
  const todayRate = marketRate > 0 ? marketRate : historicalRate;

  return {
    historicalRate,
    todayRate,
    fxLabel,
  };
}

function shouldConvertToUsd(displayCurrency: PortfolioCurrencyMode) {
  return displayCurrency === "USD_MEP_TODAY";
}

export function resolvePositionDisplayValues(
  position: Pick<
    PositionByAsset,
    "assetType" | "quantity" | "avgCost" | "currentPrice" | "isPeso" | "mepFxRate"
  >,
  mepRate: number,
  cclRate: number,
  displayCurrency: PortfolioCurrencyMode,
): ResolvedPositionDisplay {
  const quantity = Number(position.quantity);
  const rawAvgCost = Number(position.avgCost);
  const rawCurrentPrice = Number(position.currentPrice);

  if (!shouldConvertToUsd(displayCurrency)) {
    const marketValue = quantity * rawCurrentPrice;
    const costTotal = quantity * rawAvgCost;
    const pnl = marketValue - costTotal;
    return {
      avgCost: rawAvgCost,
      currentPrice: rawCurrentPrice,
      marketValue,
      costTotal,
      pnl,
      pnlPct: costTotal > 0 ? (pnl / costTotal) * 100 : 0,
    };
  }

  const { historicalRate, todayRate, fxLabel } = formatRateReference(position, mepRate, cclRate);
  const avgCost = historicalRate > 0 ? rawAvgCost / historicalRate : rawAvgCost;
  const currentPrice = todayRate > 0 ? rawCurrentPrice / todayRate : rawCurrentPrice;
  const marketValue = quantity * currentPrice;
  const costTotal = quantity * avgCost;
  const pnl = marketValue - costTotal;
  const fxComparison =
    historicalRate > 0 && todayRate > 0
      ? {
          historicalRate,
          todayRate,
          delta: todayRate - historicalRate,
          deltaPct: ((todayRate - historicalRate) / historicalRate) * 100,
        }
      : undefined;

  return {
    avgCost,
    currentPrice,
    marketValue,
    costTotal,
    pnl,
    pnlPct: costTotal > 0 ? (pnl / costTotal) * 100 : 0,
    fxLabel,
    fxComparison,
  };
}

export function resolvePortfolioDisplaySummary(
  positions: PositionByAsset[],
  mepRate: number,
  cclRate: number,
  displayCurrency: PortfolioCurrencyMode,
) {
  const resolved = positions.map((position) =>
    resolvePositionDisplayValues(position, mepRate, cclRate, displayCurrency),
  );
  const totalValue = resolved.reduce((sum, position) => sum + position.marketValue, 0);
  const totalCost = resolved.reduce((sum, position) => sum + position.costTotal, 0);
  const pnl = totalValue - totalCost;
  return {
    totalValue,
    pnl,
    pnlPct: totalCost > 0 ? (pnl / totalCost) * 100 : 0,
  };
}

function buildPositionsFromLedger(
  holdings: Holding[],
  transactions: Transaction[],
): PositionByAsset[] {
  type Accumulator = {
    asset: string;
    assetType: AssetType;
    quantity: number;
    avgCost: number;
    currentPrice: number;
    isPeso: boolean;
    mepFxRate: number | null;
  };

  const byAsset = new Map<string, Accumulator>();

  for (const tx of sortTransactionsAsc(transactions)) {
    const key = normalizeAsset(tx.asset);
    const current =
      byAsset.get(key) ??
      ({
        asset: key,
        assetType: tx.assetType,
        quantity: 0,
        avgCost: Number(tx.price),
        currentPrice: Number(tx.price),
        isPeso: Boolean(tx.isPeso),
        mepFxRate: tx.mepFxRate ?? null,
      } satisfies Accumulator);

    const qty = Number(tx.quantity);
    const price = Number(tx.price);
    const signedQty = quantitySignal(tx.type) * qty;

    current.assetType = tx.assetType;
    current.isPeso = Boolean(tx.isPeso);
    current.mepFxRate = tx.mepFxRate ?? current.mepFxRate;

    if (signedQty > 0) {
      const prevQty = current.quantity;
      const nextQty = prevQty + signedQty;
      const nextCost = prevQty * current.avgCost + signedQty * price;
      current.quantity = nextQty;
      current.avgCost = nextQty > 0 ? nextCost / nextQty : 0;
    } else if (current.quantity > 0) {
      current.quantity = Math.max(0, current.quantity - Math.abs(signedQty));
      if (current.quantity === 0) current.avgCost = 0;
    }

    byAsset.set(key, current);
  }

  for (const holding of holdings) {
    const key = normalizeAsset(holding.asset);
    const current = byAsset.get(key);

    if (!current) {
      byAsset.set(key, {
        asset: key,
        assetType: holding.type,
        quantity: Number(holding.quantity),
        avgCost: Number(holding.avgPrice),
        currentPrice: Number(holding.currentPrice),
        isPeso: Boolean(holding.isPeso),
        mepFxRate: holding.mepFxRate ?? null,
      });
      continue;
    }

    current.assetType = holding.type;
    current.currentPrice = Number(holding.currentPrice);
    current.isPeso = Boolean(holding.isPeso);
    current.mepFxRate = holding.mepFxRate ?? current.mepFxRate;
    // Source of truth: portfolio sizing always follows current holdings.
    current.quantity = Number(holding.quantity);
    current.avgCost = Number(holding.avgPrice);
    byAsset.set(key, current);
  }

  const rawPositions = [...byAsset.values()]
    .filter((position) => position.quantity > 0)
    .map((position) => {
      const marketValue = position.quantity * position.currentPrice;
      const costTotal = position.quantity * position.avgCost;
      const pnl = marketValue - costTotal;
      const pnlPct = costTotal > 0 ? (pnl / costTotal) * 100 : 0;

      return {
        asset: position.asset,
        assetType: position.assetType,
        quantity: position.quantity,
        avgCost: position.avgCost,
        currentPrice: position.currentPrice,
        marketValue,
        costTotal,
        pnl,
        pnlPct,
        isPeso: position.isPeso,
        mepFxRate: position.mepFxRate,
        performance: { d1: 0, d30: 0, y1: 0 },
      };
    })
    .sort((a, b) => b.marketValue - a.marketValue);

  const totalValue = rawPositions.reduce((sum, position) => sum + position.marketValue, 0) || 1;

  const holdingLookup = new Map(
    holdings.map((holding) => [normalizeAsset(holding.asset), holding.performance] as const),
  );

  return rawPositions.map((position) => ({
    ...position,
    weightPct: (position.marketValue / totalValue) * 100,
    performance: holdingLookup.get(position.asset) ?? position.performance,
  }));
}

function buildAllocationByType(positions: PositionByAsset[]): PortfolioSlice[] {
  const grouped = new Map<AssetType, number>();

  for (const position of positions) {
    grouped.set(position.assetType, (grouped.get(position.assetType) ?? 0) + position.marketValue);
  }

  const total = [...grouped.values()].reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [];

  return [...grouped.entries()]
    .map(([name, value]) => ({
      name,
      value,
      pct: (value / total) * 100,
    }))
    .sort((a, b) => b.value - a.value);
}

function buildPerformanceSeries(
  positions: PositionByAsset[],
  holdings: Holding[],
  transactions: Transaction[],
): EvolutionPoint[] {
  const today = toDateOnly(new Date());
  const sortedTransactions = sortTransactionsAsc(transactions);
  const firstTxDate = sortedTransactions[0] ? toDateOnly(sortedTransactions[0].date) : null;
  const startDate = firstTxDate ?? new Date(today.getTime() - 365 * ONE_DAY_MS);

  const txByDate = new Map<string, Transaction[]>();
  for (const tx of sortedTransactions) {
    const key = formatDateKey(toDateOnly(tx.date));
    const bucket = txByDate.get(key) ?? [];
    bucket.push(tx);
    txByDate.set(key, bucket);
  }

  const priceLookup = new Map(
    holdings.map((holding) => [
      normalizeAsset(holding.asset),
      {
        currentPrice: Number(holding.currentPrice),
        d1: Number(holding.performance.d1),
        d30: Number(holding.performance.d30),
        y1: Number(holding.performance.y1),
      },
    ]),
  );
  const positionLookup = new Map(positions.map((position) => [position.asset, position]));

  const firstTransactionLookup = new Map<
    string,
    {
      date: Date;
      price: number;
    }
  >();
  for (const tx of sortedTransactions) {
    const asset = normalizeAsset(tx.asset);
    if (firstTransactionLookup.has(asset)) continue;
    firstTransactionLookup.set(asset, {
      date: toDateOnly(tx.date),
      price: Number(tx.price),
    });
  }

  const runningQty = new Map<string, number>();
  for (const position of positions) {
    runningQty.set(position.asset, 0);
  }

  const initialSeedInvestmentByAsset = new Map<string, number>();
  const txQtyNetByAsset = new Map<string, number>();
  for (const tx of sortedTransactions) {
    const key = normalizeAsset(tx.asset);
    txQtyNetByAsset.set(
      key,
      (txQtyNetByAsset.get(key) ?? 0) + quantitySignal(tx.type) * Number(tx.quantity),
    );
  }

  for (const position of positions) {
    const netFromLedger = txQtyNetByAsset.get(position.asset) ?? 0;
    const initialSeedQty = Math.max(0, position.quantity - Math.max(0, netFromLedger));
    runningQty.set(position.asset, initialSeedQty);
    initialSeedInvestmentByAsset.set(position.asset, initialSeedQty * position.avgCost);
  }

  let runningInvestment = [...initialSeedInvestmentByAsset.values()].reduce(
    (sum, value) => sum + value,
    0,
  );

  const interpolatePrice = (current: number, pctReturn: number, daysAgo: number) => {
    const factor = 1 + pctReturn / 100;
    const safeFactor = !Number.isFinite(factor) || factor <= 0 ? 1 : factor;
    return current / Math.pow(safeFactor, daysAgo / 365);
  };

  const interpolateFromAnchor = (
    current: number,
    anchorPrice: number,
    anchorDate: Date,
    date: Date,
  ) => {
    const totalDays = Math.max(
      1,
      Math.round((today.getTime() - anchorDate.getTime()) / ONE_DAY_MS),
    );
    const elapsedDays = Math.max(
      0,
      Math.round((date.getTime() - anchorDate.getTime()) / ONE_DAY_MS),
    );
    const progress = Math.min(1, elapsedDays / totalDays);
    return anchorPrice + (current - anchorPrice) * progress;
  };

  const series: EvolutionPoint[] = [];

  for (
    let current = new Date(startDate);
    current <= today;
    current = new Date(current.getTime() + ONE_DAY_MS)
  ) {
    const key = formatDateKey(current);
    const dailyTx = txByDate.get(key) ?? [];

    for (const tx of dailyTx) {
      const asset = normalizeAsset(tx.asset);
      if (!runningQty.has(asset)) continue;
      const currentQty = runningQty.get(asset) ?? 0;
      const nextQty = Math.max(0, currentQty + quantitySignal(tx.type) * Number(tx.quantity));
      runningQty.set(asset, nextQty);
      runningInvestment += txInvestment(tx);
    }

    let dayValue = 0;
    for (const [asset, qty] of runningQty.entries()) {
      if (qty <= 0) continue;
      const lookup = priceLookup.get(asset);
      const anchor = firstTransactionLookup.get(asset);
      const position = positionLookup.get(asset);
      const daysAgo = Math.round((today.getTime() - current.getTime()) / ONE_DAY_MS);
      const currentPrice = lookup?.currentPrice ?? 0;
      const hasUsefulHistoricalReturn =
        Boolean(lookup) &&
        (Math.abs(lookup!.y1) > 0.0001 ||
          Math.abs(lookup!.d30) > 0.0001 ||
          Math.abs(lookup!.d1) > 0.0001);
      const price =
        lookup && hasUsefulHistoricalReturn
          ? interpolatePrice(
              currentPrice,
              Math.abs(lookup.y1) > 0.0001
                ? lookup.y1
                : Math.abs(lookup.d30) > 0.0001
                  ? lookup.d30
                  : lookup.d1,
              daysAgo,
            )
          : lookup && position && anchor
            ? interpolateFromAnchor(currentPrice, Number(position.avgCost), anchor.date, current)
            : currentPrice;
      dayValue += qty * price;
    }

    series.push({
      date: key,
      invested: Math.round(Math.max(0, runningInvestment)),
      value: Math.round(Math.max(0, dayValue)),
    });
  }

  if (series.length > 0) {
    const currentPortfolioValue = positions.reduce(
      (sum, position) => sum + position.marketValue,
      0,
    );
    series[series.length - 1].value = Math.round(currentPortfolioValue);
  }

  return series;
}

function buildSnapshotPerformanceSeries(
  positions: PositionByAsset[],
  holdings: Holding[],
  transactions: Transaction[],
  snapshots: PortfolioSnapshotPoint[],
): EvolutionPoint[] {
  const sortedSnapshots = sortSnapshotsAsc(snapshots);
  if (sortedSnapshots.length === 0) {
    return buildPerformanceSeries(positions, holdings, transactions);
  }

  const sortedTransactions = sortTransactionsAsc(transactions);
  let transactionIndex = 0;
  let runningInvestment = 0;
  const series: EvolutionPoint[] = [];

  for (const snapshot of sortedSnapshots) {
    const snapshotDate = toDateOnly(snapshot.date);

    while (
      transactionIndex < sortedTransactions.length &&
      toDateOnly(sortedTransactions[transactionIndex].date) <= snapshotDate
    ) {
      runningInvestment += txInvestment(sortedTransactions[transactionIndex]);
      transactionIndex += 1;
    }

    series.push({
      date: snapshot.date,
      invested: Math.round(Math.max(0, runningInvestment)),
      value: Math.round(Math.max(0, snapshot.value)),
    });
  }

  if (series.length < 2) {
    return buildPerformanceSeries(positions, holdings, transactions);
  }

  return series;
}

function filterSeries(series: EvolutionPoint[], range: PerformanceFilter): EvolutionPoint[] {
  if (series.length === 0 || range === "HISTORICO") return series;

  const end = toDateOnly(series[series.length - 1].date);
  const start = new Date(end);

  if (range === "1D") start.setUTCDate(start.getUTCDate() - 1);
  if (range === "30D") start.setUTCDate(start.getUTCDate() - 30);
  if (range === "1Y") start.setUTCFullYear(start.getUTCFullYear() - 1);
  if (range === "YTD") start.setUTCMonth(0, 1);

  return series.filter((point) => toDateOnly(point.date) >= start);
}

function netFromPoint(point: EvolutionPoint) {
  return point.value - point.invested;
}

function metricFromSeries(series: EvolutionPoint[]): PerformanceMetric {
  if (series.length < 2) return { value: 0, pct: 0 };

  const first = series[0];
  const last = series[series.length - 1];
  const firstNet = netFromPoint(first);
  const lastNet = netFromPoint(last);
  const value = lastNet - firstNet;
  const base = first.invested > 0 ? first.invested : Math.max(last.invested, 0);
  const pct = base > 0 ? (value / base) * 100 : 0;

  return { value, pct };
}

function currentNetMetric(series: EvolutionPoint[]): PerformanceMetric {
  if (series.length === 0) return { value: 0, pct: 0 };

  const last = series[series.length - 1];
  const value = netFromPoint(last);
  const pct = last.invested > 0 ? (value / last.invested) * 100 : 0;

  return { value, pct };
}

function seriesExtremes(series: EvolutionPoint[]) {
  if (series.length === 0) {
    const fallback = { date: new Date().toISOString().slice(0, 10), value: 0 };
    return { max: fallback, min: fallback };
  }

  let max = series[0];
  let min = series[0];

  for (const point of series) {
    if (point.value > max.value) max = point;
    if (point.value < min.value) min = point;
  }

  return { max, min };
}

function calculateAvailableToOperate(positions: PositionByAsset[]) {
  const liquidValue = positions
    .filter((position) => position.assetType === "Fondo" || position.assetType === "Letra")
    .reduce((sum, position) => sum + position.marketValue, 0);

  return Math.max(0, liquidValue * 0.35);
}

function sortSnapshotsAsc(snapshots: PortfolioSnapshotPoint[]) {
  return [...snapshots].sort((a, b) => +toDateOnly(a.date) - +toDateOnly(b.date));
}

function findSnapshotOnOrBefore(
  snapshots: PortfolioSnapshotPoint[],
  targetDate: Date,
): PortfolioSnapshotPoint | null {
  let candidate: PortfolioSnapshotPoint | null = null;
  for (const snapshot of snapshots) {
    if (+toDateOnly(snapshot.date) > +targetDate) break;
    candidate = snapshot;
  }
  return candidate;
}

function metricFromValueDelta(currentValue: number, referenceValue: number): PerformanceMetric {
  const value = currentValue - referenceValue;
  const pct = referenceValue > 0 ? (value / referenceValue) * 100 : 0;
  return { value, pct };
}

function metricFromHistory(
  snapshots: PortfolioSnapshotPoint[],
  range: "30D" | "1Y" | "YTD",
): PerformanceMetric | null {
  if (snapshots.length < 2) return null;

  const sorted = sortSnapshotsAsc(snapshots);
  const current = sorted[sorted.length - 1];
  const currentDate = toDateOnly(current.date);
  const start = new Date(currentDate);

  if (range === "30D") start.setUTCDate(start.getUTCDate() - 30);
  if (range === "1Y") start.setUTCFullYear(start.getUTCFullYear() - 1);
  if (range === "YTD") start.setUTCMonth(0, 1);

  const reference =
    findSnapshotOnOrBefore(sorted, start) ??
    // If we already have history but not enough for the requested window,
    // use the earliest footprint rather than synthesizing a fake date.
    sorted[0];

  if (!reference) return null;
  return metricFromValueDelta(current.value, reference.value);
}

export function getClientProfileViewModel(client: ClientProfileSource): ClientProfileViewModel {
  const summary = holdingsSummary(client.holdings, client.transactions);
  const valuedHoldings = summary.valued;
  const positions = buildPositionsFromLedger(client.holdings, client.transactions);
  const slices = allocationByType(valuedHoldings) as PortfolioSlice[];
  const historySnapshots = client.portfolioSnapshots ?? [];

  const fullSeries = buildSnapshotPerformanceSeries(
    positions,
    client.holdings,
    client.transactions,
    historySnapshots,
  );
  const byFilter: Record<PerformanceFilter, EvolutionPoint[]> = {
    "1D": filterSeries(fullSeries, "1D"),
    "30D": filterSeries(fullSeries, "30D"),
    "1Y": filterSeries(fullSeries, "1Y"),
    YTD: filterSeries(fullSeries, "YTD"),
    HISTORICO: fullSeries,
  };

  const metrics = {
    d1: {
      value: summary.totalValue * (summary.performance.d1 / 100),
      pct: summary.performance.d1,
    },
    d30: metricFromHistory(historySnapshots, "30D") ?? metricFromSeries(byFilter["30D"]),
    y1: metricFromHistory(historySnapshots, "1Y") ?? metricFromSeries(byFilter["1Y"]),
    ytd: metricFromHistory(historySnapshots, "YTD") ?? metricFromSeries(byFilter.YTD),
    sinceStart: currentNetMetric(fullSeries),
    ...seriesExtremes(fullSeries),
  };

  const allOperations: OperationRow[] = [...client.transactions]
    .sort((a, b) => +toDateOnly(b.date) - +toDateOnly(a.date))
    .map((tx) => ({
      id: tx.id,
      date: tx.date,
      type: tx.type,
      asset: tx.asset,
      assetType: tx.assetType,
      quantity: Number(tx.quantity),
      price: Number(tx.price),
      amount: txAmount(tx),
      commission: Number(tx.commission),
      isPeso: Boolean(tx.isPeso),
      mepFxRate: tx.mepFxRate ?? null,
      status: tx.status ?? "Ejecutada",
    }));

  return {
    client,
    summary,
    valuedHoldings,
    positions,
    cards: {
      totalValue: summary.totalValue,
      pnl: summary.pnl,
      pnlPct: summary.pnlPct,
      availableToOperate: calculateAvailableToOperate(positions),
      sinceInception: metrics.sinceStart,
    },
    performance: {
      fullSeries,
      byFilter,
      metrics,
    },
    portfolio: {
      slices,
      total: summary.totalValue,
      positions,
    },
    operations: {
      recent: allOperations.slice(0, 8),
      all: allOperations,
    },
  };
}

export function getClientHeaderMeta(client: Client): ClientProfileHeaderMeta {
  return {
    status: "Cliente activo",
    createdAtLabel: fmtDate(client.fechaAlta),
    email: client.email,
    phone: client.telefono,
    comitente: client.comitente,
  };
}

export function formatPerformanceMetric(metric: PerformanceMetric) {
  return `${fmtMoney(metric.value, { compact: true })} (${fmtPct(metric.pct)})`;
}

export function calculatePositions(
  holdings: Holding[],
  transactions: Transaction[] = [],
): PositionByAsset[] {
  return buildPositionsFromLedger(holdings, transactions);
}
