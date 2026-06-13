import type { AssetType } from "@/lib/mock-data";

export type MarketDataStatus = "live" | "partial" | "fallback" | "unconfigured";

export type BenchmarkComponent = {
  symbol: string;
  weight: number;
  currentPrice: number;
  pctChange: number;
};

export type BenchmarkPoint = {
  date: string;
  portfolio: number;
  benchmark: number;
};

export type ModelPortfolio = {
  id: string;
  name: string;
  benchmarkName: string;
  updatedAt: string;
  holdings: ModelHolding[];
};

export type ModelHolding = {
  asset: string;
  type: AssetType;
  weightPct: number;
  currentPrice: number;
  isPeso: boolean;
  performance: {
    d1: number;
    d30: number;
    y1: number;
  };
};

export type ModelPortfolioSummary = {
  totalWeight: number;
  holdings: Array<ModelHolding & { normalizedWeight: number; currentPriceUsd: number }>;
  performance: {
    d1: number;
    d30: number;
    y1: number;
  };
  valuation: {
    mepRate: number;
    weightedPriceUsd: number;
  };
};

export function modelPortfolioSummary(portfolio: ModelPortfolio, mepRate = 0): ModelPortfolioSummary {
  const totalWeight = portfolio.holdings.reduce((sum, holding) => sum + Number(holding.weightPct), 0);
  const safeTotal = totalWeight > 0 ? totalWeight : 1;

  const holdings = portfolio.holdings
    .map((holding) => ({
      ...holding,
      isPeso: Boolean(holding.isPeso),
      weightPct: Number(holding.weightPct),
      normalizedWeight: Number(holding.weightPct) / safeTotal,
      currentPriceUsd:
        Boolean(holding.isPeso) && mepRate > 0
          ? Number(holding.currentPrice) / mepRate
          : Number(holding.currentPrice),
    }))
    .sort((a, b) => b.weightPct - a.weightPct);

  const weighted = (key: "d1" | "d30" | "y1") =>
    holdings.reduce((sum, holding) => sum + holding.normalizedWeight * Number(holding.performance[key]), 0);

  return {
    totalWeight,
    holdings,
    performance: {
      d1: weighted("d1"),
      d30: weighted("d30"),
      y1: weighted("y1"),
    },
    valuation: {
      mepRate,
      weightedPriceUsd: holdings.reduce(
        (sum, holding) => sum + holding.normalizedWeight * holding.currentPriceUsd,
        0,
      ),
    },
  };
}

export function modelPortfolioAllocation(portfolio: ModelPortfolio) {
  const summary = modelPortfolioSummary(portfolio);
  return summary.holdings.map((holding) => ({
    name: holding.asset,
    value: holding.weightPct,
    pct: holding.weightPct,
  }));
}

function buildIndexedSeries(totalPct: number) {
  const current = 100 * (1 + totalPct / 100);
  const step = (current - 100) / 5;
  const labels = ["-30d", "-20d", "-10d", "-5d", "-1d", "Hoy"];

  return labels.map((date, index) => ({
    date,
    value: Number((100 + step * index).toFixed(2)),
  }));
}

export function buildBenchmarkComparison(portfolio: ModelPortfolio, benchmark: BenchmarkComponent[]) {
  const summary = modelPortfolioSummary(portfolio);
  const benchmarkDailyPct = benchmark.reduce((sum, item) => sum + item.weight * item.pctChange, 0);
  const benchmarkMonthlyPct = benchmarkDailyPct * 20;

  const portfolioSeries = buildIndexedSeries(summary.performance.d30);
  const benchmarkSeries = buildIndexedSeries(benchmarkMonthlyPct);

  return {
    portfolioDailyPct: summary.performance.d1,
    portfolioMonthlyPct: summary.performance.d30,
    benchmarkDailyPct,
    benchmarkMonthlyPct,
    spreadDailyPct: summary.performance.d1 - benchmarkDailyPct,
    spreadMonthlyPct: summary.performance.d30 - benchmarkMonthlyPct,
    points: portfolioSeries.map((point, index) => ({
      date: point.date,
      portfolio: point.value,
      benchmark: benchmarkSeries[index]?.value ?? 100,
    })),
  };
}
