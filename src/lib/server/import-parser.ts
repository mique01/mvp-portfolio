import pdfParse from "pdf-parse";
import * as XLSX from "xlsx";
import type {
  AssetClass,
  CreateImportBatchInput,
  ImportRowPreview,
  MatchStatus,
  MovementType,
  ReportKind,
} from "@/lib/wealth-types";

type ParsedRow = Omit<ImportRowPreview, "id">;

type ParsedImportResult = {
  reportKind: ReportKind;
  detectedCustodian: string | null;
  detectionConfidence: number;
  reportDate: string | null;
  status: "PARSED" | "NEEDS_REVIEW" | "FAILED";
  warnings: string[];
  rows: ParsedRow[];
  rawText: string | null;
};

type TabularRow = Record<string, string>;

export async function parseImportBatchInput(
  input: CreateImportBatchInput,
): Promise<ParsedImportResult> {
  const buffer = Buffer.from(input.contentBase64, "base64");
  const extension = input.filename.split(".").pop()?.toLowerCase() ?? "";
  const fileType = input.fileType.toUpperCase();

  if (fileType === "CSV" || extension === "csv") {
    const text = buffer.toString("utf-8");
    return parseCsvImport(text);
  }

  if (fileType === "XLSX" || fileType === "XLS" || extension === "xlsx" || extension === "xls") {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });
    return parseTabularImport(rows.map(stringifyRow), null);
  }

  if (fileType === "PDF" || extension === "pdf") {
    const pdf = await pdfParse(buffer);
    return parsePdfImport(pdf.text ?? "");
  }

  return {
    reportKind: "HOLDINGS",
    detectedCustodian: null,
    detectionConfidence: 0,
    reportDate: null,
    status: "FAILED",
    warnings: ["Tipo de archivo no soportado para importación."],
    rows: [],
    rawText: null,
  };
}

export function parseCsvTextImport(text: string) {
  return parseCsvImport(text);
}

export function parseExtractedPdfText(text: string) {
  return parsePdfImport(text);
}

function parseCsvImport(text: string): ParsedImportResult {
  const rows = parseDelimitedText(text);
  return parseTabularImport(rows, text);
}

function parseTabularImport(rows: TabularRow[], rawText: string | null): ParsedImportResult {
  const headers = rows[0] ? Object.keys(rows[0]).map(normalizeKey) : [];

  if (includesAll(headers, ["nroticket", "nrocomprobante", "fechaejecucion", "tipooperacion"])) {
    return buildResult({
      detectedCustodian: "Cocos",
      detectionConfidence: 0.97,
      reportKind: "MOVEMENTS",
      reportDate: parseReportDateFromRows(rows, ["fechaejecucion"]),
      rows: rows.map(parseCocosMovementRow).filter(Boolean) as ParsedRow[],
      warnings: [],
      rawText,
    });
  }

  if (includesAll(headers, ["instrumento", "cantidad", "precio", "moneda", "total"])) {
    return buildResult({
      detectedCustodian: "Cocos",
      detectionConfidence: 0.95,
      reportKind: "HOLDINGS",
      reportDate: null,
      rows: rows.map(parseCocosHoldingRow).filter(Boolean) as ParsedRow[],
      warnings: [],
      rawText,
    });
  }

  return buildResult({
    detectedCustodian: null,
    detectionConfidence: 0.2,
    reportKind: "HOLDINGS",
    reportDate: null,
    rows: rows.map((row, index) => genericPreviewRow(index, row)),
    warnings: ["No se reconoció un formato conocido. Se cargó una vista previa genérica."],
    rawText,
  });
}

