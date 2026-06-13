import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdvisorShell } from "@/components/AdvisorShell";
import { NewClientModal } from "@/components/NewClientModal";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadClientsData } from "@/lib/server/crm-server-functions";

export const Route = createFileRoute("/clientes")({
  loader: () => loadClientsData(),
  head: () => ({
    meta: [
      { title: "Clientes | Apex Wealth Hub" },
      { name: "description", content: "Base de clientes institucionales y privados." },
    ],
  }),
  component: ClientsRoute,
});

function ClientsRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/clientes") return <Outlet />;
  return <ClientsPage />;
}

function ClientsPage() {
  const { clients } = Route.useLoaderData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return clients;
    return clients.filter((entry) =>
      [entry.client.name, entry.client.legalName, entry.client.taxId, ...entry.custodians]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [clients, query]);

  return (
    <AdvisorShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Clientes</p>
            <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">Base multi-tenant</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Cada cliente consolida múltiples cuentas y custodios dentro de la misma organización.
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>Nuevo cliente</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Clientes" value={clients.length} hint="Registros activos" />
          <StatCard label="Cuentas" value={clients.reduce((sum, entry) => sum + entry.accounts.length, 0)} hint="Custodias asociadas" />
          <StatCard label="Valuacion ARS" value={clients.reduce((sum, entry) => sum + entry.totalValueArs, 0).toLocaleString("es-AR")} hint="Consolidado" />
          <StatCard label="Movimientos" value={clients.reduce((sum, entry) => sum + entry.movementsCount, 0)} hint="Historial cargado" />
        </div>

        <Section
          title="Listado de clientes"
          subtitle="Búsqueda rápida por nombre, custodio o CUIT"
          actions={
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar cliente o custodio"
              className="w-[260px]"
            />
          }
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Custodios</th>
                  <th className="px-4 py-3 text-right">Valuacion ARS</th>
                  <th className="px-4 py-3 text-right">Valuacion USD</th>
                  <th className="px-4 py-3 text-right">PnL</th>
                  <th className="px-4 py-3 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr key={entry.client.id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{entry.client.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {entry.client.legalName || entry.client.taxId || "Sin identificacion fiscal"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{entry.client.type}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {entry.custodians.map((custodian) => (
                          <Badge key={custodian} variant="secondary">
                            {custodian}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{entry.totalValueArs.toLocaleString("es-AR")}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {entry.totalValueUsd?.toLocaleString("es-AR") ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={entry.pnlAmountArs != null && entry.pnlAmountArs >= 0 ? "text-success" : "text-destructive"}>
                        {entry.pnlAmountArs?.toLocaleString("es-AR") ?? "N/D"}
                      </span>
                    </td>
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
      </div>

      <NewClientModal open={open} onOpenChange={setOpen} />
    </AdvisorShell>
  );
}
