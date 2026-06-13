import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Building2, Download, Landmark, Users } from "lucide-react";
import { AdvisorShell } from "@/components/AdvisorShell";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadDashboardData } from "@/lib/server/crm-server-functions";

export const Route = createFileRoute("/")({
  loader: () => loadDashboardData(),
  head: () => ({
    meta: [
      { title: "Dashboard | Apex Wealth Hub" },
      {
        name: "description",
        content: "Consolidado general de clientes, custodios, imports y valuación.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { summary, clients, recentImports, custodians } = Route.useLoaderData();

  return (
    <AdvisorShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Apex Wealth Hub</p>
            <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">
              Consolidador multi-custodio
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Dashboard operativo para importar tenencias y movimientos, revisar matching de activos,
              consolidar carteras por custodio y mostrar reporting institucional.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/imports">
                Ir a imports
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/clientes">Ver clientes</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Clientes" value={summary.clients} hint="Base activa" />
          <StatCard label="Cuentas" value={summary.accounts} hint="Cuentas por custodio" />
          <StatCard label="Custodios" value={summary.custodians} hint="ALyCs, bancos y brokers" />
          <StatCard label="Valuacion ARS" value={summary.totalValueArs.toLocaleString("es-AR")} hint="Consolidado total" />
          <StatCard
            label="Imports pendientes"
            value={summary.importsPending}
            hint="Batches no confirmados"
            accent={summary.importsPending > 0 ? "destructive" : "success"}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-12">
          <Section
            className="xl:col-span-8"
            title="Clientes consolidados"
            subtitle="Valor total, PnL y custodios activos por cliente"
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3 text-right">Valuacion ARS</th>
                    <th className="px-4 py-3 text-right">Valuacion USD</th>
                    <th className="px-4 py-3 text-right">PnL</th>
                    <th className="px-4 py-3 text-right">Custodios</th>
                    <th className="px-4 py-3 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((entry) => (
                    <tr key={entry.client.id} className="border-b border-border/60 last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{entry.client.name}</div>
                        <div className="text-xs text-muted-foreground">{entry.holdingsCount} posiciones</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{entry.client.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {entry.totalValueArs.toLocaleString("es-AR")}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {entry.totalValueUsd?.toLocaleString("es-AR") ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={entry.pnlAmountArs != null && entry.pnlAmountArs >= 0 ? "text-success" : "text-destructive"}>
                          {entry.pnlAmountArs?.toLocaleString("es-AR") ?? "N/D"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{entry.custodians.length}</td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/clientes/$clientId" params={{ clientId: entry.client.id }}>
                            Abrir
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section
            className="xl:col-span-4"
            title="Estado operativo"
            subtitle="Resumen de ingestión y cobertura actual"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                <div className="flex items-center gap-3">
                  <Download className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium text-foreground">Batches recientes</div>
                    <div className="text-xs text-muted-foreground">Últimos imports cargados</div>
                  </div>
                </div>
                <Badge>{recentImports.length}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                <div className="flex items-center gap-3">
                  <Landmark className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium text-foreground">Custodios activos</div>
                    <div className="text-xs text-muted-foreground">Cobertura inicial Allaria + Cocos</div>
                  </div>
                </div>
                <Badge variant="outline">{custodians.length}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium text-foreground">Clientes con review</div>
                    <div className="text-xs text-muted-foreground">Imports pendientes de confirmar</div>
                  </div>
                </div>
                <Badge variant={summary.importsPending > 0 ? "destructive" : "outline"}>
                  {summary.importsPending}
                </Badge>
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Próximo foco del MVP
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Terminar review y confirmación de imports para holdings y movimientos, con matching de activos
                  y consolidado por custodio.
                </p>
              </div>
            </div>
          </Section>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Section title="Distribucion por clase de activo" subtitle="Valuacion consolidada en ARS">
            <div className="space-y-3">
              {summary.allocationByAssetClass.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium text-foreground">{item.value.toLocaleString("es-AR")}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Distribucion por custodio" subtitle="Dónde está depositado el patrimonio">
            <div className="space-y-3">
              {summary.allocationByCustodian.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Landmark className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium text-foreground">{item.value.toLocaleString("es-AR")}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </AdvisorShell>
  );
}