function parsePdfImport(text: string): ParsedImportResult {
  const normalized = normalizeText(text);

  if (
    normalized.includes("valuacion de cartera") &&
    normalized.includes("instrumento abrev") &&
    normalized.includes("moneda de valuacion")
  ) {
    const rows = parseAllariaValuationText(text);
    return buildResult({
      detectedCustodian: "Allaria",
      detectionConfidence: rows.length > 0 ? 0.9 : 0.65,
      reportKind: "HOLDINGS",
      reportDate: parseReportDateFromText(text),
      rows,
      warnings:
        rows.length > 0
          ? ["Revisar alias de fondos y bonos antes de confirmar la importación."]
          : ["No se pudieron extraer filas suficientes del PDF de Allaria."],
      rawText: text,
    });
  }

  if (
    normalized.includes("reporte de cuenta corriente consolidada") &&
    normalized.includes("concertacion") &&
    normalized.includes("liquidacion")
  ) {
    const rows = parseAllariaMovementsText(text);
    return buildResult({
      detectedCustodian: "Allaria",
      detectionConfidence: rows.length > 0 ? 0.82 : 0.6,
      reportKind: "MOVEMENTS",
      reportDate: parseReportDateFromText(text),
      rows,
      warnings: [
        "Los movimientos de Allaria en PDF pueden requerir revisión manual por cortes de línea.",
      ],
      rawText: text,
    });
  }

  if (
    normalized.includes("resumen de cuenta") &&
    normalized.includes("posicion al cierre") &&
    normalized.includes("nro de comitente")
  ) {
    const rows = parseCocosPortfolioPdf(text);
    return buildResult({
      detectedCustodian: "Cocos",
      detectionConfidence: rows.length > 0 ? 0.92 : 0.7,
      reportKind: "HOLDINGS",
      reportDate: parseReportDateFromText(text),
      rows,
      warnings:
        rows.length > 0
          ? []
          : ["No se detectaron filas suficientes en el PDF de resumen de Cocos."],
      rawText: text,
    });
  }

  return buildResult({
    detectedCustodian: null,
    detectionConfidence: 0.2,
    reportKind: "HOLDINGS",
    reportDate: parseReportDateFromText(text),
    rows: [],
    warnings: ["PDF detectado pero sin formato reconocido. Queda para revisión asistida."],
    rawText: text,
  });
}

function buildResult(input: {
  detectedCustodian: string | null;
  detectionConfidence: number;
  reportKind: ReportKind;
  reportDate: string | null;
  rows: ParsedRow[];
  warnings: string[];
  rawText: string | null;
}): ParsedImportResult {
  const hasReviewRows = input.rows.some(
    (row) => row.state === "NEEDS_REVIEW" || row.matchStatus !== "MATCHED",
  );

  return {
    detectedCustodian: input.detectedCustodian,
    detectionConfidence: input.detectionConfidence,
    reportKind: input.reportKind,
    reportDate: input.reportDate,
    status: hasReviewRows || input.warnings.length > 0 ? "NEEDS_REVIEW" : "PARSED",
    warnings: input.warnings,
    rows: input.rows,
    rawText: input.rawText,
  };
}

function parseDelimitedText(text: string): TabularRow[] {
  const lines = text
    .replace(/\uFEFF/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = splitDelimitedLine(lines[0], delimiter);

  return lines.slice(1).map((line) => {
    const values = splitDelimitedLine(line, delimiter);
    const row: TabularRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function splitDelimitedLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current);
  return values.map((value) => value.trim());
}

function stringifyRow(row: Record<string, unknown>): TabularRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value == null ? "" : String(value)]),
  );
}

