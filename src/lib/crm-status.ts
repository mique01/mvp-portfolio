import type { MarketDataStatus } from "@/lib/model-portfolio";

export function marketDataBadgeVariant(
  status: MarketDataStatus,
): "default" | "secondary" | "outline" {
  switch (status) {
    case "live":
      return "default";
    case "partial":
      return "secondary";
    case "fallback":
    case "unconfigured":
    default:
      return "outline";
  }
}

export function marketDataLabel(status: MarketDataStatus) {
  switch (status) {
    case "live":
      return "Precios en vivo";
    case "partial":
      return "Precios en vivo";
    case "fallback":
      return "Precios fallback";
    case "unconfigured":
    default:
      return "API de mercado pendiente";
  }
}

export function marketDataDescription(status: MarketDataStatus) {
  switch (status) {
    case "live":
      return "La valuación se está alimentando con tus endpoints configurados.";
    case "partial":
      return "La valuación usa precios de mercado y completa referencias puntuales con datos locales.";
    case "fallback":
      return "Los activos no matchearon con la API y se usa valuación local.";
    case "unconfigured":
    default:
      return "Faltan las URLs reales de mercado para CEDEARs, bonos, ONs, letras y FCI.";
  }
}

export function dataModeLabel(mode: "database" | "seed") {
  return mode === "database" ? "Backend activo" : "Modo demo";
}

export function dataModeDescription(mode: "database" | "seed") {
  return mode === "database"
    ? "Las operaciones y la cartera modelo ya se guardan en Postgres."
    : "La app sigue operativa con datos semilla hasta que conectes Postgres.";
}
