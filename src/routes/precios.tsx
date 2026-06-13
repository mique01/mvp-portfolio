import { createFileRoute, Link } from "@tanstack/react-router";
import { AdvisorShell } from "@/components/AdvisorShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/precios")({
  component: LegacyPricesPage,
});

function LegacyPricesPage() {
  return (
    <AdvisorShell>
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Transición</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-foreground">El módulo de precios migra al master de activos</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          El pricing ahora se separa por providers y se combina con holdings, fondos y tipos de cambio.
          La vista principal para esto pasa a ser Asset Master y Fund Master.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link to="/assets">Ir a Asset Master</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/funds">Ir a Fund Master</Link>
          </Button>
        </div>
      </div>
    </AdvisorShell>
  );
}
