import { createFileRoute, Link } from "@tanstack/react-router";
import { AdvisorShell } from "@/components/AdvisorShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/comisiones")({
  component: LegacyCommissionsPage,
});

function LegacyCommissionsPage() {
  return (
    <AdvisorShell>
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Módulo legacy</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-foreground">Comisiones despriorizadas</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Este módulo ya no es parte del flujo principal del producto. El foco operativo pasó a imports,
          holdings, valuación y reporting multi-custodio.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link to="/imports">Ir a imports</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Volver al dashboard</Link>
          </Button>
        </div>
      </div>
    </AdvisorShell>
  );
}
