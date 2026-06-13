import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  confirmImportBatch,
  createClientRecord as createClientRecordRepo,
  createCustodianRecord,
  createImportBatchRecord,
  getAssetsBundle,
  getClientDetail,
  getClientsBundle,
  getDashboardSummary,
  getFundsBundle,
  getImportBatchDetail,
  getImportsBundle,
  getPricesBundle,
  getSettingsBundle,
  saveImportRows,
} from "@/lib/server/wealth-repository";

const clientIdSchema = z.object({
  clientId: z.string().min(1),
});

const importIdSchema = z.object({
  importId: z.string().min(1),
});

const refreshPricesSchema = z.object({
  forceRefresh: z.boolean().optional(),
});

const createClientSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["INSTITUTIONAL", "PRIVATE", "FAMILY_OFFICE", "CORPORATE", "OTHER"]),
  legalName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  taxId: z.string().optional(),
});

const createCustodianSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["ALYC", "BANK", "BROKER", "OTHER"]),
  code: z.string().optional(),
  aliases: z.array(z.string()).optional(),
});

const createImportSchema = z.object({
  clientId: z.string().min(1),
  accountId: z.string().optional(),
  custodianId: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  filename: z.string().min(1),
  fileType: z.string().min(1),
  mimeType: z.string().optional(),
  contentBase64: z.string().min(1),
});

const saveImportRowsSchema = z.object({
  importId: z.string().min(1),
  rows: z.array(
    z.object({
      id: z.string().min(1),
      state: z.enum(["READY", "NEEDS_REVIEW", "IGNORED", "ERROR"]),
      matchStatus: z.enum(["MATCHED", "AMBIGUOUS", "NEW_ASSET", "IGNORED"]),
      symbol: z.string(),
      description: z.string(),
      assetClass: z.enum([
        "CASH",
        "SOVEREIGN_BOND",
        "CORPORATE_BOND",
        "LETTER",
        "FUND",
        "CEDEAR",
        "EQUITY",
        "ETF",
        "OPTION",
        "FUTURE",
        "FIXED_TERM",
        "CAUCION",
        "OTHER",
      ]),
      movementType: z.enum([
        "BUY",
        "SELL",
        "FUND_SUBSCRIPTION",
        "FUND_REDEMPTION",
        "DIVIDEND",
        "COUPON",
        "AMORTIZATION",
        "DEPOSIT",
        "WITHDRAWAL",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "FEE",
        "TAX",
        "CASH_BLOCK",
        "CASH_RELEASE",
        "OTHER",
        "",
      ]),
      quantity: z.number().nullable(),
      availableQuantity: z.number().nullable(),
      pledgedQuantity: z.number().nullable(),
      price: z.number().nullable(),
      averageCost: z.number().nullable(),
      fxRate: z.number().nullable(),
      marketValue: z.number().nullable(),
      currency: z.string(),
      tradeDate: z.string().nullable(),
      settlementDate: z.string().nullable(),
      notes: z.string(),
    }),
  ),
});

export const loadDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const [summary, clients, imports, settings] = await Promise.all([
    getDashboardSummary(),
    getClientsBundle(),
    getImportsBundle(),
    getSettingsBundle(),
  ]);

  return {
    summary,
    clients,
    recentImports: imports.batches.slice(0, 8),
    custodians: settings.custodians,
  };
});

export const loadClientsData = createServerFn({ method: "GET" }).handler(async () => {
  return {
    clients: await getClientsBundle(),
  };
});

export const loadClientDetail = createServerFn({ method: "GET" })
  .inputValidator(clientIdSchema)
  .handler(async ({ data }) => {
    const bundle = await getClientDetail(data.clientId);
    if (!bundle) throw notFound();
    return bundle;
  });

export const loadImportsData = createServerFn({ method: "GET" }).handler(async () => {
  return getImportsBundle();
});

export const loadImportDetail = createServerFn({ method: "GET" })
  .inputValidator(importIdSchema)
  .handler(async ({ data }) => {
    const batch = await getImportBatchDetail(data.importId);
    if (!batch) throw notFound();
    return batch;
  });

