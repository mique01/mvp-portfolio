import { createFileRoute, Link } from "@tanstack/react-router";
import { AdvisorShell } from "@/components/AdvisorShell";
import { ImportUploadPanel } from "@/components/ImportUploadPanel";
import { Section } from "@/components/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadImportsData } from "@/lib/server/crm-server-functions";

export const Route = createFileRoute("/imports")({
  loader: () => loadImportsData(),
  head: () => ({
    meta: [
      { title: "Imports | Apex Wealth Hub" },
      { name: "description", content: "Carga y revisión de reportes de tenencias y movimientos." },
    ],
  }),
  component: ImportsPage,
});

function ImportsPage() {
  const data = Route.useLoaderData();

  return (
    <AdvisorShell>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Imports</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">Carga y revisión</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Subí archivos de Allaria o Cocos, detectá el origen automáticamente y revisá cada fila antes de
            impactar holdings o movimientos definitivos.
          </p>
        </div>

        <Section title="Nuevo archivo" subtitle="Cliente, cuenta, custodio y archivo de origen">
          <ImportUploadPanel clients={data.clients} custodians={data.custodians} accounts={data.accounts} />
        </Section>

        <Section title="Historial de imports" subtitle="Seguimiento de estado, origen detectado y revisión" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-4 py-3">Archivo</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Custodio</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Filas</th>
                  <th className="px-4 py-3 text-right">Revisar</th>
                </tr>
              </thead>
              <tbody>
                {data.batches.map((batch) => (
                  <tr key={batch.id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{batch.filename}</div>
                      <div className="text-xs text-muted-foreground">{batch.fileType}</div>
                    </td>
                    <td className="px-4 py-3">{batch.clientName}</td>
                    <td className="px-4 py-3">{batch.custodianName ?? batch.detectedCustodian ?? "Pendiente"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{batch.reportKind}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={batch.status === "CONFIRMED" ? "default" : "secondary"}>{batch.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{batch.rowCount}</td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/imports/$importId" params={{ importId: batch.id }}>
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
    </AdvisorShell>
  );
}
