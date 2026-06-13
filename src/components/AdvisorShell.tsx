import { ChartPie, Download, Landmark, Shield, Users } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: ChartPie, activePrefix: "/" },
  { to: "/clientes", label: "Clientes", icon: Users, activePrefix: "/clientes" },
  { to: "/imports", label: "Importar", icon: Download, activePrefix: "/imports" },
  { to: "/precios", label: "Precios", icon: Landmark, activePrefix: "/precios" },
  {
    to: "/settings",
    label: "Configuracion",
    icon: Shield,
    activePrefix: "/settings",
  },
];

export function AdvisorShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1520px] items-center justify-between gap-6 px-5 py-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <span className="font-display text-lg leading-none">A</span>
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg tracking-tight text-foreground">
                Apex Wealth Hub
              </div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Multi-Custody Portfolio Office
              </div>
            </div>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {nav.map((item) => {
              const active =
                item.activePrefix === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.activePrefix);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-sm font-semibold text-foreground">Miqueas</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Platform Admin
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold text-foreground">
              ME
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1520px] px-5 py-6">{children}</main>

      <footer className="mx-auto max-w-[1520px] px-5 pb-8 pt-3 text-[11px] text-muted-foreground">
        Apex Wealth Hub | Consolidacion multi-custodio | Uso interno y clientes con permisos
      </footer>
    </div>
  );
}
