import { createFileRoute } from "@tanstack/react-router";
import { AdvisorShell } from "@/components/AdvisorShell";
import { Section } from "@/components/Section";
import { Badge } from "@/components/ui/badge";
import { loadMovementsData } from "@/lib/server/crm-server-functions";

export const Route = createFileRoute("/movimientos")({
  loader: () => loadMovementsData(),
  head: () => ({
    meta: [{ title: "Movimientos | Apex Wealth Hub" }],
  }),
  component: MovementsPage,
});

function MovementsPage() {
  const { movements } = Route.useLoaderData();

  return (
    <AdvisorShell>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Movimientos</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">Historial operativo</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Compras, ventas, suscripciones, rescates, cobros y movimientos monetarios consolidados por cuenta.
          </p>
        </div>

        <Section title="Todas las operaciones" subtitle="Movimientos importados o generados por el flujo de revisión" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Activo</th>
                  <th className="px-4 py-3">Cuenta</th>
                  <th className="px-4 py-3">Custodio</th>
                  <th className="px-4 py-3 text-right">Cantidad</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-3 text-muted-foreground">{movement.tradeDate}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{movement.movementType}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{movement.symbol ?? "Sin activo"}</div>
                      <div className="text-xs text-muted-foreground">{movement.description}</div>
                    </td>
                    <td className="px-4 py-3">{movement.accountName}</td>
                    <td className="px-4 py-3">{movement.custodianName}</td>
                    <td className="px-4 py-3 text-right">{movement.quantity?.toLocaleString("es-AR") ?? "-"}</td>
                    <td className="px-4 py-3 text-right">{movement.price?.toLocaleString("es-AR") ?? "-"}</td>
                    <td className="px-4 py-3 text-right">{movement.netAmount?.toLocaleString("es-AR") ?? movement.grossAmount?.toLocaleString("es-AR") ?? "-"}</td>
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
