import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdvisorShell } from "@/components/AdvisorShell";
import { Section } from "@/components/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCustodianAction,
  loadSettingsData,
} from "@/lib/server/crm-server-functions";

export const Route = createFileRoute("/settings/custodians")({
  loader: () => loadSettingsData(),
  head: () => ({
    meta: [{ title: "Custodios | Apex Wealth Hub" }],
  }),
  component: CustodiansPage,
});

function CustodiansPage() {
  const { custodians } = Route.useLoaderData();
  const router = useRouter();
  const [type, setType] = useState<"ALYC" | "BANK" | "BROKER" | "OTHER">("ALYC");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <AdvisorShell>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Settings</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">Custodios</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Alta de custodios y configuración base para detección y matching de imports.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-12">
          <Section className="xl:col-span-4" title="Nuevo custodio" subtitle="Configuralo antes de asignar cuentas">
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const name = String(formData.get("name") ?? "").trim();
                const code = String(formData.get("code") ?? "").trim();
                const aliases = String(formData.get("aliases") ?? "")
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean);

                if (!name) {
                  toast.error("Nombre requerido");
                  return;
                }

                setIsSubmitting(true);
                try {
                  await createCustodianAction({ data: { name, type, code: code || undefined, aliases } });
                  await router.invalidate();
                  toast.success("Custodio creado");
                  event.currentTarget.reset();
                } catch (error) {
                  toast.error("No se pudo crear", {
                    description: error instanceof Error ? error.message : "Error inesperado.",
                  });
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input name="name" placeholder="Ej: Allaria / Balanz / Galicia" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALYC">ALyC</SelectItem>
                    <SelectItem value="BANK">Banco</SelectItem>
                    <SelectItem value="BROKER">Broker</SelectItem>
                    <SelectItem value="OTHER">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Código</Label>
                <Input name="code" placeholder="ALL / COCOS / GAL" />
              </div>
              <div className="space-y-2">
                <Label>Aliases</Label>
                <Input name="aliases" placeholder="allaria, allaria sa, allaria alyc" />
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar custodio"}
              </Button>
            </form>
          </Section>

          <Section className="xl:col-span-8" title="Custodios configurados" subtitle="Activos para detección y cuentas" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Aliases</th>
                    <th className="px-4 py-3 text-right">Activo</th>
                  </tr>
                </thead>
                <tbody>
                  {custodians.map((custodian) => (
                    <tr key={custodian.id} className="border-b border-border/60 last:border-b-0">
                      <td className="px-4 py-3 font-medium text-foreground">{custodian.name}</td>
                      <td className="px-4 py-3">{custodian.type}</td>
                      <td className="px-4 py-3">{custodian.code ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{custodian.aliases.join(", ") || "-"}</td>
                      <td className="px-4 py-3 text-right">{custodian.isActive ? "Sí" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      </div>
    </AdvisorShell>
  );
}
