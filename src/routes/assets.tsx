import { createFileRoute } from "@tanstack/react-router";
import { AdvisorShell } from "@/components/AdvisorShell";
import { Section } from "@/components/Section";
import { Badge } from "@/components/ui/badge";
import { loadAssetsData } from "@/lib/server/crm-server-functions";

export const Route = createFileRoute("/assets")({
  loader: () => loadAssetsData(),
  head: () => ({
    meta: [{ title: "Asset Master | Apex Wealth Hub" }],
  }),
  component: AssetsPage,
});

function AssetsPage() {
  const { assets } = Route.useLoaderData();

  return (
    <AdvisorShell>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Asset Master</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">Activos y aliases</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Catálogo base para matching manual o automático entre custodios, tenencias y movimientos.
          </p>
        </div>

        <Section title="Universo de activos" subtitle="Símbolos consolidados del master" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-4 py-3">Símbolo</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Clase</th>
                  <th className="px-4 py-3">Moneda</th>
                  <th className="px-4 py-3 text-right">Flags</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-3 font-medium text-foreground">{asset.symbol}</td>
                    <td className="px-4 py-3">{asset.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{asset.assetClass}</Badge>
                    </td>
                    <td className="px-4 py-3">{asset.currency}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {[asset.isFund ? "Fund" : null, asset.isCashLike ? "Cash-like" : null]
                        .filter(Boolean)
                        .join(" · ") || "-"}
                    </td>
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