function parseCocosMovementRow(row: TabularRow, index: number): ParsedRow | null {
  const symbol = extractTicker(String(row.instrumento ?? ""));
  const description = String(row.instrumento ?? "").trim();
  const movementType = inferCocosMovementType(String(row.tipoOperacion ?? ""));
  const quantity = parseLocaleNumber(row.cantidad);
  const price = parseLocaleNumber(row.precio);
  const grossAmount = parseLocaleNumber(row.montoBruto);
  const fees = parseLocaleNumber(row.comision) + parseLocaleNumber(row.ddmm);
  const taxes = parseLocaleNumber(row.iva) + parseLocaleNumber(row.otros);
  const netAmount = parseLocaleNumber(row.total);
  const assetClass = inferAssetClass(description, symbol, String(row.moneda ?? "ARS"));

  if (!description && !grossAmount && !netAmount) return null;

  return {
    rowIndex: index,
    state: "READY",
    reportKind: "MOVEMENTS",
    matchStatus: description ? "MATCHED" : "IGNORED",
    symbol,
    description,
    assetClass,
    movementType,
    quantity,
    availableQuantity: null,
    pledgedQuantity: null,
    price,
    averageCost: null,
    fxRate: null,
    marketValue: Math.abs(netAmount || grossAmount) || null,
    currency: normalizeCurrency(String(row.moneda ?? "ARS")),
    tradeDate: toIsoDate(row.fechaEjecucion),
    settlementDate: toIsoDate(row.fechaLiquidacion),
    custodianName: "Cocos",
    accountName: "",
    reportDate: toIsoDate(row.fechaLiquidacion ?? row.fechaEjecucion),
    notes: [String(row.tipoOperacion ?? ""), String(row.nroTicket ?? ""), String(row.mercado ?? "")]
      .filter(Boolean)
      .join(" | "),
    errorMessage: null,
  };
}

function parseCocosHoldingRow(row: TabularRow, index: number): ParsedRow | null {
  const description = String(row.instrumento ?? "").trim();
  const symbol = extractTicker(description);
  const quantity = parseLocaleNumber(row.cantidad);
  const price = parseLocaleNumber(row.precio);
  const marketValue = parseLocaleNumber(row.total);

  if (!description && !quantity && !marketValue) return null;

  return {
    rowIndex: index,
    state: "READY",
    reportKind: "HOLDINGS",
    matchStatus: description ? "MATCHED" : "IGNORED",
    symbol,
    description,
    assetClass: inferAssetClass(description, symbol, String(row.moneda ?? "ARS")),
    movementType: "",
    quantity,
    availableQuantity: quantity,
    pledgedQuantity: 0,
    price,
    averageCost: price,
    fxRate: normalizeCurrency(String(row.moneda ?? "ARS")).includes("USD") ? 1 : null,
    marketValue,
    currency: normalizeCurrency(String(row.moneda ?? "ARS")),
    tradeDate: null,
    settlementDate: null,
    custodianName: "Cocos",
    accountName: "",
    reportDate: null,
    notes: "",
    errorMessage: null,
  };
}

function parseCocosPortfolioPdf(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\*+/g, "").trim())
    .filter(Boolean);
  const rows: ParsedRow[] = [];

  for (const line of lines) {
    if (
      !line.includes("ARS") &&
      !line.includes("USD") &&
      !line.includes("USD MEP") &&
      !line.includes("USD CABLE")
    ) {
      continue;
    }
    if (
      line.startsWith("POSICION") ||
      line.startsWith("Total Posición") ||
      line.startsWith("INSTRUMENTO")
    ) {
      continue;
    }
    const match = line.match(
      /^(?<description>.+?)\s+(?<quantity>-?[\d.,]+)\s+(?<currency>ARS|USD(?:\s+CABLE|\s+MEP)?)\s+(?<price>-?[\d.,]+)\s+(?<total>-?[\d.,]+)\s+(?<totalArs>-?[\d.,]+)$/i,
    );
    if (!match?.groups) continue;
    const description = match.groups.description.trim();
    const symbol = extractTicker(description);
    rows.push({
      rowIndex: rows.length,
      state: "READY",
      reportKind: "HOLDINGS",
      matchStatus: "MATCHED",
      symbol,
      description,
      assetClass: inferAssetClass(description, symbol, match.groups.currency),
      movementType: "",
      quantity: parseLocaleNumber(match.groups.quantity),
      availableQuantity: parseLocaleNumber(match.groups.quantity),
      pledgedQuantity: 0,
      price: parseLocaleNumber(match.groups.price),
      averageCost: parseLocaleNumber(match.groups.price),
      fxRate: match.groups.currency.includes("USD") ? parseImplicitFx(text) : null,
      marketValue: parseLocaleNumber(match.groups.totalArs || match.groups.total),
      currency: normalizeCurrency(match.groups.currency),
      tradeDate: null,
      settlementDate: null,
      custodianName: "Cocos",
      accountName: "",
      reportDate: parseReportDateFromText(text),
      notes: "",
      errorMessage: null,
    });
  }

  return rows;
}

