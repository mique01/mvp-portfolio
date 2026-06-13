import { createFileRoute, Link } from "@tanstack/react-router";
import { AdvisorShell } from "@/components/AdvisorShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/portfolio/$token")({
  component: SharedPortfolioPlaceholder,
});

function SharedPortfolioPlaceholder() {
  return (
    <AdvisorShell>
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Pendiente</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-foreground">Portfolio compartido</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          La versión pública read-only para clientes finales queda preparada como etapa siguiente,
          una vez cerrados imports, permisos y consolidado operativo.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link to="/">Volver al dashboard</Link>
          </Button>
        </div>
      </div>
    </AdvisorShell>
  );
}