export const loadMovementsData = createServerFn({ method: "GET" }).handler(async () => {
  const clients = await getClientsBundle();
  const details = await Promise.all(clients.map((client) => getClientDetail(client.client.id)));
  return {
    movements: details
      .flatMap((detail) => detail?.movements ?? [])
      .sort((left, right) => right.tradeDate.localeCompare(left.tradeDate)),
  };
});

export const loadAssetsData = createServerFn({ method: "GET" }).handler(async () => {
  return getAssetsBundle();
});

export const loadFundsData = createServerFn({ method: "GET" }).handler(async () => {
  return getFundsBundle();
});

export const loadPricesData = createServerFn({ method: "GET" }).handler(async () => {
  return getPricesBundle();
});

export const loadSettingsData = createServerFn({ method: "GET" }).handler(async () => {
  return getSettingsBundle();
});

export const createClientAction = createServerFn({ method: "POST" })
  .inputValidator(createClientSchema)
  .handler(async ({ data }) => {
    return createClientRecordRepo({
      ...data,
      legalName: data.legalName || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      taxId: data.taxId || undefined,
    });
  });

export const createClientRecord = createClientAction;

export const createCustodianAction = createServerFn({ method: "POST" })
  .inputValidator(createCustodianSchema)
  .handler(async ({ data }) => {
    return createCustodianRecord({
      name: data.name,
      type: data.type,
      code: data.code || undefined,
      aliases: data.aliases ?? [],
    });
  });

export const createImportBatchAction = createServerFn({ method: "POST" })
  .inputValidator(createImportSchema)
  .handler(async ({ data }) => {
    return createImportBatchRecord(data);
  });

export const saveImportRowsAction = createServerFn({ method: "POST" })
  .inputValidator(saveImportRowsSchema)
  .handler(async ({ data }) => {
    return saveImportRows(data);
  });

export const confirmImportBatchAction = createServerFn({ method: "POST" })
  .inputValidator(importIdSchema)
  .handler(async ({ data }) => {
    return confirmImportBatch(data.importId);
  });

export const refreshPricesAction = createServerFn({ method: "POST" })
  .inputValidator(refreshPricesSchema)
  .handler(async ({ data }) => {
    return getPricesBundle({ forceRefresh: data.forceRefresh ?? true });
  });

// Compatibility exports kept while the old commission/model-portfolio components are phased out.
const legacyTransactionSchema = z.object({
  clientId: z.string().min(1),
  date: z.string().min(1),
  type: z.string().min(1),
  asset: z.string().min(1),
  assetType: z.string().optional(),
  quantity: z.number(),
  price: z.number(),
  commission: z.number().optional(),
  status: z.string().optional(),
  currentPrice: z.number().optional(),
  isPeso: z.boolean().optional(),
  mepFxRate: z.number().optional(),
  performance: z
    .object({
      d1: z.number().optional(),
      d30: z.number().optional(),
      y1: z.number().optional(),
    })
    .optional(),
});

const legacyModelHoldingSchema = z.object({
  asset: z.string().min(1),
  assetType: z.string(),
  weightPct: z.number(),
  currentPrice: z.number().optional(),
  isPeso: z.boolean().optional(),
  performance: z
    .object({
      d1: z.number().optional(),
      d30: z.number().optional(),
      y1: z.number().optional(),
    })
    .optional(),
});

export const createClientTransaction = createServerFn({ method: "POST" })
  .inputValidator(legacyTransactionSchema)
  .handler(async () => {
    throw new Error("El flujo legacy de transacciones fue reemplazado por imports multi-custodio.");
  });

export const updateClientTransaction = createServerFn({ method: "POST" })
  .inputValidator(legacyTransactionSchema.extend({ id: z.string().min(1) }))
  .handler(async () => {
    throw new Error("La edición legacy de transacciones fue reemplazada por la revisión de imports.");
  });

export const saveModelHolding = createServerFn({ method: "POST" })
  .inputValidator(legacyModelHoldingSchema)
  .handler(async () => {
    throw new Error("La cartera modelo ya no forma parte del flujo principal del producto.");
  });
