import { createFileRoute } from "@tanstack/react-router";
import { AdvisorShell } from "@/components/AdvisorShell";
import { Section } from "@/components/Section";
import { Badge } from "@/components/ui/badge";
import { loadSettingsData } from "@/lib/server/crm-server-functions";

export const Route = createFileRoute("/settings/users")({
  loader: () => loadSettingsData(),
  head: () => ({
    meta: [{ title: "Usuarios | Apex Wealth Hub" }],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { users } = Route.useLoaderData();

  return (
    <AdvisorShell>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Settings</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">Usuarios y roles</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Roles base de plataforma y futuras políticas de acceso por organización, cliente y lectura final.
          </p>
        </div>

        <Section title="Usuarios cargados" subtitle="Prioridad actual: admin e invitados de lectura" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Rol</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === "SUPER_ADMIN" || user.role === "ORG_ADMIN" ? "default" : "outline"}>
                        {user.role}
                      </Badge>
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
