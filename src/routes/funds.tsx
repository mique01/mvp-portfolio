import { createFileRoute } from "@tanstack/react-router";
import { AdvisorShell } from "@/components/AdvisorShell";
import { Section } from "@/components/Section";
import { Badge } from "@/components/ui/badge";
import { loadFundsData } from "@/lib/server/crm-server-functions";

export const Route = createFileRoute("/funds")({
  loader: () => loadFundsData(),
  head: () => ({
    meta: [{ title: "Fund Master | Apex Wealth Hub" }],
  }),
  component: FundsPage,
});

function FundsPage() {
  const { funds } = Route.useLoaderData();

  return (
    <AdvisorShell>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Fund Master</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">Fondos comunes</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Tabla base para VCP histórico, aliases por custodio y matching entre snapshots y movimientos.
          </p>
        </div>

        <Section title="Fondos consolidados" subtitle="Alias y último VCP disponible" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3 text-right">Último VCP</th>
                  <th className="px-4 py-3 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {funds.map((fund) => (
                  <tr key={fund.id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-3 font-medium text-foreground">{fund.code}</td>
                    <td className="px-4 py-3">{fund.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{fund.assetSymbol ?? "Sin asset"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{fund.latestPrice?.toLocaleString("es-AR") ?? "-"}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{fund.latestPriceDate ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </AdvisorShell>
  );
}