function parseAllariaValuationText(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\u00a0/g, " ").trim())
    .filter(Boolean);
  const rows: ParsedRow[] = [];
  const stopWords = new Set([
    "Cedears",
    "Fondos",
    "Monedas",
    "Corporativos",
    "Títulos públicos y",
    "Títulos públicos y Letras",
    "Renta Fija Argentina (Privada)",
    "Renta Fija Argentina (Pública)",
    "Acciones /",
    "Pesos",
    "Dólar",
    "L.Arg / Dólar",
    "FCI Abiertos",
    "Arg",
    "Total Cartera",
  ]);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || stopWords.has(line) || /^Total /.test(line) || /^La Valuaci/.test(line)) {
      continue;
    }
    if (!looksLikeAllariaSymbolLine(line, lines[index + 1])) {
      continue;
    }

    const block: string[] = [line];
    let cursor = index + 1;
    while (cursor < lines.length && block.length < 8) {
      const candidate = lines[cursor];
      if (
        candidate.startsWith("Total ") ||
        candidate === "Instrumento Abrev. Instrumento Desc. Rendimiento Cantidad Disp. Cantidad gtia. Precio PPC TC Monto en moneda" ||
        candidate.startsWith("Valuación Partici")
      ) {
        break;
      }
      if (looksLikeAllariaSymbolLine(candidate, lines[cursor + 1]) && block.length > 1) {
        break;
      }
      block.push(candidate);
      cursor += 1;
    }

    const parsed = parseAllariaHoldingBlock(block, rows.length, text);
    if (parsed) {
      rows.push(parsed);
      index = cursor - 1;
    }
  }

  return rows;
}

