import { prisma } from "@/lib/server/prisma/client";
import { parseImportBatchInput } from "@/lib/server/import-parser";
import type {
  AccountRecord,
  AppUser,
  AssetClass,
  AssetRecord,
  AssetsPageBundle,
  ClientDetailBundle,
  ClientRecord,
  ClientSummary,
  CreateClientInput,
  CreateCustodianInput,
  CreateImportBatchInput,
  CustodianRecord,
  DashboardSummary,
  FundsPageBundle,
  HoldingRecord,
  ImportBatchDetail,
  ImportBatchSummary,
  ImportRowPreview,
  ImportsPageBundle,
  MatchStatus,
  MovementRecord,
  MovementType,
  SaveImportRowsInput,
  SettingsBundle,
} from "@/lib/wealth-types";

type FundRecord = {
  id: string;
  code: string;
  name: string;
  assetSymbol: string | null;
  latestPrice: number | null;
  latestPriceDate: string | null;
};

type StateSnapshot = {
  organizationId: string;
  organizationName: string;
  users: AppUser[];
  clients: ClientRecord[];
  custodians: CustodianRecord[];
  accounts: Array<AccountRecord & { clientName: string; custodianName: string }>;
  assets: AssetRecord[];
  holdings: HoldingRecord[];
  movements: MovementRecord[];
  imports: ImportBatchDetail[];
  funds: FundRecord[];
};

type MemoryState = StateSnapshot;

const globalForWealth = globalThis as unknown as {
  wealthState?: MemoryState;
};

function useDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function nowIso() {
  return new Date().toISOString();
}

