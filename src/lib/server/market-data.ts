import type { AssetType } from "@/lib/mock-data";
import type { MarketDataStatus } from "@/lib/model-portfolio";

type EndpointKey =
  | "cedears"
  | "bonds"
  | "corp"
  | "notes"
  | "stocks"
  | "fciRentaFija"
  | "fciRentaMixta"
  | "fciRentaVariable"
  | "fciMercadoDinero"
  | "fciRetornoTotal";
type DollarEndpointKey = "mep" | "ccl";
export type MarketTipo = "BONDS" | "NOTES" | "CEDEARS" | "CORP" | "STOCKS" | "FCI";

type MarketApiRow = {
  symbol?: string;
  c?: number;
  v?: number;
  q_bid?: number;
  px_bid?: number;
  px_ask?: number;
  q_ask?: number;
  q_op?: number;
  pct_change?: number;
};

type FciApiRow = {
  fondo?: string;
  tipo?: string;
  fecha?: string;
  vcp?: number;
  ccp?: number;
  patrimonio?: number;
  horizonte?: string;
};

type EndpointConfig = {
  endpoint: EndpointKey;
  tipo: MarketTipo;
  defaultUrl: string | (() => string);
  envKey:
    | "MARKET_DATA_BONDS_URL"
    | "MARKET_DATA_NOTES_URL"
    | "MARKET_DATA_CEDEARS_URL"
    | "MARKET_DATA_CORP_URL"
    | "MARKET_DATA_STOCKS_URL"
    | "MARKET_DATA_FCI_RENTAFIJA_URL"
    | "MARKET_DATA_FCI_RENTAMIXTA_URL"
    | "MARKET_DATA_FCI_RETORNOTOTAL_URL"
    | "MARKET_DATA_FCI_MERCADODINERO_URL"
    | "MARKET_DATA_FCI_RENTA_FIJA_URL"
    | "MARKET_DATA_FCI_RENTA_MIXTA_URL"
    | "MARKET_DATA_FCI_RETORNO_TOTAL_URL"
    | "MARKET_DATA_FCI_MERCADO_DINERO_URL";
};

type DollarEndpointConfig = {
  endpoint: DollarEndpointKey;
  url: string;
};

export type NormalizedMarketPrice = {
  tipo: MarketTipo;
  endpoint: EndpointKey;
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  pct_change: number;
  label?: string;
  fecha?: string;
  vcp?: number;
  patrimonio?: number;
};

export type PriceLookup = {
  symbol: string;
  tipo: MarketTipo;
  price: number;
  pct_change: number;
  bid: number;
  ask: number;
  last: number;
  volume: number;
};

export type DollarQuote = {
  compra: number;
  venta: number;
  casa: string;
  nombre: string;
  moneda: string;
  fechaActualizacion: string;
};

export type MarketSnapshot = {
  symbol: string;
  currentPrice: number;
  bidPrice: number | null;
  askPrice: number | null;
  volume: number | null;
  operations: number | null;
  pctChange: number;
  endpoint: EndpointKey;
};

type ConsolidatedMarketData = {
  quotes: NormalizedMarketPrice[];
  bySymbol: Map<string, NormalizedMarketPrice>;
  fetchedAt: string;
  marketDataStatus: MarketDataStatus;
  errors: Array<{ endpoint: EndpointKey; message: string }>;
};

type ConsolidatedDollarData = {
  mep: DollarQuote | null;
  ccl: DollarQuote | null;
  fetchedAt: string;
  errors: Array<{ endpoint: DollarEndpointKey; message: string }>;
};

const CACHE_TTL_MS = 20_000;

const dollarEndpointConfigs: DollarEndpointConfig[] = [
  { endpoint: "mep", url: "https://dolarapi.com/v1/dolares/bolsa" },
  { endpoint: "ccl", url: "https://dolarapi.com/v1/dolares/contadoconliqui" },
];