function parseAllariaHoldingBlock(
  block: string[],
  rowIndex: number,
  rawText: string,
): ParsedRow | null {
  const cleaned = block.filter((line) => !/^[$+-]/.test(line) || line.includes(" "));
  const upperPrefix: string[] = [];
  let descriptionLineIndex = 0;

  while (
    descriptionLineIndex < cleaned.length &&
    /^[A-Z0-9/\-. ]{2,20}$/.test(cleaned[descriptionLineIndex]) &&
    !cleaned[descriptionLineIndex].includes("%") &&
    !/\d{2}\/\d{2}\/\d{4}/.test(cleaned[descriptionLineIndex])
  ) {
    upperPrefix.push(cleaned[descriptionLineIndex]);
    descriptionLineIndex += 1;
    if (upperPrefix.join(" ").length > 18) break;
  }

  const headerLine = cleaned[0] ?? "";
  let symbol = extractTicker(upperPrefix.length ? upperPrefix.join(" ") : headerLine);
  let description = upperPrefix.length ? cleaned.slice(descriptionLineIndex).join(" ") : headerLine;

  if (!upperPrefix.length) {
    const [firstToken, ...rest] = headerLine.split(/\s+/);
    symbol = normalizeSymbol(firstToken);
    description = rest.join(" ");
  }

  const dateLine = cleaned.find((line) => /\d{2}\/\d{2}\/\d{4}/.test(line)) ?? null;
  const quantityLine =
    cleaned.find((line) => /\s-\s(?:US\$|\$|M)/.test(line)) ??
    cleaned.find((line) => /^\d[\d.,]*\s+-\s/.test(line)) ??
    "";
  const quantityMatch = quantityLine.match(
    /(?<qty>-?[\d.,]+)\s+-\s+(?<costCurrency>US\$|\$|M)\s*(?<ppc>[\d.,]+)/,
  );
  const dataLine =
    [...cleaned]
      .reverse()
      .find((line) => /\d/.test(line) && line.includes("%") && !line.includes("Valuación")) ?? "";
  const numberTokens = dataLine.match(/-?[\d.,]+/g) ?? [];

  if (!description || !quantityMatch?.groups) return null;

  const marketPrice = numberTokens.length >= 1 ? parseLocaleNumber(numberTokens[0]) : null;
  const fxRate = numberTokens.length >= 2 ? parseLocaleNumber(numberTokens[1]) : null;
  const valuation = numberTokens.length >= 4 ? parseLocaleNumber(numberTokens[3]) : null;

  return {
    rowIndex,
    state: description.includes("Allaria") || symbol.length <= 12 ? "READY" : "NEEDS_REVIEW",
    reportKind: "HOLDINGS",
    matchStatus: inferMatchStatus(symbol),
    symbol,
    description: description.replace(/\s+/g, " ").trim(),
    assetClass: inferAssetClass(description, symbol, dataLine.includes("US$") ? "USD" : "ARS"),
    movementType: "",
    quantity: parseLocaleNumber(quantityMatch.groups.qty),
    availableQuantity: parseLocaleNumber(quantityMatch.groups.qty),
    pledgedQuantity: 0,
    price: marketPrice,
    averageCost: parseLocaleNumber(quantityMatch.groups.ppc),
    fxRate,
    marketValue: valuation,
    currency: inferCurrencyFromAllariaBlock(block),
    tradeDate: null,
    settlementDate: null,
    custodianName: "Allaria",
    accountName: "",
    reportDate: parseReportDateFromText(rawText) ?? (dateLine ? toIsoDate(dateLine) : null),
    notes: block.join(" | "),
    errorMessage: null,
  };
}

function parseAllariaMovementsText(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\u00a0/g, " ").trim())
    .filter(Boolean);
  const rows: ParsedRow[] = [];

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!isDateString(lines[index]) || !isDateString(lines[index + 1])) continue;

    const tradeDate = toIsoDate(lines[index]);
    const settlementDate = toIsoDate(lines[index + 1]);
    const chunk: string[] = [lines[index], lines[index + 1]];
    let cursor = index + 2;
    while (cursor < lines.length && !(isDateString(lines[cursor]) && isDateString(lines[cursor + 1] ?? ""))) {
      chunk.push(lines[cursor]);
      cursor += 1;
      if (chunk.length > 12) break;
    }

    const descriptionParts = chunk.slice(2).filter((line) => !looksNumericLine(line));
    const description = descriptionParts.join(" ").replace(/\s+/g, " ").trim();
    if (!description) continue;

    const numericLines = chunk.slice(2).filter((line) => looksNumericLine(line));
    const quantity = numericLines[0] ? parseLocaleNumber(numericLines[0]) : null;
    const price = numericLines[1] ? parseLocaleNumber(numericLines[1]) : null;
    const netAmount = numericLines[2] ? parseLocaleNumber(numericLines[2]) : null;
    const symbol = extractTicker(description);

    rows.push({
      rowIndex: rows.length,
      state: "NEEDS_REVIEW",
      reportKind: "MOVEMENTS",
      matchStatus: inferMatchStatus(symbol),
      symbol,
      description,
      assetClass: inferAssetClass(description, symbol, description.includes(" MEP") ? "USD" : "ARS"),
      movementType: inferMovementTypeFromText(description),
      quantity,
      availableQuantity: null,
      pledgedQuantity: null,
      price,
      averageCost: null,
      fxRate: description.includes(" MEP") ? 1 : null,
      marketValue: netAmount,
      currency: description.includes(" MEP") || description.includes("Dólar") ? "USD" : "ARS",
      tradeDate,
      settlementDate,
      custodianName: "Allaria",
      accountName: "",
      reportDate: parseReportDateFromText(text),
      notes: chunk.join(" | "),
      errorMessage: null,
    });
  }

  return rows;
}

