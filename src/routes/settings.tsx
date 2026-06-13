import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Landmark,
  Settings2,
  Shield,
  Users,
} from "lucide-react";
import { AdvisorShell } from "@/components/AdvisorShell";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  loadAssetsData,
  loadFundsData,
  loadPricesData,
  loadSettingsData,
} from "@/lib/server/crm-server-functions";
import type { MarketDataStatus } from "@/lib/wealth-types";

export const Route = createFileRoute("/settings")({
  loader: async () => {
    const [settings, assets, funds, prices] = await Promise.all([
      loadSettingsData(),
      loadAssetsData(),
      loadFundsData(),
      loadPricesData(),
    ]);

    return {
      settings,
      assets,
      funds,
      prices,
    };
  },
  head: () => ({
    meta: [{ title: "Configuracion | Apex Wealth Hub" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, assets, funds, prices } = Route.useLoaderData();

  return (
    <AdvisorShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Configuracion</p>
            <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">
              Admin y providers
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Centro administrativo para custodios, usuarios, masters y estado tecnico de
              precios. La operacion diaria queda enfocada en clientes, importacion y valuacion.
            </p>
          </div>

          <Button asChild>
            <Link to="/precios">
              Ver precios live
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Activos master" value={assets.assets.length} hint="Universo consolidado" />
          <StatCard label="Fondos master" value={funds.funds.length} hint="Fondos con VCP historico" />
          <StatCard label="Custodios" value={settings.custodians.length} hint="ALyCs y bancos activos" />
          <StatCard label="Usuarios" value={settings.users.length} hint="Roles y permisos base" />
        </div>

        <Section
          title="Accesos administrativos"
          subtitle="Todo lo que no forma parte del flujo operativo principal vive aca"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminCard
              title="Asset Master"
              description="Catalogo de activos, clases y matching consolidado."
              icon={Building2}
              to="/assets"
            />
            <AdminCard
              title="Fund Master"
              description="Fondos, aliases y ultimos VCP disponibles."
              icon={Landmark}
              to="/funds"
            />
            <AdminCard
              title="Custodios"
              description="Alta de ALyCs, bancos, aliases y deteccion."
              icon={Shield}
              to="/settings/custodians"
            />
            <AdminCard
              title="Usuarios"
              description="Roles base de plataforma y lectura final."
              icon={Users}
              to="/settings/users"
            />
          </div>
        </Section>

        <Section
          title="Providers tecnicos"
          subtitle="Estado consolidado de market data y tipos de cambio"
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-md border border-border bg-background p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                <div className="text-sm font-medium text-foreground">Motor de precios</div>
                <Badge variant={statusBadgeVariant(prices.marketDataStatus)}>
                  {statusLabel(prices.marketDataStatus)}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-border/70 bg-surface p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Cotizaciones cargadas
                  </div>
                  <div className="mt-2 num text-2xl font-semibold text-foreground">
                    {prices.prices.length}
                  </div>
                </div>
                <div className="rounded-md border border-border/70 bg-surface p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Ultima actualizacion
                  </div>
                  <div className="mt-2 text-sm font-medium text-foreground">
                    {formatDateTime(prices.fetchedAt)}
                  </div>
                </div>
                <div className="rounded-md border border-border/70 bg-surface p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    MEP
                  </div>
                  <div className="mt-2 num text-2xl font-semibold text-foreground">
                    {formatMoney(prices.dollars.mep)}
                  </div>
                </div>
                <div className="rounded-md border border-border/70 bg-surface p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    CCL
                  </div>
                  <div className="mt-2 num text-2xl font-semibold text-foreground">
                    {formatMoney(prices.dollars.ccl)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border bg-background p-4">
              <div className="text-sm font-medium text-foreground">Incidencias actuales</div>
              {prices.errors.length ? (
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {prices.errors.map((error) => (
                    <li
                      key={`${error.endpoint}-${error.message}`}
                      className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2"
                    >
                      <span className="font-medium text-foreground">{error.endpoint}</span>: {error.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-3 rounded-md border border-border/70 bg-surface px-3 py-3 text-sm text-muted-foreground">
                  Sin errores reportados. Si queres inspeccionar el detalle de precios, usá la
                  pantalla principal de <Link to="/precios" className="text-primary underline-offset-4 hover:underline">Precios</Link>.
                </div>
              )}
            </div>
          </div>
        </Section>
      </div>
    </AdvisorShell>
  );
}

function AdminCard({
  title,
  description,
  icon: Icon,
  to,
}: {
  title: string;
  description: string;
  icon: typeof Building2;
  to: "/assets" | "/funds" | "/settings/custodians" | "/settings/users";
}) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <div className="font-medium text-foreground">{title}</div>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4">
        <Button asChild variant="outline" size="sm">
          <Link to={to}>Abrir</Link>
        </Button>
      </div>
    </div>
  );
}

function statusLabel(status: MarketDataStatus) {
  switch (status) {
    case "live":
      return "Feed live";
    case "partial":
      return "Cobertura parcial";
    case "fallback":
      return "Fallback";
    default:
      return "Sin configurar";
  }
}

function statusBadgeVariant(
  status: MarketDataStatus,
): "default" | "secondary" | "outline" {
  switch (status) {
    case "live":
      return "default";
    case "partial":
      return "secondary";
    default:
      return "outline";
  }
}

function formatMoney(value: number | null | undefined) {
  if (value == null) return "N/D";
  return `$ ${value.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "N/D";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