function cuid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function round(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function assetClassLabel(assetClass: AssetClass) {
  return assetClass.replace(/_/g, " ");
}

function aggregateBy<T>(items: T[], getKey: (item: T) => string, getValue: (item: T) => number) {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = getKey(item);
    map.set(key, (map.get(key) ?? 0) + getValue(item));
  });
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function getMemoryState() {
  if (globalForWealth.wealthState) return globalForWealth.wealthState;

  const organizationId = "org_apex_demo";
  const users: AppUser[] = [
    { id: "usr_super", name: "Miqueas Elias", email: "miqueas@apexhub.ai", role: "SUPER_ADMIN" },
    { id: "usr_admin", name: "Admin Wealth", email: "admin@apexhub.ai", role: "ORG_ADMIN" },
    { id: "usr_client", name: "Claudia Comolli", email: "claudia@example.com", role: "CLIENT_VIEWER" },
  ];

  const clients: ClientRecord[] = [
    {
      id: "cli_claudia",
      name: "Claudia L. Comolli",
      type: "PRIVATE",
      legalName: "Claudia Liliana Comolli",
      email: "claudia@example.com",
      phone: "+54 11 5555 0101",
      taxId: "27-00000001-9",
      notes: "Cliente privada con Allaria y Galicia.",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: "cli_fundacion",
      name: "Fundacion Sur",
      type: "INSTITUTIONAL",
      legalName: "Fundacion Sur para el Desarrollo",
      email: "tesoreria@fundacionsur.org",
      phone: "+54 11 5555 0202",
      taxId: "30-00000002-7",
      notes: "Mandato institucional multi-custodio.",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];

  const custodians: CustodianRecord[] = [
    { id: "cus_allaria", name: "Allaria", type: "ALYC", code: "ALL", aliases: ["allaria"], isActive: true },
    { id: "cus_cocos", name: "Cocos", type: "BROKER", code: "COCOS", aliases: ["cocos"], isActive: true },
    { id: "cus_galicia", name: "Banco Galicia", type: "BANK", code: "GAL", aliases: ["galicia"], isActive: true },
  ];

  const accounts: Array<AccountRecord & { clientName: string; custodianName: string }> = [
    {
      id: "acc_claudia_allaria",
      clientId: "cli_claudia",
      custodianId: "cus_allaria",
      name: "Cuenta 931931",
      number: "931931",
      currency: "ARS",
      clientName: "Claudia L. Comolli",
      custodianName: "Allaria",
    },
    {
      id: "acc_fundacion_cocos",
      clientId: "cli_fundacion",
      custodianId: "cus_cocos",
      name: "Cuenta 415326",
      number: "415326",
      currency: "ARS",
      clientName: "Fundacion Sur",
      custodianName: "Cocos",
    },
    {
      id: "acc_fundacion_galicia",
      clientId: "cli_fundacion",
      custodianId: "cus_galicia",
      name: "Custodia Galicia 01",
      number: "GAL-01",
      currency: "ARS",
      clientName: "Fundacion Sur",
      custodianName: "Banco Galicia",
    },
  ];

  const assets: AssetRecord[] = [
    { id: "ast_meli", symbol: "MELI", name: "MercadoLibre CEDEAR", assetClass: "CEDEAR", currency: "ARS", isFund: false, isCashLike: false },
    { id: "ast_nu", symbol: "NU", name: "Nu Holdings CEDEAR", assetClass: "CEDEAR", currency: "ARS", isFund: false, isCashLike: false },
    { id: "ast_dec2o", symbol: "DEC2O", name: "ON EDESA CL 2", assetClass: "CORPORATE_BOND", currency: "USD", isFund: false, isCashLike: false },
    { id: "ast_ao28", symbol: "AO28", name: "Bono Tesoro AO28", assetClass: "SOVEREIGN_BOND", currency: "USD", isFund: false, isCashLike: false },
    { id: "ast_aldret", symbol: "AL_D_RET_A_MEP", name: "Allaria Dolar Retorno Total Clase A", assetClass: "FUND", currency: "USD", isFund: true, isCashLike: false },
    { id: "ast_aldina", symbol: "AL_DINA_D_MEP_A", name: "Allaria Dolar Dinamico Clase A", assetClass: "FUND", currency: "USD", isFund: true, isCashLike: false },
    { id: "ast_cocorma", symbol: "COCORMA", name: "FCI Cocos Rendimiento Clase A", assetClass: "FUND", currency: "ARS", isFund: true, isCashLike: false },
    { id: "ast_ibit", symbol: "IBIT", name: "iShares Bitcoin Trust CEDEAR", assetClass: "CEDEAR", currency: "ARS", isFund: false, isCashLike: false },
    { id: "ast_ars", symbol: "ARS", name: "Pesos", assetClass: "CASH", currency: "ARS", isFund: false, isCashLike: true },
    { id: "ast_usdm", symbol: "USD_MEP", name: "Dolar MEP", assetClass: "CASH", currency: "USD_MEP", isFund: false, isCashLike: true },
  ];

  const holdings: HoldingRecord[] = [
    {
      id: "h1",
      clientId: "cli_claudia",
      accountId: "acc_claudia_allaria",
      assetId: "ast_meli",
      symbol: "MELI",
      assetName: "MercadoLibre CEDEAR",
      assetClass: "CEDEAR",
      currency: "ARS",
      quantity: 19,
      availableQuantity: 19,
      pledgedQuantity: 0,
      averageCost: 19800,
      marketPrice: 20345.24,
      fxRate: 1,
      marketValueArs: 376200,
      marketValueUsd: round(376200 / 1448.33),
      pnlAmountArs: round((20345.24 - 19800) * 19),
      pnlIsEstimated: false,
      valuationDate: "2026-06-12",
      custodianName: "Allaria",
      accountName: "Cuenta 931931",
    },
    {
      id: "h2",
      clientId: "cli_claudia",
      accountId: "acc_claudia_allaria",
      assetId: "ast_nu",
      symbol: "NU",
      assetName: "Nu Holdings CEDEAR",
      assetClass: "CEDEAR",
      currency: "ARS",
      quantity: 80,
      availableQuantity: 80,
      pledgedQuantity: 0,
      averageCost: 9100,
      marketPrice: 9471.96,
      fxRate: 1,
      marketValueArs: 728000,
      marketValueUsd: round(728000 / 1448.33),
      pnlAmountArs: round((9471.96 - 9100) * 80),
      pnlIsEstimated: false,
      valuationDate: "2026-06-12",
      custodianName: "Allaria",
      accountName: "Cuenta 931931",
    },
    {
      id: "h3",
      clientId: "cli_claudia",
      accountId: "acc_claudia_allaria",
      assetId: "ast_aldret",
      symbol: "AL_D_RET_A_MEP",
      assetName: "Allaria Dolar Retorno Total Clase A",
      assetClass: "FUND",
      currency: "USD",
      quantity: 497.79,
      availableQuantity: 497.79,
      pledgedQuantity: 0,
      averageCost: 1.259311,
      marketPrice: 1.68299,
      fxRate: 1448.33,
      marketValueArs: 907917.77,
      marketValueUsd: 626.87,
      pnlAmountArs: round((1.68299 - 1.259311) * 497.79 * 1448.33),
      pnlIsEstimated: false,
      valuationDate: "2026-06-12",
      custodianName: "Allaria",
      accountName: "Cuenta 931931",
    },
    {
      id: "h4",
      clientId: "cli_claudia",
      accountId: "acc_claudia_allaria",
      assetId: "ast_aldina",
      symbol: "AL_DINA_D_MEP_A",
      assetName: "Allaria Dolar Dinamico Clase A",
      assetClass: "FUND",
      currency: "USD",
      quantity: 1207.89,
      availableQuantity: 1207.89,
      pledgedQuantity: 0,
      averageCost: 1.209938,
      marketPrice: 1.67755,
      fxRate: 1448.33,
      marketValueArs: 2116701.64,
      marketValueUsd: 1461.48,
      pnlAmountArs: round((1.67755 - 1.209938) * 1207.89 * 1448.33),
      pnlIsEstimated: false,
      valuationDate: "2026-06-12",
      custodianName: "Allaria",
      accountName: "Cuenta 931931",
    },
    {
      id: "h5",
      clientId: "cli_fundacion",
      accountId: "acc_fundacion_cocos",
      assetId: "ast_cocorma",
      symbol: "COCORMA",
      assetName: "FCI Cocos Rendimiento Clase A",
      assetClass: "FUND",
      currency: "ARS",
      quantity: 246.97,
      availableQuantity: 246.97,
      pledgedQuantity: 0,
      averageCost: 11161.47,
      marketPrice: 11155.22,
      fxRate: 1,
      marketValueArs: 2755,
      marketValueUsd: round(2755 / 1454.32),
      pnlAmountArs: round((11155.22 - 11161.47) * 246.97),
      pnlIsEstimated: false,
      valuationDate: "2026-06-10",
      custodianName: "Cocos",
      accountName: "Cuenta 415326",
    },
    {
      id: "h6",
      clientId: "cli_fundacion",
      accountId: "acc_fundacion_cocos",
      assetId: "ast_ibit",
      symbol: "IBIT",
      assetName: "iShares Bitcoin Trust CEDEAR",
      assetClass: "CEDEAR",
      currency: "ARS",
      quantity: 39,
      availableQuantity: 39,
      pledgedQuantity: 0,
      averageCost: 6520,
      marketPrice: 5305,
      fxRate: 1,
      marketValueArs: 206895,
      marketValueUsd: round(206895 / 1454.32),
      pnlAmountArs: round((5305 - 6520) * 39),
      pnlIsEstimated: true,
      valuationDate: "2026-06-10",
      custodianName: "Cocos",
      accountName: "Cuenta 415326",
    },
    {
      id: "h7",
      clientId: "cli_fundacion",
      accountId: "acc_fundacion_galicia",
      assetId: "ast_ars",
      symbol: "ARS",
      assetName: "Pesos",
      assetClass: "CASH",
      currency: "ARS",
      quantity: 1500000,
      availableQuantity: 1500000,
      pledgedQuantity: 0,
      averageCost: 1,
      marketPrice: 1,
      fxRate: 1,
      marketValueArs: 1500000,
      marketValueUsd: round(1500000 / 1454.32),
      pnlAmountArs: 0,
      pnlIsEstimated: false,
      valuationDate: "2026-06-12",
      custodianName: "Banco Galicia",
      accountName: "Custodia Galicia 01",
    },
  ];

  const movements: MovementRecord[] = [
    {
      id: "m1",
      clientId: "cli_fundacion",
      accountId: "acc_fundacion_cocos",
      assetId: "ast_meli",
      symbol: "MELI",
      assetName: "MercadoLibre CEDEAR",
      movementType: "BUY",
      description: "Compra CEDEAR MERCADOLIBRE INC.",
      tradeDate: "2026-05-08",
      settlementDate: "2026-05-11",
      quantity: 9,
      price: 20303.3333,
      grossAmount: -182730,
      netAmount: -183835.52,
      fees: 822.285,
      taxes: 283.2315,
      currency: "ARS",
      fxRate: null,
      custodianName: "Cocos",
      accountName: "Cuenta 415326",
    },
    {
      id: "m2",
      clientId: "cli_fundacion",
      accountId: "acc_fundacion_cocos",
      assetId: "ast_cocorma",
      symbol: "COCORMA",
      assetName: "FCI Cocos Rendimiento Clase A",
      movementType: "FUND_REDEMPTION",
      description: "Liquidacion Rescate Fci",
      tradeDate: "2026-05-08",
      settlementDate: "2026-05-08",
      quantity: -12960.0498,
      price: 10956.748,
      grossAmount: 142000,
      netAmount: 142000,
      fees: 0,
      taxes: 0,
      currency: "ARS",
      fxRate: null,
      custodianName: "Cocos",
      accountName: "Cuenta 415326",
    },
  ];

  const imports: ImportBatchDetail[] = [
    {
      id: "imp_allaria_01",
      clientId: "cli_claudia",
      clientName: "Claudia L. Comolli",
      accountId: "acc_claudia_allaria",
      accountName: "Cuenta 931931",
      custodianName: "Allaria",
      status: "CONFIRMED",
      reportKind: "HOLDINGS",
      filename: "valuacion_12-06-26.pdf",
      fileType: "PDF",
      detectedCustodian: "Allaria",
      detectionConfidence: 0.9,
      reportDate: "2026-06-12",
      warningCount: 0,
      createdAt: nowIso(),
      rowCount: 4,
      warnings: [],
      rows: [],
    },
    {
      id: "imp_cocos_01",
      clientId: "cli_fundacion",
      clientName: "Fundacion Sur",
      accountId: "acc_fundacion_cocos",
      accountName: "Cuenta 415326",
      custodianName: "Cocos",
      status: "NEEDS_REVIEW",
      reportKind: "MOVEMENTS",
      filename: "movimientos_cuenta.csv",
      fileType: "CSV",
      detectedCustodian: "Cocos",
      detectionConfidence: 0.97,
      reportDate: "2026-05-04",
      warningCount: 1,
      createdAt: nowIso(),
      rowCount: 2,
      warnings: ["Las filas monetarias sin instrumento deben revisarse antes de confirmar."],
      rows: [],
    },
  ];

  const funds: FundRecord[] = [
    {
      id: "fund_1",
      code: "AL_DINA_D_MEP_A",
      name: "Allaria Dolar Dinamico Clase A",
      assetSymbol: "AL_DINA_D_MEP_A",
      latestPrice: 1.67755,
      latestPriceDate: "2026-06-11",
    },
    {
      id: "fund_2",
      code: "COCORMA",
      name: "FCI Cocos Rendimiento Clase A",
      assetSymbol: "COCORMA",
      latestPrice: 11155.22,
      latestPriceDate: "2026-06-10",
    },
  ];

  globalForWealth.wealthState = {
    organizationId,
    organizationName: "Apex Wealth Hub",
    users,
    clients,
    custodians,
    accounts,
    assets,
    holdings,
    movements,
    imports,
    funds,
  };

  return globalForWealth.wealthState;
}

async function readState(): Promise<StateSnapshot> {
  if (!useDatabase()) return structuredClone(getMemoryState());

  const organization = await prisma.organization.findFirst({
    include: {
      users: true,
      clients: true,
      custodians: true,
      accounts: { include: { client: true, custodian: true } },
      assets: true,
      holdings: { include: { asset: true, account: { include: { custodian: true } } } },
      movements: { include: { asset: true, account: { include: { custodian: true } } } },
      imports: {
        include: {
          client: true,
          account: true,
          custodian: true,
          rows: { orderBy: { rowIndex: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!organization) return structuredClone(getMemoryState());

  const assets = organization.assets.map<AssetRecord>((asset) => ({
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    assetClass: asset.assetClass,
    currency: asset.currency,
    isFund: asset.isFund,
    isCashLike: asset.isCashLike,
  }));

  const state: StateSnapshot = {
    organizationId: organization.id,
    organizationName: organization.name,
    users: organization.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })),
    clients: organization.clients.map((client) => ({
      id: client.id,
      name: client.name,
      type: client.type,
      legalName: client.legalName,
      email: client.email,
      phone: client.phone,
      taxId: client.taxId,
      notes: client.notes,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    })),
    custodians: organization.custodians.map((custodian) => ({
      id: custodian.id,
      name: custodian.name,
      type: custodian.type,
      code: custodian.code,
      aliases: custodian.aliases,
      isActive: custodian.isActive,
    })),
    accounts: organization.accounts.map((account) => ({
      id: account.id,
      clientId: account.clientId,
      custodianId: account.custodianId,
      name: account.name,
      number: account.number,
      currency: account.currency,
      clientName: account.client.name,
      custodianName: account.custodian.name,
    })),
    assets,
    holdings: organization.holdings.map((holding) => ({
      id: holding.id,
      clientId: holding.clientId,
      accountId: holding.accountId,
      assetId: holding.assetId,
      symbol: holding.asset.symbol,
      assetName: holding.asset.name,
      assetClass: holding.asset.assetClass,
      currency: holding.asset.currency,
      quantity: Number(holding.quantity),
      availableQuantity: Number(holding.availableQuantity),
      pledgedQuantity: Number(holding.pledgedQuantity),
      averageCost: holding.averageCost == null ? null : Number(holding.averageCost),
      marketPrice: holding.marketPrice == null ? null : Number(holding.marketPrice),
      fxRate: holding.fxRate == null ? null : Number(holding.fxRate),
      marketValueArs: Number(holding.marketValueArs ?? 0),
      marketValueUsd: holding.marketValueUsd == null ? null : Number(holding.marketValueUsd),
      pnlAmountArs: holding.pnlAmountArs == null ? null : Number(holding.pnlAmountArs),
      pnlIsEstimated: holding.pnlIsEstimated,
      valuationDate: holding.valuationDate?.toISOString().slice(0, 10) ?? null,
      custodianName: holding.account.custodian.name,
      accountName: holding.account.name,
    })),
    movements: organization.movements.map((movement) => ({
      id: movement.id,
      clientId: movement.clientId,
      accountId: movement.accountId,
      assetId: movement.assetId,
      symbol: movement.asset?.symbol ?? null,
      assetName: movement.asset?.name ?? null,
      movementType: movement.type,
      description: movement.description,
      tradeDate: movement.tradeDate.toISOString().slice(0, 10),
      settlementDate: movement.settlementDate?.toISOString().slice(0, 10) ?? null,
      quantity: movement.quantity == null ? null : Number(movement.quantity),
      price: movement.price == null ? null : Number(movement.price),
      grossAmount: movement.grossAmount == null ? null : Number(movement.grossAmount),
      netAmount: movement.netAmount == null ? null : Number(movement.netAmount),
      fees: movement.fees == null ? null : Number(movement.fees),
      taxes: movement.taxes == null ? null : Number(movement.taxes),
      currency: movement.currency,
      fxRate: movement.fxRate == null ? null : Number(movement.fxRate),
      custodianName: movement.account.custodian.name,
      accountName: movement.account.name,
    })),
    imports: organization.imports.map((batch) => ({
      id: batch.id,
      clientId: batch.clientId,
      clientName: batch.client.name,
      accountId: batch.accountId,
      accountName: batch.account?.name ?? null,
      custodianName: batch.custodian?.name ?? null,
      status: batch.status,
      reportKind: batch.reportKind,
      filename: batch.filename,
      fileType: batch.fileType,
      detectedCustodian: batch.detectedCustodian,
      detectionConfidence: batch.detectionConfidence == null ? null : Number(batch.detectionConfidence),
      reportDate: batch.reportDate?.toISOString().slice(0, 10) ?? null,
      warningCount: Array.isArray(batch.warningsJson) ? batch.warningsJson.length : 0,
      createdAt: batch.createdAt.toISOString(),
      rowCount: batch.rows.length,
      warnings: Array.isArray(batch.warningsJson) ? batch.warningsJson.map(String) : [],
      rows: batch.rows.map((row) => mapStoredImportRow(row.id, row.rowIndex, row.state, row.reportKind, row.matchStatus, row.normalizedData as Record<string, unknown>, row.errorMessage)),
    })),
    funds: [],
  };

  const fundMasterRows = await prisma.fundMaster.findMany({
    where: { organizationId: organization.id },
    include: { asset: true, prices: { orderBy: { date: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });

  state.funds = fundMasterRows.map((fund) => ({
    id: fund.id,
    code: fund.code,
    name: fund.name,
    assetSymbol: fund.asset?.symbol ?? null,
    latestPrice: fund.prices[0] ? Number(fund.prices[0].vcp) : null,
    latestPriceDate: fund.prices[0]?.date.toISOString().slice(0, 10) ?? null,
  }));

  return state;
}

function summarizeClient(state: StateSnapshot, client: ClientRecord): ClientSummary {
  const accounts = state.accounts.filter((account) => account.clientId === client.id);
  const holdings = state.holdings.filter((holding) => holding.clientId === client.id);
  const movements = state.movements.filter((movement) => movement.clientId === client.id);
  const imports = state.imports.filter((batch) => batch.clientId === client.id);

  const totalValueArs = holdings.reduce((sum, holding) => sum + holding.marketValueArs, 0);
  const totalValueUsd = holdings.some((holding) => holding.marketValueUsd != null)
    ? round(holdings.reduce((sum, holding) => sum + (holding.marketValueUsd ?? 0), 0))
    : null;
  const pnlAmountArs = holdings.some((holding) => holding.pnlAmountArs != null)
    ? round(holdings.reduce((sum, holding) => sum + (holding.pnlAmountArs ?? 0), 0))
    : null;
  const latestReportDate = imports
    .map((batch) => batch.reportDate)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  return {
    client,
    accounts,
    custodians: [...new Set(accounts.map((account) => account.custodianName))],
    totalValueArs: round(totalValueArs) ?? 0,
    totalValueUsd,
    pnlAmountArs,
    holdingsCount: holdings.length,
    movementsCount: movements.length,
    latestReportDate,
  };
}

export async function getDashboardSummary() {
  const state = await readState();
  const clientSummaries = state.clients.map((client) => summarizeClient(state, client));
  const totalValueArs = clientSummaries.reduce((sum, item) => sum + item.totalValueArs, 0);
  const totalValueUsd = clientSummaries.some((item) => item.totalValueUsd != null)
    ? round(clientSummaries.reduce((sum, item) => sum + (item.totalValueUsd ?? 0), 0))
    : null;
  const pnlAmountArs = clientSummaries.some((item) => item.pnlAmountArs != null)
    ? round(clientSummaries.reduce((sum, item) => sum + (item.pnlAmountArs ?? 0), 0))
    : null;

  const summary: DashboardSummary = {
    clients: state.clients.length,
    accounts: state.accounts.length,
    custodians: state.custodians.length,
    importsPending: state.imports.filter((batch) => batch.status !== "CONFIRMED").length,
    totalValueArs: round(totalValueArs) ?? 0,
    totalValueUsd,
    pnlAmountArs,
    allocationByAssetClass: aggregateBy(
      state.holdings,
      (holding) => assetClassLabel(holding.assetClass),
      (holding) => holding.marketValueArs,
    ),
    allocationByCustodian: aggregateBy(
      state.holdings,
      (holding) => holding.custodianName,
      (holding) => holding.marketValueArs,
    ),
    clientBreakdown: clientSummaries.map((item) => ({
      id: item.client.id,
      name: item.client.name,
      totalValueArs: item.totalValueArs,
      totalValueUsd: item.totalValueUsd,
      pnlAmountArs: item.pnlAmountArs,
      custodians: item.custodians.length,
    })),
  };

  return summary;
}

export async function getClientsBundle() {
  const state = await readState();
  return state.clients.map((client) => summarizeClient(state, client));
}

export async function getClientDetail(clientId: string): Promise<ClientDetailBundle | null> {
  const state = await readState();
  const client = state.clients.find((item) => item.id === clientId) ?? null;
  if (!client) return null;

  const accounts = state.accounts.filter((account) => account.clientId === client.id);
  const holdings = state.holdings
    .filter((holding) => holding.clientId === client.id)
    .sort((left, right) => right.marketValueArs - left.marketValueArs);
  const movements = state.movements
    .filter((movement) => movement.clientId === client.id)
    .sort((left, right) => right.tradeDate.localeCompare(left.tradeDate));
  const imports = state.imports.filter((item) => item.clientId === client.id);

  return {
    client,
    accounts: accounts.map((account) => ({
      id: account.id,
      clientId: account.clientId,
      custodianId: account.custodianId,
      name: account.name,
      number: account.number,
      currency: account.currency,
      custodianName: account.custodianName,
    })),
    holdings,
    movements,
    imports: imports.map(toSummary),
    totals: {
      totalValueArs: round(holdings.reduce((sum, holding) => sum + holding.marketValueArs, 0)) ?? 0,
      totalValueUsd: holdings.some((holding) => holding.marketValueUsd != null)
        ? round(holdings.reduce((sum, holding) => sum + (holding.marketValueUsd ?? 0), 0))
        : null,
      pnlAmountArs: holdings.some((holding) => holding.pnlAmountArs != null)
        ? round(holdings.reduce((sum, holding) => sum + (holding.pnlAmountArs ?? 0), 0))
        : null,
    },
    distributions: {
      byAssetClass: aggregateBy(
        holdings,
        (holding) => assetClassLabel(holding.assetClass),
        (holding) => holding.marketValueArs,
      ),
      byCurrency: aggregateBy(holdings, (holding) => holding.currency, (holding) => holding.marketValueArs),
      byCustodian: aggregateBy(holdings, (holding) => holding.custodianName, (holding) => holding.marketValueArs),
    },
  };
}

export async function getImportsBundle(): Promise<ImportsPageBundle> {
  const state = await readState();
  return {
    clients: state.clients.map((client) => summarizeClient(state, client)),
    custodians: state.custodians,
    accounts: state.accounts,
    batches: state.imports.map(toSummary),
  };
}

export async function getImportBatchDetail(importId: string): Promise<ImportBatchDetail | null> {
  const state = await readState();
  return state.imports.find((batch) => batch.id === importId) ?? null;
}

export async function getAssetsBundle(): Promise<AssetsPageBundle> {
  const state = await readState();
  return { assets: state.assets.sort((left, right) => left.symbol.localeCompare(right.symbol)) };
}

export async function getFundsBundle(): Promise<FundsPageBundle> {
  const state = await readState();
  return { funds: state.funds };
}

export async function getSettingsBundle(): Promise<SettingsBundle> {
  const state = await readState();
  return { custodians: state.custodians, users: state.users };
}

export async function createClientRecord(input: CreateClientInput) {
  const timestamp = nowIso();
  if (!useDatabase()) {
    const state = getMemoryState();
    const client: ClientRecord = {
      id: cuid("cli"),
      name: input.name.trim(),
      type: input.type,
      legalName: input.legalName?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      taxId: input.taxId?.trim() || null,
      notes: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.clients.unshift(client);
    return client;
  }

  const organization = await prisma.organization.findFirst();
  if (!organization) throw new Error("No hay organización configurada.");

  return prisma.client.create({
    data: {
      organizationId: organization.id,
      name: input.name.trim(),
      type: input.type,
      legalName: input.legalName?.trim(),
      email: input.email?.trim(),
      phone: input.phone?.trim(),
      taxId: input.taxId?.trim(),
    },
  });
}

export async function createCustodianRecord(input: CreateCustodianInput) {
  if (!useDatabase()) {
    const state = getMemoryState();
    const custodian: CustodianRecord = {
      id: cuid("cus"),
      name: input.name.trim(),
      type: input.type,
      code: input.code?.trim() || null,
      aliases: input.aliases?.map((item) => item.trim()).filter(Boolean) ?? [],
      isActive: true,
    };
    state.custodians.push(custodian);
    return custodian;
  }

  const organization = await prisma.organization.findFirst();
  if (!organization) throw new Error("No hay organización configurada.");

  return prisma.custodian.create({
    data: {
      organizationId: organization.id,
      name: input.name.trim(),
      type: input.type,
      code: input.code?.trim(),
      aliases: input.aliases?.map((item) => item.trim()).filter(Boolean) ?? [],
    },
  });
}

export async function createImportBatchRecord(input: CreateImportBatchInput) {
  const parsed = await parseImportBatchInput(input);

  if (!useDatabase()) {
    const state = getMemoryState();
    const client = state.clients.find((item) => item.id === input.clientId);
    if (!client) throw new Error("Cliente no encontrado.");

    let account = input.accountId
      ? state.accounts.find((item) => item.id === input.accountId)
      : undefined;

    let custodianName = parsed.detectedCustodian ?? "";
    let custodianId = input.custodianId;
    if (!custodianId && custodianName) {
      custodianId = state.custodians.find((item) => item.name === custodianName)?.id;
    }

    if (!account) {
      if (!custodianId && !custodianName) {
        throw new Error("No se pudo detectar el custodio y tampoco se envió uno manual.");
      }
      if (!custodianId) {
        const createdCustodian: CustodianRecord = {
          id: cuid("cus"),
          name: custodianName || input.custodianId || "Custodio detectado",
          type: "OTHER",
          code: null,
          aliases: custodianName ? [custodianName.toLowerCase()] : [],
          isActive: true,
        };
        state.custodians.push(createdCustodian);
        custodianId = createdCustodian.id;
      }
      const custodian = state.custodians.find((item) => item.id === custodianId);
      account = {
        id: cuid("acc"),
        clientId: client.id,
        custodianId,
        name: input.accountName?.trim() || parsed.detectedCustodian || "Cuenta importada",
        number: input.accountNumber?.trim() || null,
        currency: "ARS",
        clientName: client.name,
        custodianName: custodian?.name ?? parsed.detectedCustodian ?? "Sin custodio",
      };
      state.accounts.push(account);
      custodianName = account.custodianName;
    }

    const batchId = cuid("imp");
    const detail: ImportBatchDetail = {
      id: batchId,
      clientId: client.id,
      clientName: client.name,
      accountId: account.id,
      accountName: account.name,
      custodianName: custodianName || account.custodianName,
      status: parsed.status,
      reportKind: parsed.reportKind,
      filename: input.filename,
      fileType: input.fileType,
      detectedCustodian: parsed.detectedCustodian,
      detectionConfidence: parsed.detectionConfidence,
      reportDate: parsed.reportDate,
      warningCount: parsed.warnings.length,
      createdAt: nowIso(),
      rowCount: parsed.rows.length,
      warnings: parsed.warnings,
      rows: parsed.rows.map((row) => ({
        ...row,
        id: cuid("row"),
        accountName: row.accountName || account!.name,
        custodianName: row.custodianName || account!.custodianName,
      })),
    };
    state.imports.unshift(detail);
    return detail;
  }

  const organization = await prisma.organization.findFirst();
  if (!organization) throw new Error("No hay organización configurada.");

  const client = await prisma.client.findFirst({
    where: { id: input.clientId, organizationId: organization.id },
  });
  if (!client) throw new Error("Cliente no encontrado.");

  let accountId = input.accountId ?? null;
  let custodianId = input.custodianId ?? null;

  if (!accountId) {
    let custodian =
      custodianId != null
        ? await prisma.custodian.findUnique({ where: { id: custodianId } })
        : null;
    if (!custodian && parsed.detectedCustodian) {
      custodian = await prisma.custodian.findFirst({
        where: {
          organizationId: organization.id,
          OR: [{ name: parsed.detectedCustodian }, { aliases: { has: parsed.detectedCustodian.toLowerCase() } }],
        },
      });
    }
    if (!custodian) {
      custodian = await prisma.custodian.create({
        data: {
          organizationId: organization.id,
          name: parsed.detectedCustodian ?? input.accountName ?? "Custodio detectado",
          type: "OTHER",
          aliases: parsed.detectedCustodian ? [parsed.detectedCustodian.toLowerCase()] : [],
        },
      });
    }
    custodianId = custodian.id;
    const account = await prisma.account.create({
      data: {
        organizationId: organization.id,
        clientId: client.id,
        custodianId: custodian.id,
        name: input.accountName?.trim() || parsed.detectedCustodian || "Cuenta importada",
        number: input.accountNumber?.trim() || null,
        currency: "ARS",
      },
    });
    accountId = account.id;
  }

  const batch = await prisma.importBatch.create({
    data: {
      organizationId: organization.id,
      clientId: client.id,
      accountId,
      custodianId,
      status: parsed.status,
      reportKind: parsed.reportKind,
      filename: input.filename,
      fileType: input.fileType,
      mimeType: input.mimeType,
      detectedCustodian: parsed.detectedCustodian,
      detectionConfidence: parsed.detectionConfidence,
      reportDate: parsed.reportDate ? new Date(parsed.reportDate) : null,
      warningsJson: parsed.warnings,
      rawText: parsed.rawText,
      sourcePayload: { filename: input.filename, fileType: input.fileType },
      rows: {
        create: parsed.rows.map((row) => ({
          organizationId: organization.id,
          clientId: client.id,
          accountId,
          rowIndex: row.rowIndex,
          state: row.state,
          reportKind: row.reportKind,
          matchStatus: row.matchStatus,
          rawData: { notes: row.notes },
          normalizedData: row,
          errorMessage: row.errorMessage ?? null,
        })),
      },
    },
    include: { client: true, account: true, custodian: true, rows: true },
  });

  return {
    id: batch.id,
    clientId: batch.clientId,
    clientName: batch.client.name,
    accountId: batch.accountId,
    accountName: batch.account?.name ?? null,
    custodianName: batch.custodian?.name ?? null,
    status: batch.status,
    reportKind: batch.reportKind,
    filename: batch.filename,
    fileType: batch.fileType,
    detectedCustodian: batch.detectedCustodian,
    detectionConfidence: batch.detectionConfidence == null ? null : Number(batch.detectionConfidence),
    reportDate: batch.reportDate?.toISOString().slice(0, 10) ?? null,
    warningCount: parsed.warnings.length,
    createdAt: batch.createdAt.toISOString(),
    rowCount: batch.rows.length,
    warnings: parsed.warnings,
    rows: batch.rows.map((row) => mapStoredImportRow(row.id, row.rowIndex, row.state, row.reportKind, row.matchStatus, row.normalizedData as Record<string, unknown>, row.errorMessage)),
  };
}

export async function saveImportRows(input: SaveImportRowsInput) {
  if (!useDatabase()) {
    const state = getMemoryState();
    const batch = state.imports.find((item) => item.id === input.importId);
    if (!batch) throw new Error("Importación no encontrada.");
    batch.rows = batch.rows.map((row) => {
      const incoming = input.rows.find((item) => item.id === row.id);
      return incoming ? { ...row, ...incoming } : row;
    });
    batch.warningCount = batch.rows.filter((row) => row.state !== "READY").length;
    batch.status = batch.warningCount > 0 ? "NEEDS_REVIEW" : "PARSED";
    return batch;
  }

  for (const row of input.rows) {
    await prisma.importRow.update({
      where: { id: row.id },
      data: {
        state: row.state,
        matchStatus: row.matchStatus,
        normalizedData: row,
        errorMessage: row.state === "ERROR" ? "Fila marcada con error por revisión manual." : null,
      },
    });
  }

  const batch = await prisma.importBatch.findUnique({
    where: { id: input.importId },
    include: { rows: true, client: true, account: true, custodian: true },
  });
  if (!batch) throw new Error("Importación no encontrada.");

  const warnings = batch.rows.filter((row) => row.state !== "READY").length;
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status: warnings > 0 ? "NEEDS_REVIEW" : "PARSED" },
  });

  return getImportBatchDetail(batch.id);
}

export async function confirmImportBatch(importId: string) {
  if (!useDatabase()) {
    const state = getMemoryState();
    const batch = state.imports.find((item) => item.id === importId);
    if (!batch) throw new Error("Importación no encontrada.");
    const accountId = batch.accountId;
    if (!accountId) throw new Error("La importación no tiene cuenta asociada.");

    const readyRows = batch.rows.filter((row) => row.state === "READY" && row.matchStatus !== "IGNORED");
    if (!readyRows.length) throw new Error("No hay filas listas para confirmar.");

    const account = state.accounts.find((item) => item.id === accountId);
    if (!account) throw new Error("Cuenta no encontrada.");

    if (batch.reportKind === "HOLDINGS") {
      state.holdings = state.holdings.filter((holding) => holding.accountId !== accountId);
      readyRows.forEach((row) => {
        const asset = resolveOrCreateAsset(state, row.symbol, row.description, row.assetClass, row.currency);
        const fxRate = row.fxRate ?? (row.currency.startsWith("USD") ? 1450 : 1);
        const marketValueArs = row.marketValue ?? ((row.quantity ?? 0) * (row.price ?? 0) * (fxRate || 1));
        state.holdings.push({
          id: cuid("hld"),
          clientId: batch.clientId,
          accountId,
          assetId: asset.id,
          symbol: asset.symbol,
          assetName: row.description || asset.name,
          assetClass: asset.assetClass,
          currency: row.currency,
          quantity: row.quantity ?? 0,
          availableQuantity: row.availableQuantity ?? row.quantity ?? 0,
          pledgedQuantity: row.pledgedQuantity ?? 0,
          averageCost: row.averageCost,
          marketPrice: row.price,
          fxRate,
          marketValueArs,
          marketValueUsd: fxRate ? round(marketValueArs / fxRate) : null,
          pnlAmountArs:
            row.averageCost != null && row.price != null && row.quantity != null
              ? round((row.price - row.averageCost) * row.quantity * (fxRate || 1))
              : null,
          pnlIsEstimated: row.averageCost == null,
          valuationDate: row.reportDate,
          custodianName: batch.custodianName ?? account.custodianName,
          accountName: account.name,
        });
      });
    } else {
      readyRows.forEach((row) => {
        const asset = row.symbol
          ? resolveOrCreateAsset(state, row.symbol, row.description, row.assetClass, row.currency)
          : null;
        state.movements.unshift({
          id: cuid("mov"),
          clientId: batch.clientId,
          accountId,
          assetId: asset?.id ?? null,
          symbol: asset?.symbol ?? row.symbol ?? null,
          assetName: asset?.name ?? row.description ?? null,
          movementType: (row.movementType || "OTHER") as MovementType,
          description: row.description,
          tradeDate: row.tradeDate ?? batch.reportDate ?? nowIso().slice(0, 10),
          settlementDate: row.settlementDate,
          quantity: row.quantity,
          price: row.price,
          grossAmount: row.marketValue,
          netAmount: row.marketValue,
          fees: null,
          taxes: null,
          currency: row.currency,
          fxRate: row.fxRate,
          custodianName: batch.custodianName ?? account.custodianName,
          accountName: account.name,
        });
      });
    }

    batch.status = "CONFIRMED";
    batch.warningCount = 0;
    return batch;
  }

  const batch = await prisma.importBatch.findUnique({
    where: { id: importId },
    include: {
      rows: { orderBy: { rowIndex: "asc" } },
      account: { include: { custodian: true } },
      client: true,
    },
  });

  if (!batch || !batch.account) throw new Error("Importación no encontrada o sin cuenta asociada.");

  const readyRows = batch.rows
    .map((row) =>
      mapStoredImportRow(
        row.id,
        row.rowIndex,
        row.state,
        row.reportKind,
        row.matchStatus,
        row.normalizedData as Record<string, unknown>,
        row.errorMessage,
      ),
    )
    .filter((row) => row.state === "READY" && row.matchStatus !== "IGNORED");

  if (!readyRows.length) throw new Error("No hay filas listas para confirmar.");

  if (batch.reportKind === "HOLDINGS") {
    await prisma.holding.deleteMany({
      where: { organizationId: batch.organizationId, accountId: batch.accountId },
    });
  }

  for (const row of readyRows) {
    const asset = await resolveOrCreateDbAsset(
      batch.organizationId,
      row.symbol,
      row.description,
      row.assetClass,
      row.currency,
      batch.custodianId ?? undefined,
    );

    if (batch.reportKind === "HOLDINGS") {
      const fxRate = row.fxRate ?? (row.currency.startsWith("USD") ? 1450 : 1);
      const marketValueArs =
        row.marketValue ?? ((row.quantity ?? 0) * (row.price ?? 0) * (fxRate || 1));
      await prisma.holding.create({
        data: {
          organizationId: batch.organizationId,
          clientId: batch.clientId,
          accountId: batch.accountId,
          assetId: asset.id,
          sourceImportBatchId: batch.id,
          quantity: row.quantity ?? 0,
          availableQuantity: row.availableQuantity ?? row.quantity ?? 0,
          pledgedQuantity: row.pledgedQuantity ?? 0,
          averageCost: row.averageCost,
          marketPrice: row.price,
          fxRate,
          marketValueArs,
          marketValueUsd: fxRate ? round(marketValueArs / fxRate) : null,
          pnlAmountArs:
            row.averageCost != null && row.price != null && row.quantity != null
              ? round((row.price - row.averageCost) * row.quantity * (fxRate || 1))
              : null,
          pnlIsEstimated: row.averageCost == null,
          valuationDate: row.reportDate ? new Date(row.reportDate) : null,
        },
      });
    } else {
      await prisma.movement.create({
        data: {
          organizationId: batch.organizationId,
          clientId: batch.clientId,
          accountId: batch.accountId,
          assetId: asset.id,
          sourceImportBatchId: batch.id,
          type: (row.movementType || "OTHER") as MovementType,
          description: row.description,
          tradeDate: new Date(row.tradeDate ?? batch.reportDate ?? nowIso()),
          settlementDate: row.settlementDate ? new Date(row.settlementDate) : null,
          quantity: row.quantity,
          price: row.price,
          grossAmount: row.marketValue,
          netAmount: row.marketValue,
          currency: row.currency,
          fxRate: row.fxRate,
        },
      });
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status: "CONFIRMED" },
  });

  return getImportBatchDetail(batch.id);
}

function resolveOrCreateAsset(
  state: MemoryState,
  symbol: string,
  description: string,
  assetClass: AssetClass | "OTHER",
  currency: string,
) {
  const normalizedSymbol = symbol.trim().toUpperCase() || cuid("asset");
  let asset = state.assets.find((item) => item.symbol === normalizedSymbol);
  if (!asset) {
    asset = {
      id: cuid("ast"),
      symbol: normalizedSymbol,
      name: description || normalizedSymbol,
      assetClass: assetClass === "OTHER" ? "OTHER" : assetClass,
      currency,
      isFund: assetClass === "FUND",
      isCashLike: assetClass === "CASH",
    };
    state.assets.push(asset);
  }
  return asset;
}

async function resolveOrCreateDbAsset(
  organizationId: string,
  symbol: string,
  description: string,
  assetClass: AssetClass | "OTHER",
  currency: string,
  custodianId?: string,
) {
  const normalizedSymbol = symbol.trim().toUpperCase() || cuid("AST");
  let asset = await prisma.asset.findFirst({
    where: { organizationId, symbol: normalizedSymbol },
  });

  if (!asset) {
    asset = await prisma.asset.create({
      data: {
        organizationId,
        symbol: normalizedSymbol,
        name: description || normalizedSymbol,
        assetClass: assetClass === "OTHER" ? "OTHER" : assetClass,
        currency,
        isFund: assetClass === "FUND",
        isCashLike: assetClass === "CASH",
      },
    });
  }

  const normalizedAlias = normalizeAlias(description || normalizedSymbol);
  await prisma.assetAlias.upsert({
    where: {
      assetId_normalized_custodianId: {
        assetId: asset.id,
        normalized: normalizedAlias,
        custodianId: custodianId ?? null,
      },
    },
    update: { alias: description || normalizedSymbol },
    create: {
      assetId: asset.id,
      custodianId: custodianId ?? null,
      alias: description || normalizedSymbol,
      normalized: normalizedAlias,
    },
  }).catch(() => undefined);

  return asset;
}

function normalizeAlias(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toSummary(batch: ImportBatchDetail): ImportBatchSummary {
  return {
    id: batch.id,
    clientId: batch.clientId,
    clientName: batch.clientName,
    accountId: batch.accountId,
    accountName: batch.accountName,
    custodianName: batch.custodianName,
    status: batch.status,
    reportKind: batch.reportKind,
    filename: batch.filename,
    fileType: batch.fileType,
    detectedCustodian: batch.detectedCustodian,
    detectionConfidence: batch.detectionConfidence,
    reportDate: batch.reportDate,
    warningCount: batch.warningCount,
    createdAt: batch.createdAt,
    rowCount: batch.rowCount,
  };
}

function mapStoredImportRow(
  id: string,
  rowIndex: number,
  state: string,
  reportKind: string,
  matchStatus: string,
  raw: Record<string, unknown>,
  errorMessage?: string | null,
): ImportRowPreview {
  return {
    id,
    rowIndex,
    state: state as ImportRowPreview["state"],
    reportKind: reportKind as ImportRowPreview["reportKind"],
    matchStatus: matchStatus as MatchStatus,
    symbol: String(raw.symbol ?? ""),
    description: String(raw.description ?? ""),
    assetClass: (raw.assetClass as AssetClass | "OTHER") ?? "OTHER",
    movementType: (raw.movementType as ImportRowPreview["movementType"]) ?? "",
    quantity: numberOrNull(raw.quantity),
    availableQuantity: numberOrNull(raw.availableQuantity),
    pledgedQuantity: numberOrNull(raw.pledgedQuantity),
    price: numberOrNull(raw.price),
    averageCost: numberOrNull(raw.averageCost),
    fxRate: numberOrNull(raw.fxRate),
    marketValue: numberOrNull(raw.marketValue),
    currency: String(raw.currency ?? "ARS"),
    tradeDate: raw.tradeDate ? String(raw.tradeDate) : null,
    settlementDate: raw.settlementDate ? String(raw.settlementDate) : null,
    custodianName: String(raw.custodianName ?? ""),
    accountName: String(raw.accountName ?? ""),
    reportDate: raw.reportDate ? String(raw.reportDate) : null,
    notes: String(raw.notes ?? ""),
    errorMessage: errorMessage ?? null,
  };
}

function numberOrNull(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
