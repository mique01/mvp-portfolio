import type { Client, Holding, Transaction } from "./mock-data";

export const fmtMoney = (v: number, opts: { compact?: boolean } = {}) => {
  if (opts.compact && Math.abs(v) >= 1_000_000) {
    return "$" + (v / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "M";
  }
  if (opts.compact && Math.abs(v) >= 1_000) {
    return "$" + (v / 1_000).toLocaleString("es-AR", { maximumFractionDigits: 1 }) + "K";
  }
  return "$" + v.toLocaleString("es-AR", { maximumFractionDigits: 0 });
};

export const fmtPct = (v: number, digits = 2) => `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export type PortfolioSnapshotPoint = {
  date: string;
  value: number;
};

export type HoldingValued = Holding & {
  value: number;
  cost: number;
  pnl: number;
  pnlPct: number;
};

export function valueHoldings(holdings: Holding[]): HoldingValued[] {
  return holdings.map((holding) => {
    const value = holding.quantity * holding.currentPrice;
    const cost = holding.quantity * holding.avgPrice;
    const pnl = value - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
    return { ...holding, value, cost, pnl, pnlPct };
  });
}

export function portfolioPerformance(valued: HoldingValued[]) {
  const total = valued.reduce((sum, holding) => sum + holding.value, 0) || 1;
  const weighted = (key: "d1" | "d30" | "y1") =>
    valued.reduce((sum, holding) => sum + (holding.value / total) * holding.performance[key], 0);

  return {
    d1: weighted("d1"),
    d30: weighted("d30"),
    y1: weighted("y1"),
  };
}

export function holdingsSummary(holdings: Holding[], transactions: Transaction[] = []) {
  const valued = valueHoldings(holdings);
  const totalValue = valued.reduce((sum, holding) => sum + holding.value, 0);
  const totalCost = valued.reduce((sum, holding) => sum + holding.cost, 0);
  const totalCommissions = transactions.reduce(
    (sum, transaction) => sum + transaction.commission,
    0,
  );
  const totalInvested = totalCost + totalCommissions;
  const pnl = totalValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
  const monthlyCommissions = transactions
    .filter((transaction) => {
      const txDate = new Date(transaction.date);
      const now = new Date();
      return (
        txDate.getUTCMonth() === now.getUTCMonth() &&
        txDate.getUTCFullYear() === now.getUTCFullYear()
      );
    })
    .reduce((sum, transaction) => sum + transaction.commission, 0);

  return {
    valued,
    totalValue,
    totalCost,
    totalInvested,
    pnl,
    pnlPct,
    totalCommissions,
    monthlyCommissions,
    performance: portfolioPerformance(valued),
  };
}

export function clientSummary(client: Client) {
  return holdingsSummary(client.holdings, client.transactions);
}

export function allocationByType(valued: HoldingValued[]) {
  const map = new Map<string, number>();
  for (const holding of valued) {
    map.set(holding.type, (map.get(holding.type) ?? 0) + holding.value);
  }

  const total = [...map.values()].reduce((a, b) => a + b, 0) || 1;
  return [...map.entries()].map(([name, value]) => ({
    name,
    value,
    pct: (value / total) * 100,
  }));
}

export function allocationByAsset(valued: HoldingValued[]) {
  const total = valued.reduce((sum, holding) => sum + holding.value, 0) || 1;
  return valued.map((holding) => ({
    name: holding.asset,
    value: holding.value,
    pct: (holding.value / total) * 100,
  }));
}

export function globalMetrics(allClients: Client[]) {
  const summaries = allClients.map((client) => ({ client, summary: clientSummary(client) }));
  const aum = summaries.reduce((sum, entry) => sum + entry.summary.totalValue, 0) || 1;
  const weighted = (key: "d1" | "d30" | "y1") =>
    summaries.reduce(
      (sum, entry) => sum + (entry.summary.totalValue / aum) * entry.summary.performance[key],
      0,
    );

  return {
    summaries,
    aum,
    monthCommissions: summaries.reduce((sum, entry) => sum + entry.summary.monthlyCommissions, 0),
    performance: { d1: weighted("d1"), d30: weighted("d30"), y1: weighted("y1") },
  };
}

export type AssetHolder = {
  clientId: string;
  clientName: string;
  comitente: string;
  quantity: number;
  value: number;
  pctOfPortfolio: number;
  pnlPct: number;
};

export function findAssetHolders(allClients: Client[], asset: string): AssetHolder[] {
  const target = asset.trim().toUpperCase();
  const holders: AssetHolder[] = [];

  for (const client of allClients) {
    const valued = valueHoldings(client.holdings);
    const totalValue = valued.reduce((sum, holding) => sum + holding.value, 0) || 1;
    const match = valued.find((holding) => holding.asset.toUpperCase() === target);
    if (!match) continue;

    holders.push({
      clientId: client.id,
      clientName: client.name,
      comitente: client.comitente,
      quantity: match.quantity,
      value: match.value,
      pctOfPortfolio: (match.value / totalValue) * 100,
      pnlPct: match.pnlPct,
    });
  }

  return holders.sort((a, b) => b.value - a.value);
}

export function assetUniverse(allClients: Client[]) {
  const map = new Map<
    string,
    { asset: string; type: string; holders: number; totalValue: number }
  >();

  for (const client of allClients) {
    const valued = valueHoldings(client.holdings);
    for (const holding of valued) {
      const current = map.get(holding.asset) ?? {
        asset: holding.asset,
        type: holding.type,
        holders: 0,
        totalValue: 0,
      };
      current.holders += 1;
      current.totalValue += holding.value;
      map.set(holding.asset, current);
    }
  }

  return [...map.values()].sort((a, b) => b.totalValue - a.totalValue);
}
