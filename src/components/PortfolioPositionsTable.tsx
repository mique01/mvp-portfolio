import { PnL } from "@/components/PnL";
import type {
  PortfolioCurrencyMode,
  PositionByAsset,
  ResolvedPositionDisplay,
} from "@/lib/client-profile";
import { resolvePositionDisplayValues } from "@/lib/client-profile";
import { fmtMoney } from "@/lib/portfolio";

type Props = {
  rows: PositionByAsset[];
  mepRate: number;
  cclRate: number;
  displayCurrency: PortfolioCurrencyMode;
};

function formatMoneyValue(value: number, currency: PortfolioCurrencyMode) {
  if (currency === "USD_MEP_TODAY") {
    return `US$${value.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return fmtMoney(value);
}

function formatRate(value: number) {
  return `$${value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function renderFxComparison(resolved: ResolvedPositionDisplay, isPeso: boolean) {
  if (!isPeso || !resolved.fxComparison) {
    return <span className="text-muted-foreground">-</span>;
  }

  const { historicalRate, todayRate, deltaPct } = resolved.fxComparison;
  const fxLabel = resolved.fxLabel ?? "MEP";
  return (
    <div className="space-y-0.5">
      <div className="text-foreground">
        Hoy {fxLabel}: {formatRate(todayRate)}
      </div>
      <div className="text-muted-foreground">Registro: {formatRate(historicalRate)}</div>
      <div className={`text-[11px] ${deltaPct >= 0 ? "text-success" : "text-destructive"}`}>
        {deltaPct >= 0 ? "+" : ""}
        {deltaPct.toFixed(2)}%
      </div>
    </div>
  );
}

export function PortfolioPositionsTable({ rows, mepRate, cclRate, displayCurrency }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1120px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <th className="px-4 py-2 font-medium">Instrumento</th>
            <th className="px-4 py-2 text-right font-medium">Cantidad</th>
            <th className="px-4 py-2 text-right font-medium">
              Costo prom. {displayCurrency === "USD_MEP_TODAY" ? "USD" : "ARS"}
            </th>
            <th className="px-4 py-2 text-right font-medium">
              Precio actual {displayCurrency === "USD_MEP_TODAY" ? "USD" : "ARS"}
            </th>
            <th className="px-4 py-2 text-right font-medium">
              Valor {displayCurrency === "USD_MEP_TODAY" ? "USD" : "ARS"}
            </th>
            <th className="px-4 py-2 text-right font-medium">TC ref.</th>
            <th className="px-4 py-2 text-right font-medium">Peso</th>
            <th className="px-4 py-2 text-right font-medium">1D</th>
            <th className="px-4 py-2 text-right font-medium">PnL</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((position) => {
            const resolved = resolvePositionDisplayValues(
              position,
              mepRate,
              cclRate,
              displayCurrency,
            );

            return (
              <tr
                key={position.asset}
                className="border-b border-border/40 hover:bg-surface-elevated"
              >
                <td className="px-4 py-2.5">
                  <div className="num font-medium text-foreground">{position.asset}</div>
                  <div className="text-[10px] text-muted-foreground">{position.assetType}</div>
                </td>
                <td className="num px-4 py-2.5 text-right">
                  {position.quantity.toLocaleString("es-AR", { maximumFractionDigits: 4 })}
                </td>
                <td className="num px-4 py-2.5 text-right text-muted-foreground">
                  {formatMoneyValue(resolved.avgCost, displayCurrency)}
                </td>
                <td className="num px-4 py-2.5 text-right">
                  {formatMoneyValue(resolved.currentPrice, displayCurrency)}
                </td>
                <td className="num px-4 py-2.5 text-right font-medium">
                  {formatMoneyValue(resolved.marketValue, displayCurrency)}
                </td>
                <td className="px-4 py-2.5 text-right text-[11px] leading-tight">
                  {renderFxComparison(resolved, position.isPeso)}
                </td>
                <td className="num px-4 py-2.5 text-right text-muted-foreground">
                  {position.weightPct.toFixed(1)}%
                </td>
                <td
                  className={`num px-4 py-2.5 text-right font-medium ${
                    position.performance.d1 >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {position.performance.d1 >= 0 ? "+" : ""}
                  {position.performance.d1.toFixed(2)}%
                </td>
                <td className="px-4 py-2.5 text-right">
                  <PnL
                    value={resolved.pnl}
                    pct={resolved.pnlPct}
                    currency={displayCurrency === "USD_MEP_TODAY" ? "USD" : "ARS"}
                  />
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-10 text-center text-xs text-muted-foreground">
                No hay posiciones activas para este cliente.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