const endpointConfigs: EndpointConfig[] = [
  {
    endpoint: "bonds",
    tipo: "BONDS",
    defaultUrl: "https://data912.com/live/arg_bonds",
    envKey: "MARKET_DATA_BONDS_URL",
  },
  {
    endpoint: "notes",
    tipo: "NOTES",
    defaultUrl: "https://data912.com/live/arg_notes",
    envKey: "MARKET_DATA_NOTES_URL",
  },
  {
    endpoint: "cedears",
    tipo: "CEDEARS",
    defaultUrl: "https://data912.com/live/arg_cedears",
    envKey: "MARKET_DATA_CEDEARS_URL",
  },
  {
    endpoint: "corp",
    tipo: "CORP",
    defaultUrl: "https://data912.com/live/arg_corp",
    envKey: "MARKET_DATA_CORP_URL",
  },
  {
    endpoint: "stocks",
    tipo: "STOCKS",
    defaultUrl: "https://data912.com/live/arg_stocks",
    envKey: "MARKET_DATA_STOCKS_URL",
  },
  {
    endpoint: "fciRentaFija",
    tipo: "FCI",
    defaultUrl: "https://api.argentinadatos.com/v1/finanzas/fci/rentaFija/ultimo",
    envKey: "MARKET_DATA_FCI_RENTAFIJA_URL",
  },
  {
    endpoint: "fciRentaMixta",
    tipo: "FCI",
    defaultUrl: "https://api.argentinadatos.com/v1/finanzas/fci/rentaMixta/ultimo",
    envKey: "MARKET_DATA_FCI_RENTAMIXTA_URL",
  },
  {
    endpoint: "fciRentaVariable",
    tipo: "FCI",
    defaultUrl: "https://api.argentinadatos.com/v1/finanzas/fci/rentaVariable/ultimo",
    envKey: "MARKET_DATA_FCI_RENTAVARIABLE_URL",
  },
  {
    endpoint: "fciMercadoDinero",
    tipo: "FCI",
    defaultUrl: "https://api.argentinadatos.com/v1/finanzas/fci/mercadoDinero/ultimo",
    envKey: "MARKET_DATA_FCI_MERCADODINERO_URL",
  },
  {
    endpoint: "fciRetornoTotal",
    tipo: "FCI",
    defaultUrl: "https://api.argentinadatos.com/v1/finanzas/fci/retornoTotal/ultimo",
    envKey: "MARKET_DATA_FCI_RETORNOTOTAL_URL",
  },
];

const tipoToEndpoint: Record<MarketTipo, EndpointKey> = {
  BONDS: "bonds",
  NOTES: "notes",
  CEDEARS: "cedears",
  CORP: "corp",
  STOCKS: "stocks",
  FCI: "fciRentaFija",
};

const endpointEnvAliases: Partial<Record<EndpointKey, string[]>> = {
  fciRentaFija: ["MARKET_DATA_FCI_RENTAFIJA_URL", "MARKET_DATA_FCI_RENTA_FIJA_URL"],
  fciRentaMixta: ["MARKET_DATA_FCI_RENTAMIXTA_URL", "MARKET_DATA_FCI_RENTA_MIXTA_URL"],
  fciRentaVariable: ["MARKET_DATA_FCI_RENTAVARIABLE_URL", "MARKET_DATA_FCI_RENTA_VARIABLE_URL"],
  fciMercadoDinero: ["MARKET_DATA_FCI_MERCADODINERO_URL", "MARKET_DATA_FCI_MERCADO_DINERO_URL"],
  fciRetornoTotal: ["MARKET_DATA_FCI_RETORNOTOTAL_URL", "MARKET_DATA_FCI_RETORNO_TOTAL_URL"],
};
const marketCache: {
  expiresAt: number;
  data: ConsolidatedMarketData | null;
  inFlight: Promise<ConsolidatedMarketData> | null;
} = {
  expiresAt: 0,
  data: null,
  inFlight: null,
};

const dollarCache: {
  expiresAt: number;
  data: ConsolidatedDollarData | null;
  inFlight: Promise<ConsolidatedDollarData> | null;
} = {
  expiresAt: 0,
  data: null,
  inFlight: null,
};

function safeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function getArgentinaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isClassAFciRow(row: FciApiRow) {
  const values = Object.values(row)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase())
    .join(" ");

  if (values.includes("clase b") || values.includes("class b")) return false;
  if (values.includes("clase a") || values.includes("class a")) return true;
  if (typeof row.tipo === "string") {
    const tipo = row.tipo.toLowerCase();
    if (tipo.includes("clase b")) return false;
    if (tipo.includes("clase a")) return true;
  }
  return true;
}

function resolveEndpointUrl(config: EndpointConfig) {
  const envKeys = [config.envKey, ...(endpointEnvAliases[config.endpoint] ?? [])];
  for (const envKey of envKeys) {
    const configured = process.env[envKey];
    if (typeof configured === "string" && configured.trim().length > 0) {
      return configured.trim();
    }
  }
  return typeof config.defaultUrl === "function" ? config.defaultUrl() : config.defaultUrl;
}

function normalizeRow(
  row: MarketApiRow,
  tipo: MarketTipo,
  endpoint: EndpointKey,
): NormalizedMarketPrice | null {
  const symbol = typeof row.symbol === "string" ? normalizeSymbol(row.symbol) : "";
  if (!symbol) return null;

  const bid = safeNumber(row.px_bid);
  const ask = safeNumber(row.px_ask);
  const last = safeNumber(row.c);
  const volume = safeNumber(row.v);
  const pct_change = safeNumber(row.pct_change);

  return {
    tipo,
    endpoint,
    symbol,
    bid,
    ask,
    last,
    volume,
    pct_change,
  };
}

