-- Multi-custody MVP baseline migration
-- This migration creates the new SaaS domain for organizations, clients, accounts,
-- imports, holdings, movements, assets, funds, FX, and bond-ready tables.

create type "UserRole" as enum ('SUPER_ADMIN', 'ORG_ADMIN', 'INTERNAL_EDITOR', 'CLIENT_VIEWER');
create type "ClientType" as enum ('INSTITUTIONAL', 'PRIVATE', 'FAMILY_OFFICE', 'CORPORATE', 'OTHER');
create type "CustodianType" as enum ('ALYC', 'BANK', 'BROKER', 'OTHER');
create type "AccountKind" as enum ('INVESTMENT', 'CASH', 'OMNIBUS', 'OTHER');
create type "AssetClass" as enum (
  'CASH',
  'SOVEREIGN_BOND',
  'CORPORATE_BOND',
  'LETTER',
  'FUND',
  'CEDEAR',
  'EQUITY',
  'ETF',
  'OPTION',
  'FUTURE',
  'FIXED_TERM',
  'CAUCION',
  'OTHER'
);
create type "ImportStatus" as enum ('UPLOADED', 'PARSED', 'NEEDS_REVIEW', 'CONFIRMED', 'FAILED');
create type "ReportKind" as enum ('HOLDINGS', 'MOVEMENTS');
create type "ImportRowState" as enum ('READY', 'NEEDS_REVIEW', 'IGNORED', 'ERROR');
create type "MatchStatus" as enum ('MATCHED', 'AMBIGUOUS', 'NEW_ASSET', 'IGNORED');
create type "MovementType" as enum (
  'BUY',
  'SELL',
  'FUND_SUBSCRIPTION',
  'FUND_REDEMPTION',
  'DIVIDEND',
  'COUPON',
  'AMORTIZATION',
  'DEPOSIT',
  'WITHDRAWAL',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'FEE',
  'TAX',
  'CASH_BLOCK',
  'CASH_RELEASE',
  'OTHER'
);
create type "PriceSource" as enum ('MARKET', 'FUND', 'IMPORT', 'FX', 'MANUAL');

