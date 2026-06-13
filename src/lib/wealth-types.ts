export type UserRole = "SUPER_ADMIN" | "ORG_ADMIN" | "INTERNAL_EDITOR" | "CLIENT_VIEWER";

export type ClientType =
  | "INSTITUTIONAL"
  | "PRIVATE"
  | "FAMILY_OFFICE"
  | "CORPORATE"
  | "OTHER";

export type CustodianType = "ALYC" | "BANK" | "BROKER" | "OTHER";

export type AssetClass =
  | "CASH"
  | "SOVEREIGN_BOND"
  | "CORPORATE_BOND"
  | "LETTER"
  | "FUND"
  | "CEDEAR"
  | "EQUITY"
  | "ETF"
  | "OPTION"
  | "FUTURE"
  | "FIXED_TERM"
  | "CAUCION"
  | "OTHER";

export type ImportStatus = "UPLOADED" | "PARSED" | "NEEDS_REVIEW" | "CONFIRMED" | "FAILED";
export type ReportKind = "HOLDINGS" | "MOVEMENTS";
export type ImportRowState = "READY" | "NEEDS_REVIEW" | "IGNORED" | "ERROR";
export type MatchStatus = "MATCHED" | "AMBIGUOUS" | "NEW_ASSET" | "IGNORED";
export type MarketDataStatus = "live" | "partial" | "fallback" | "unconfigured";
export type PriceOrigin = "LIVE_MARKET" | "LIVE_FUND" | "IMPORT" | "CASH" | "MANUAL";