function normalizeFciRow(row: FciApiRow, endpoint: EndpointKey): NormalizedMarketPrice | null {
  if (!isClassAFciRow(row)) return null;

  const label = safeString(row.fondo);
  if (!label) return null;
  if (!label.toLowerCase().startsWith("allaria")) return null;

  const vcp = safeNumber(row.vcp);
  const patrimonio = safeNumber(row.patrimonio);
  const fecha = safeString(row.fecha);

  return {
    tipo: "FCI",
    endpoint,
    symbol: normalizeSymbol(label),
    label,
    bid: 0,
    ask: 0,
    last: vcp,
    volume: patrimonio,
    pct_change: 0,
    fecha,
    vcp,
    patrimonio,
  };
}

function pickBestQuote(
  existing: NormalizedMarketPrice | undefined,
  candidate: NormalizedMarketPrice,
) {
  if (!existing) return candidate;
  if (candidate.volume > existing.volume) return candidate;
  if (candidate.last > 0 && existing.last <= 0) return candidate;
  return existing;
}

function calculateMidPrice(quote: Pick<NormalizedMarketPrice, "bid" | "ask" | "last">) {
  const hasBid = quote.bid > 0;
  const hasAsk = quote.ask > 0;
  if (hasBid && hasAsk) return (quote.bid + quote.ask) / 2;
  if (hasBid) return quote.bid;
  if (hasAsk) return quote.ask;
  return quote.last;
}

async function fetchEndpointRows(config: EndpointConfig) {
  const url = resolveEndpointUrl(config);
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) return [] as MarketApiRow[];
  return payload as MarketApiRow[];
}

async function fetchFciRows(config: EndpointConfig) {
  const url = resolveEndpointUrl(config);
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) return [] as FciApiRow[];
  return payload as FciApiRow[];
}