function genericPreviewRow(index: number, row: TabularRow): ParsedRow {
  const flat = Object.entries(row)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" | ");
  return {
    rowIndex: index,
    state: "NEEDS_REVIEW",
    reportKind: "HOLDINGS",
    matchStatus: "AMBIGUOUS",
    symbol: "",
    description: flat,
    assetClass: "OTHER",
    movementType: "",
    quantity: null,
    availableQuantity: null,
    pledgedQuantity: null,
    price: null,
    averageCost: null,
    fxRate: null,
    marketValue: null,
    currency: "ARS",
    tradeDate: null,
    settlementDate: null,
    custodianName: "",
    accountName: "",
    reportDate: null,
    notes: flat,
    errorMessage: null,
  };
}

function normalizeKey(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeCurrency(value: string) {
  const normalized = normalizeText(value);
  if (normalized.includes("usd cable")) return "USD_CABLE";
  if (normalized.includes("usd mep") || normalized === "m" || normalized.includes("mep")) {
    return "USD_MEP";
  }
  if (normalized.includes("usd") || normalized.includes("u$s")) return "USD";
  return "ARS";
}

function extractTicker(raw: string) {
  const match = raw.match(/\(([A-Z0-9.\-]{1,16})\)/);
  if (match?.[1]) return normalizeSymbol(match[1]);

  const firstToken = raw.trim().split(/\s+/)[0] ?? "";
  return normalizeSymbol(firstToken);
}

function normalizeSymbol(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

function inferAssetClass(description: string, symbol: string, currency: string): AssetClass {
  const normalized = normalizeText(`${description} ${symbol} ${currency}`);
  if (
    normalized.startsWith("ars") ||
    normalized.startsWith("usd") ||
    normalized.includes("saldo") ||
    normalized.includes("dolar mep")
  ) {
    return "CASH";
  }
  if (normalized.includes("fci") || normalized.includes("fondo")) return "FUND";
  if (normalized.includes("cedear")) return "CEDEAR";
  if (normalized.includes("etf")) return "ETF";
  if (normalized.includes("on ") || normalized.includes("oblig")) return "CORPORATE_BOND";
  if (normalized.includes("bono")) return "SOVEREIGN_BOND";
  if (normalized.includes("letra") || /^s\d/.test(normalized)) return "LETTER";
  if (normalized.includes("caucion")) return "CAUCION";
  if (normalized.includes("plazo fijo")) return "FIXED_TERM";
  if (normalized.includes("opcion")) return "OPTION";
  if (normalized.includes("future") || normalized.includes("futuro")) return "FUTURE";
  if (currency.startsWith("USD") || /^[A-Z]{2,6}$/.test(symbol)) return "EQUITY";
  return "OTHER";
}

function inferCocosMovementType(value: string): MovementType {
  const normalized = normalizeText(value);
  if (normalized.includes("compra")) return "BUY";
  if (normalized.includes("venta")) return "SELL";
  if (normalized.includes("suscripcion")) return "FUND_SUBSCRIPTION";
  if (normalized.includes("rescate")) return "FUND_REDEMPTION";
  if (normalized.includes("recibo de cobro")) return "DEPOSIT";
  if (normalized.includes("orden de pago")) return "WITHDRAWAL";
  return "OTHER";
}

function inferMovementTypeFromText(value: string): MovementType {
  const normalized = normalizeText(value);
  if (normalized.includes("compra")) return "BUY";
  if (normalized.includes("venta")) return "SELL";
  if (normalized.includes("suscripcion")) return "FUND_SUBSCRIPTION";
  if (normalized.includes("rescate")) return "FUND_REDEMPTION";
  if (normalized.includes("amortizacion")) return "AMORTIZATION";
  if (normalized.includes("dividendo")) return "DIVIDEND";
  if (normalized.includes("cobro")) return "DEPOSIT";
  if (normalized.includes("bloqueo monetario")) return "CASH_BLOCK";
  if (normalized.includes("desbloqueo monetario")) return "CASH_RELEASE";
  return "OTHER";
}

function parseLocaleNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null) return 0;

  const normalized = String(value)
    .replace(/\u00a0/g, "")
    .replace(/\$/g, "")
    .replace(/US\$/gi, "")
    .replace(/M/g, "")
    .replace(/[^\d,.\-]/g, "")
    .trim();

  if (!normalized) return 0;

  if (normalized.includes(",") && normalized.includes(".")) {
    return Number(normalized.replace(/\./g, "").replace(",", "."));
  }

  if (normalized.includes(",")) {
    return Number(normalized.replace(/\./g, "").replace(",", "."));
  }

  return Number(normalized);
}

