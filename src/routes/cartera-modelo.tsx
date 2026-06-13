import { createFileRoute, Link } from "@tanstack/react-router";
import { AdvisorShell } from "@/components/AdvisorShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cartera-modelo")({
  component: LegacyModelPortfolioPage,
});

function LegacyModelPortfolioPage() {
  return (
    <AdvisorShell>
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Módulo legacy</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-foreground">Cartera modelo removida del foco</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          La nueva versión del producto prioriza consolidación real de posiciones por cliente y custodio,
          no mandatos modelo ni benchmarking comercial.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link to="/clientes">Abrir clientes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Volver al dashboard</Link>
          </Button>
        </div>
      </div>
    </AdvisorShell>
  );
}