async function fetchDollarQuote(config: DollarEndpointConfig): Promise<DollarQuote> {
  const response = await fetch(config.url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;

  return {
    compra: safeNumber(payload.compra),
    venta: safeNumber(payload.venta),
    casa: safeString(payload.casa),
    nombre: safeString(payload.nombre),
    moneda: safeString(payload.moneda, "ARS"),
    fechaActualizacion: safeString(payload.fechaActualizacion, new Date().toISOString()),
  };
}

function deriveStatus(
  quoteCount: number,
  configuredCount: number,
  errorsCount: number,
): MarketDataStatus {
  if (configuredCount === 0) return "unconfigured";
  if (quoteCount === 0) return "fallback";
  if (errorsCount > 0) return "partial";
  return "live";
}

async function buildConsolidatedMarketData(): Promise<ConsolidatedMarketData> {
  const quotes: NormalizedMarketPrice[] = [];
  const bySymbol = new Map<string, NormalizedMarketPrice>();
  const errors: Array<{ endpoint: EndpointKey; message: string }> = [];
  let configuredCount = 0;

  await Promise.all([
    ...endpointConfigs.map(async (config) => {
      const endpointUrl = resolveEndpointUrl(config);
      if (!endpointUrl) return;

      configuredCount += 1;

      try {
        const rows =
          config.tipo === "FCI" ? await fetchFciRows(config) : await fetchEndpointRows(config);
        for (const row of rows) {
          const normalized =
            config.tipo === "FCI"
              ? normalizeFciRow(row as FciApiRow, config.endpoint)
              : normalizeRow(row as MarketApiRow, config.tipo, config.endpoint);
          if (!normalized) continue;
          quotes.push(normalized);
          const previous = bySymbol.get(normalized.symbol);
          bySymbol.set(normalized.symbol, pickBestQuote(previous, normalized));
        }
      } catch (error) {
        errors.push({
          endpoint: config.endpoint,
          message: error instanceof Error ? error.message : "Unknown market endpoint error",
        });
      }
    }),
  ]);

  return {
    quotes,
    bySymbol,
    fetchedAt: new Date().toISOString(),
    marketDataStatus: deriveStatus(quotes.length, configuredCount, errors.length),
    errors,
  };
}

async function buildConsolidatedDollarData(): Promise<ConsolidatedDollarData> {
  const errors: Array<{ endpoint: DollarEndpointKey; message: string }> = [];
  let mep: DollarQuote | null = null;
  let ccl: DollarQuote | null = null;

  await Promise.all(
    dollarEndpointConfigs.map(async (config) => {
      try {
        const quote = await fetchDollarQuote(config);
        if (config.endpoint === "mep") mep = quote;
        if (config.endpoint === "ccl") ccl = quote;
      } catch (error) {
        errors.push({
          endpoint: config.endpoint,
          message: error instanceof Error ? error.message : "Unknown dollar endpoint error",
        });
      }
    }),
  );

  return {
    mep,
    ccl,
    fetchedAt: new Date().toISOString(),
    errors,
  };
}

export async function loadConsolidatedMarketData(options?: {
  forceRefresh?: boolean;
}): Promise<ConsolidatedMarketData> {
  const now = Date.now();
  const forceRefresh = Boolean(options?.forceRefresh);

  if (!forceRefresh && marketCache.data && now < marketCache.expiresAt) {
    return marketCache.data;
  }

  if (!forceRefresh && marketCache.inFlight) {
    return marketCache.inFlight;
  }

  marketCache.inFlight = buildConsolidatedMarketData()
    .then((data) => {
      marketCache.data = data;
      marketCache.expiresAt = Date.now() + CACHE_TTL_MS;
      return data;
    })
    .finally(() => {
      marketCache.inFlight = null;
    });

  return marketCache.inFlight;
}

export async function loadNormalizedMarketPrices(options?: { forceRefresh?: boolean }) {
  const [data, dollars] = await Promise.all([
    loadConsolidatedMarketData(options),
    loadDollarRates(options),
  ]);
  const prices = data.quotes.filter((quote) => quote.tipo !== "FCI");
  const funds = data.quotes
    .filter((quote) => quote.tipo === "FCI")
    .sort((a, b) => (a.label ?? a.symbol).localeCompare(b.label ?? b.symbol));
  return {
    prices,
    funds,
    fetchedAt: data.fetchedAt,
    marketDataStatus: data.marketDataStatus,
    errors: data.errors,
    dollars: {
      mep: dollars.mep,
      ccl: dollars.ccl,
      fetchedAt: dollars.fetchedAt,
      errors: dollars.errors,
    },
  };
}

export async function loadDollarRates(options?: {
  forceRefresh?: boolean;
}): Promise<ConsolidatedDollarData> {
  const now = Date.now();
  const forceRefresh = Boolean(options?.forceRefresh);

  if (!forceRefresh && dollarCache.data && now < dollarCache.expiresAt) {
    return dollarCache.data;
  }

  if (!forceRefresh && dollarCache.inFlight) {
    return dollarCache.inFlight;
  }

  dollarCache.inFlight = buildConsolidatedDollarData()
    .then((data) => {
      dollarCache.data = data;
      dollarCache.expiresAt = Date.now() + CACHE_TTL_MS;
      return data;
    })
    .finally(() => {
      dollarCache.inFlight = null;
    });

  return dollarCache.inFlight;
}

export async function getPrice(
  symbol: string,
  options?: { forceRefresh?: boolean },
): Promise<PriceLookup | null> {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) return null;

  const data = await loadConsolidatedMarketData(options);
  const quote = data.bySymbol.get(normalized);
  if (!quote) return null;

  return {
    symbol: quote.symbol,
    tipo: quote.tipo,
    price: calculateMidPrice(quote),
    pct_change: quote.pct_change,
    bid: quote.bid,
    ask: quote.ask,
    last: quote.last,
    volume: quote.volume,
  };
}

function snapshotFromQuote(quote: NormalizedMarketPrice): MarketSnapshot {
  return {
    symbol: quote.symbol,
    currentPrice: calculateMidPrice(quote),
    bidPrice: quote.bid || null,
    askPrice: quote.ask || null,
    volume: quote.volume || null,
    operations: null,
    pctChange: quote.pct_change,
    endpoint: quote.endpoint,
  };
}

export async function loadMarketSnapshots(
  requestedAssets: Array<{ symbol: string; type: AssetType }>,
): Promise<{ snapshots: Map<string, MarketSnapshot>; status: MarketDataStatus }> {
  if (!requestedAssets.length) {
    return { snapshots: new Map(), status: "unconfigured" };
  }

  const market = await loadConsolidatedMarketData();
  const snapshots = new Map<string, MarketSnapshot>();
  let matchedAssets = 0;

  for (const asset of requestedAssets) {
    const normalized = normalizeSymbol(asset.symbol);
    if (!normalized) continue;

    const quote = market.bySymbol.get(normalized);
    if (!quote) continue;

    snapshots.set(normalized, snapshotFromQuote(quote));
    matchedAssets += 1;
  }

  if (market.marketDataStatus === "unconfigured") {
    return { snapshots, status: "unconfigured" };
  }

  if (matchedAssets === 0) {
    return { snapshots, status: "fallback" };
  }

  return {
    snapshots,
    status: matchedAssets === requestedAssets.length ? market.marketDataStatus : "partial",
  };
}