function includesAll(values: string[], expected: string[]) {
  return expected.every((item) => values.includes(item));
}

function parseReportDateFromRows(rows: TabularRow[], keys: string[]) {
  for (const row of rows) {
    for (const key of keys) {
      const value = row[key];
      const parsed = toIsoDate(value);
      if (parsed) return parsed;
    }
  }
  return null;
}

function parseReportDateFromText(text: string) {
  const match =
    text.match(/Fecha:\s*(\d{2}\/\d{2}\/\d{2,4})/i) ??
    text.match(/Fecha reporte\s*(\d{2}-\d{2}-\d{4})/i) ??
    text.match(/al\s*(\d{2}\/\d{2}\/\d{4})/i);
  return match ? toIsoDate(match[1]) : null;
}

function toIsoDate(value: string | null | undefined) {
  if (!value) return null;
  const normalized = String(value).trim();
  const dmy = normalized.match(/^(\d{2})[-/](\d{2})[-/](\d{2,4})$/);
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${dmy[2]}-${dmy[1]}`;
  }
  const ymd = normalized.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  return null;
}

function inferMatchStatus(symbol: string): MatchStatus {
  if (!symbol) return "AMBIGUOUS";
  if (symbol.length <= 2) return "AMBIGUOUS";
  return "MATCHED";
}

function parseImplicitFx(text: string) {
  const match =
    text.match(/Dólar MEP\s+([\d.,]+)/i) ??
    text.match(/cotización Dólar MEP\s+([\d.,]+)/i) ??
    text.match(/TC Implícito.*?([\d.,]+)/i);
  return match ? parseLocaleNumber(match[1]) : null;
}

function looksLikeAllariaSymbolLine(line: string, nextLine?: string) {
  if (!line || line.startsWith("Total ") || line.startsWith("Fecha:")) return false;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(line)) return false;
  if (line.includes("Instrumento Abrev.")) return false;
  if (/^[A-Z0-9]{2,12}\s/.test(line)) return true;
  if (/^[A-Z0-9/\-. ]{2,18}$/.test(line) && nextLine && /[a-záéíóú]/i.test(nextLine)) {
    return true;
  }
  return false;
}

function inferCurrencyFromAllariaBlock(block: string[]) {
  const joined = block.join(" ");
  if (joined.includes(" US$") || joined.includes("U$S")) return "USD";
  if (joined.includes(" MEP") || joined.includes(" M ")) return "USD_MEP";
  return "ARS";
}

function isDateString(value: string) {
  return /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(value);
}

function looksNumericLine(value: string) {
  return /^-?[\d.,]+$/.test(value) || /^-?[\d.,]+\s*(?:\$|M|US\$)?$/.test(value);
}