create table "Organization" (
  "id" text primary key,
  "name" text not null,
  "slug" text not null unique,
  "baseCurrency" text not null default 'ARS',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table "User" (
  "id" text primary key,
  "organizationId" text not null references "Organization"("id") on delete cascade,
  "email" text not null unique,
  "name" text not null,
  "role" "UserRole" not null default 'INTERNAL_EDITOR',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table "Client" (
  "id" text primary key,
  "organizationId" text not null references "Organization"("id") on delete cascade,
  "type" "ClientType" not null default 'INSTITUTIONAL',
  "name" text not null,
  "legalName" text,
  "email" text,
  "phone" text,
  "taxId" text,
  "notes" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table "ClientUser" (
  "id" text primary key,
  "clientId" text not null references "Client"("id") on delete cascade,
  "userId" text not null references "User"("id") on delete cascade,
  "canEdit" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  unique ("clientId", "userId")
);

create table "Custodian" (
  "id" text primary key,
  "organizationId" text not null references "Organization"("id") on delete cascade,
  "name" text not null,
  "code" text,
  "type" "CustodianType" not null default 'ALYC',
  "country" text not null default 'AR',
  "isActive" boolean not null default true,
  "aliases" text[] not null default '{}',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("organizationId", "name")
);

create table "Account" (
  "id" text primary key,
  "organizationId" text not null references "Organization"("id") on delete cascade,
  "clientId" text not null references "Client"("id") on delete cascade,
  "custodianId" text not null references "Custodian"("id") on delete restrict,
  "kind" "AccountKind" not null default 'INVESTMENT',
  "name" text not null,
  "number" text,
  "currency" text not null default 'ARS',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("organizationId", "clientId", "custodianId", "name")
);

create table "Asset" (
  "id" text primary key,
  "organizationId" text not null references "Organization"("id") on delete cascade,
  "symbol" text not null,
  "name" text not null,
  "assetClass" "AssetClass" not null,
  "currency" text not null default 'ARS',
  "isin" text,
  "ticker" text,
  "isFund" boolean not null default false,
  "isCashLike" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("organizationId", "symbol")
);

create table "AssetAlias" (
  "id" text primary key,
  "assetId" text not null references "Asset"("id") on delete cascade,
  "custodianId" text references "Custodian"("id") on delete set null,
  "alias" text not null,
  "normalized" text not null,
  "confidence" numeric(5,4),
  "createdAt" timestamptz not null default now(),
  unique ("assetId", "normalized", "custodianId")
);

create table "ImportBatch" (
  "id" text primary key,
  "organizationId" text not null references "Organization"("id") on delete cascade,
  "clientId" text not null references "Client"("id") on delete cascade,
  "accountId" text references "Account"("id") on delete set null,
  "custodianId" text references "Custodian"("id") on delete set null,
  "createdById" text references "User"("id") on delete set null,
  "status" "ImportStatus" not null default 'UPLOADED',
  "reportKind" "ReportKind" not null,
  "filename" text not null,
  "fileType" text not null,
  "mimeType" text,
  "detectedCustodian" text,
  "detectionConfidence" numeric(5,4),
  "reportDate" timestamptz,
  "warningsJson" jsonb,
  "sourcePayload" jsonb,
  "rawText" text,
  "legacyPortfolioId" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table "ImportRow" (
  "id" text primary key,
  "batchId" text not null references "ImportBatch"("id") on delete cascade,
  "organizationId" text not null references "Organization"("id") on delete cascade,
  "clientId" text not null references "Client"("id") on delete cascade,
  "accountId" text references "Account"("id") on delete set null,
  "rowIndex" integer not null,
  "state" "ImportRowState" not null default 'READY',
  "reportKind" "ReportKind" not null,
  "matchStatus" "MatchStatus" not null default 'MATCHED',
  "rawData" jsonb not null,
  "normalizedData" jsonb not null,
  "errorMessage" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("batchId", "rowIndex")
);

create table "Holding" (
  "id" text primary key,
  "organizationId" text not null references "Organization"("id") on delete cascade,
  "clientId" text not null references "Client"("id") on delete cascade,
  "accountId" text not null references "Account"("id") on delete cascade,
  "assetId" text not null references "Asset"("id") on delete restrict,
  "sourceImportBatchId" text references "ImportBatch"("id") on delete set null,
  "quantity" numeric(28,10) not null,
  "availableQuantity" numeric(28,10) not null default 0,
  "pledgedQuantity" numeric(28,10) not null default 0,
  "averageCost" numeric(28,10),
  "marketPrice" numeric(28,10),
  "fxRate" numeric(18,8),
  "marketValueArs" numeric(28,10),
  "marketValueUsd" numeric(28,10),
  "pnlAmountArs" numeric(28,10),
  "pnlIsEstimated" boolean not null default false,
  "valuationDate" timestamptz,
  "legacyPortfolioId" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("organizationId", "accountId", "assetId")
);

create table "Movement" (
  "id" text primary key,
  "organizationId" text not null references "Organization"("id") on delete cascade,
  "clientId" text not null references "Client"("id") on delete cascade,
  "accountId" text not null references "Account"("id") on delete cascade,
  "assetId" text references "Asset"("id") on delete set null,
  "sourceImportBatchId" text references "ImportBatch"("id") on delete set null,
  "type" "MovementType" not null,
  "tradeDate" timestamptz not null,
  "settlementDate" timestamptz,
  "description" text,
  "externalRef" text,
  "quantity" numeric(28,10),
  "price" numeric(28,10),
  "grossAmount" numeric(28,10),
  "netAmount" numeric(28,10),
  "fees" numeric(28,10),
  "taxes" numeric(28,10),
  "currency" text not null default 'ARS',
  "fxRate" numeric(18,8),
  "legacyPortfolioId" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("accountId", "externalRef")
);

create table "Price" (
  "id" text primary key,
  "organizationId" text not null references "Organization"("id") on delete cascade,
  "assetId" text not null references "Asset"("id") on delete cascade,
  "source" "PriceSource" not null,
  "date" timestamptz not null,
  "price" numeric(28,10) not null,
  "currency" text not null default 'ARS',
  "createdAt" timestamptz not null default now(),
  unique ("assetId", "source", "date")
);

create table "FxRate" (
  "id" text primary key,
  "organizationId" text not null references "Organization"("id") on delete cascade,
  "code" text not null,
  "date" timestamptz not null,
  "rate" numeric(18,8) not null,
  "source" "PriceSource" not null default 'FX',
  "createdAt" timestamptz not null default now(),
  unique ("organizationId", "code", "date", "source")
);

create table "FundMaster" (
  "id" text primary key,
  "organizationId" text not null references "Organization"("id") on delete cascade,
  "assetId" text unique references "Asset"("id") on delete set null,
  "code" text not null,
  "name" text not null,
  "manager" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("organizationId", "code")
);

create table "FundAlias" (
  "id" text primary key,
  "fundMasterId" text not null references "FundMaster"("id") on delete cascade,
  "custodianId" text references "Custodian"("id") on delete set null,
  "alias" text not null,
  "normalized" text not null,
  "createdAt" timestamptz not null default now(),
  unique ("fundMasterId", "normalized", "custodianId")
);

create table "FundPrice" (
  "id" text primary key,
  "fundMasterId" text not null references "FundMaster"("id") on delete cascade,
  "date" timestamptz not null,
  "vcp" numeric(28,10) not null,
  "currency" text not null default 'ARS',
  "source" "PriceSource" not null default 'FUND',
  "createdAt" timestamptz not null default now(),
  unique ("fundMasterId", "date", "source")
);

create table "BondMaster" (
  "id" text primary key,
  "assetId" text not null unique references "Asset"("id") on delete cascade,
  "issuer" text,
  "maturityDate" timestamptz,
  "couponRate" numeric(10,6),
  "paymentCurrency" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table "BondCashflow" (
  "id" text primary key,
  "bondMasterId" text not null references "BondMaster"("id") on delete cascade,
  "paymentDate" timestamptz not null,
  "kind" text not null,
  "amount" numeric(28,10) not null,
  "currency" text not null,
  "createdAt" timestamptz not null default now()
);

create table "BondAnalytics" (
  "id" text primary key,
  "bondMasterId" text not null references "BondMaster"("id") on delete cascade,
  "asOfDate" timestamptz not null,
  "yieldToMaturity" numeric(18,8),
  "duration" numeric(18,8),
  "modifiedDuration" numeric(18,8),
  "price" numeric(28,10),
  "source" "PriceSource" not null default 'MANUAL',
  "createdAt" timestamptz not null default now(),
  unique ("bondMasterId", "asOfDate", "source")
);

create index "User_organizationId_idx" on "User" ("organizationId");
create index "Client_organizationId_idx" on "Client" ("organizationId");
create index "Custodian_organizationId_idx" on "Custodian" ("organizationId");
create index "Account_organizationId_idx" on "Account" ("organizationId");
create index "Account_clientId_idx" on "Account" ("clientId");
create index "Asset_organizationId_assetClass_idx" on "Asset" ("organizationId", "assetClass");
create index "ImportBatch_org_client_status_idx" on "ImportBatch" ("organizationId", "clientId", "status");
create index "ImportRow_org_client_idx" on "ImportRow" ("organizationId", "clientId");
create index "Holding_org_client_idx" on "Holding" ("organizationId", "clientId");
create index "Movement_org_client_tradeDate_idx" on "Movement" ("organizationId", "clientId", "tradeDate");