export type MovementType =
  | "BUY"
  | "SELL"
  | "FUND_SUBSCRIPTION"
  | "FUND_REDEMPTION"
  | "DIVIDEND"
  | "COUPON"
  | "AMORTIZATION"
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "FEE"
  | "TAX"
  | "CASH_BLOCK"
  | "CASH_RELEASE"
  | "OTHER";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type ClientRecord = {
  id: string;
  name: string;
  type: ClientType;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustodianRecord = {
  id: string;
  name: string;
  type: CustodianType;
  code?: string | null;
  aliases: string[];
  isActive: boolean;
};

export type AccountRecord = {
  id: string;
  clientId: string;
  custodianId: string;
  name: string;
  number?: string | null;
  currency: string;
};

export type AssetRecord = {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  currency: string;
  isFund: boolean;
  isCashLike: boolean;
};

export type HoldingRecord = {
  id: string;
  clientId: string;
  accountId: string;
  assetId: string;
  symbol: string;
  assetName: string;
  assetClass: AssetClass;
  currency: string;
  quantity: number;
  availableQuantity: number;
  pledgedQuantity: number;
  averageCost: number | null;
  importPrice: number | null;
  currentPrice: number | null;
  marketPrice: number | null;
  fxRate: number | null;
  marketValueArs: number;
  marketValueUsd: number | null;
  pnlAmountArs: number | null;
  pnlPct: number | null;
  pnlIsEstimated: boolean;
  costBasisArs: number | null;
  quantityDelta: number;
  lastMovementDate: string | null;
  priceSource: PriceOrigin;
  priceCurrency: string | null;
  priceDate: string | null;
  valuationDate: string | null;
  custodianName: string;
  accountName: string;
};

export type DistributionPoint = {
  name: string;
  value: number;
  pct: number;
};

export type AccountBreakdown = {
  id: string;
  name: string;
  number?: string | null;
  totalValueArs: number;
  pnlAmountArs: number | null;
  pct: number;
  holdings: HoldingRecord[];
};

export type CustodianBreakdown = {
  name: string;
  totalValueArs: number;
  totalValueUsd: number | null;
  pnlAmountArs: number | null;
  pct: number;
  byAsset: DistributionPoint[];
  byAccount: DistributionPoint[];
  accounts: AccountBreakdown[];
  holdings: HoldingRecord[];
};

export type MovementRecord = {
  id: string;
  clientId: string;
  accountId: string;
  assetId: string | null;
  symbol: string | null;
  assetName: string | null;
  movementType: MovementType;
  description: string | null;
  tradeDate: string;
  settlementDate: string | null;
  quantity: number | null;
  price: number | null;
  grossAmount: number | null;
  netAmount: number | null;
  fees: number | null;
  taxes: number | null;
  currency: string;
  fxRate: number | null;
  custodianName: string;
  accountName: string;
};

export type ImportRowPreview = {
  id: string;
  rowIndex: number;
  state: ImportRowState;
  reportKind: ReportKind;
  matchStatus: MatchStatus;
  symbol: string;
  description: string;
  assetClass: AssetClass | "OTHER";
  movementType: MovementType | "OTHER" | "";
  quantity: number | null;
  availableQuantity: number | null;
  pledgedQuantity: number | null;
  price: number | null;
  averageCost: number | null;
  fxRate: number | null;
  marketValue: number | null;
  currency: string;
  tradeDate: string | null;
  settlementDate: string | null;
  custodianName: string;
  accountName: string;
  reportDate: string | null;
  notes: string;
  errorMessage?: string | null;
};

export type ImportBatchSummary = {
  id: string;
  clientId: string;
  clientName: string;
  accountId: string | null;
  accountName: string | null;
  custodianName: string | null;
  status: ImportStatus;
  reportKind: ReportKind;
  filename: string;
  fileType: string;
  detectedCustodian: string | null;
  detectionConfidence: number | null;
  reportDate: string | null;
  warningCount: number;
  createdAt: string;
  rowCount: number;
};

export type ImportBatchDetail = ImportBatchSummary & {
  warnings: string[];
  rows: ImportRowPreview[];
};

export type ClientSummary = {
  client: ClientRecord;
  accounts: AccountRecord[];
  custodians: string[];
  totalValueArs: number;
  totalValueUsd: number | null;
  pnlAmountArs: number | null;
  holdingsCount: number;
  movementsCount: number;
  latestReportDate: string | null;
};

export type DashboardSummary = {
  clients: number;
  accounts: number;
  custodians: number;
  importsPending: number;
  totalValueArs: number;
  totalValueUsd: number | null;
  pnlAmountArs: number | null;
  allocationByAssetClass: Array<{ name: string; value: number }>;
  allocationByCustodian: Array<{ name: string; value: number }>;
  clientBreakdown: Array<{
    id: string;
    name: string;
    totalValueArs: number;
    totalValueUsd: number | null;
    pnlAmountArs: number | null;
    custodians: number;
  }>;
};

export type ClientDetailBundle = {
  client: ClientRecord;
  accounts: Array<AccountRecord & { custodianName: string }>;
  holdings: HoldingRecord[];
  movements: MovementRecord[];
  imports: ImportBatchSummary[];
  totals: {
    totalValueArs: number;
    totalValueUsd: number | null;
    pnlAmountArs: number | null;
    pnlPct: number | null;
    mepRate: number | null;
    pricingUpdatedAt: string | null;
    marketDataStatus: MarketDataStatus;
  };
  distributions: {
    byAssetClass: DistributionPoint[];
    byCurrency: DistributionPoint[];
    byCustodian: DistributionPoint[];
    byAsset: DistributionPoint[];
    byAccount: DistributionPoint[];
  };
  custodians: CustodianBreakdown[];
};

export type ImportsPageBundle = {
  clients: ClientSummary[];
  custodians: CustodianRecord[];
  accounts: Array<AccountRecord & { clientName: string; custodianName: string }>;
  batches: ImportBatchSummary[];
};

export type AssetsPageBundle = {
  assets: AssetRecord[];
};

export type FundsPageBundle = {
  funds: Array<{
    id: string;
    code: string;
    name: string;
    assetSymbol: string | null;
    latestPrice: number | null;
    latestPriceDate: string | null;
  }>;
};

export type PricesPageBundle = {
  prices: Array<{
    symbol: string;
    description: string;
    assetClass: AssetClass;
    currency: string;
    currentPrice: number | null;
    pctChange: number | null;
    source: "DATA912" | "ARGENTINA_DATOS";
    updatedAt: string | null;
    bid: number | null;
    ask: number | null;
  }>;
  marketDataStatus: MarketDataStatus;
  fetchedAt: string | null;
  errors: Array<{
    endpoint: string;
    message: string;
  }>;
  dollars: {
    mep: number | null;
    ccl: number | null;
    updatedAt: string | null;
  };
};

export type SettingsBundle = {
  custodians: CustodianRecord[];
  users: AppUser[];
};

export type CreateClientInput = {
  name: string;
  type: ClientType;
  legalName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
};

export type CreateCustodianInput = {
  name: string;
  type: CustodianType;
  code?: string;
  aliases?: string[];
};

export type CreateImportBatchInput = {
  clientId: string;
  accountId?: string;
  custodianId?: string;
  accountName?: string;
  accountNumber?: string;
  filename: string;
  fileType: string;
  mimeType?: string;
  contentBase64: string;
};

export type SaveImportRowsInput = {
  importId: string;
  rows: Array<{
    id: string;
    state: ImportRowState;
    matchStatus: MatchStatus;
    symbol: string;
    description: string;
    assetClass: AssetClass | "OTHER";
    movementType: MovementType | "OTHER" | "";
    quantity: number | null;
    availableQuantity: number | null;
    pledgedQuantity: number | null;
    price: number | null;
    averageCost: number | null;
    fxRate: number | null;
    marketValue: number | null;
    currency: string;
    tradeDate: string | null;
    settlementDate: string | null;
    notes: string;
  }>;
};
