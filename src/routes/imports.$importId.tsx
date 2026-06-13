import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AdvisorShell } from "@/components/AdvisorShell";
import { ImportReviewTable } from "@/components/ImportReviewTable";
import { loadImportDetail } from "@/lib/server/crm-server-functions";

export const Route = createFileRoute("/imports/$importId")({
  loader: ({ params }) => loadImportDetail({ data: { importId: params.importId } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.filename ?? "Import"} | Apex Wealth Hub` }],
  }),
  component: ImportDetailPage,
});

function ImportDetailPage() {
  const batch = Route.useLoaderData();

  return (
    <AdvisorShell>
      <div className="space-y-6">
        <Link to="/imports" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Volver a imports
        </Link>

        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Revisión de import</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">{batch.filename}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Editá, ignorá o remapeá cada fila antes de confirmar. Ninguna fila impacta la cartera final
            hasta que el batch quede confirmado.
          </p>
        </div>

        <ImportReviewTable batch={batch} />
      </div>
    </AdvisorShell>
  );
}
