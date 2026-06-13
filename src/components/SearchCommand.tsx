import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Users, BarChart3 } from "lucide-react";
import type { Client } from "@/lib/mock-data";
import { assetUniverse, findAssetHolders, fmtMoney } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

/**
 * Universal search bar: clients, comitentes, and assets.
 * Typing an asset symbol shows every client holding it with weight + PnL.
 */
export function SearchCommand({ className, clients }: { className?: string; clients: Client[] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const universe = useMemo(() => assetUniverse(clients), [clients]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const q = query.trim().toLowerCase();

  const matchedClients = q
    ? clients
        .filter((client) => client.name.toLowerCase().includes(q) || client.comitente.includes(q))
        .slice(0, 5)
    : [];

  const matchedAssets = q
    ? universe.filter((asset) => asset.asset.toLowerCase().includes(q)).slice(0, 5)
    : [];

  const focusAsset =
    matchedAssets.find((asset) => asset.asset.toLowerCase() === q) ?? matchedAssets[0];
  const holders = focusAsset ? findAssetHolders(clients, focusAsset.asset) : [];
  const showResults = open && q.length > 0;

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 focus-within:border-primary/60">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          placeholder="Buscar cliente, comitente o activo (ej: AL30)..."
          className="num w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
        />
        <kbd className="hidden rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
          Cmd+K
        </kbd>
      </div>

      {showResults && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-[480px] overflow-auto rounded-md border border-border bg-popover shadow-elevated">
          {matchedClients.length === 0 && matchedAssets.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              Sin resultados para "{query}".
            </div>
          )}

          {matchedClients.length > 0 && (
            <div>
              <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <Users className="h-3 w-3" /> Clientes
              </div>
              {matchedClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => {
                    navigate({
                      to: "/clientes/$clientId",
                      params: { clientId: String(client.id) },
                    });
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-surface-elevated"
                >
                  <div>
                    <div className="font-medium text-foreground">{client.name}</div>
                    <div className="num text-[10px] text-muted-foreground">
                      Comitente {client.comitente} · {client.holdings.length} pos.
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-primary">Abrir →</span>
                </button>
              ))}
            </div>
          )}

          {matchedAssets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 border-b border-t border-border/60 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <BarChart3 className="h-3 w-3" /> Activos
              </div>
              {matchedAssets.map((asset) => {
                const isFocus = focusAsset?.asset === asset.asset;

                return (
                  <button
                    key={asset.asset}
                    onClick={() => setQuery(asset.asset)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-surface-elevated",
                      isFocus && "bg-surface-elevated",
                    )}
                  >
                    <div>
                      <div className="num font-medium text-foreground">{asset.asset}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {asset.type} · {asset.holders} clientes
                      </div>
                    </div>
                    <span className="num text-[11px] text-muted-foreground">
                      {fmtMoney(asset.totalValue, { compact: true })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {focusAsset && holders.length > 0 && (
            <div className="border-t border-border/60">
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <span>Tenedores de {focusAsset.asset}</span>
                <span>% Cartera · PnL</span>
              </div>
              {holders.map((holder) => (
                <button
                  key={holder.clientId}
                  onClick={() => {
                    navigate({
                      to: "/clientes/$clientId",
                      params: { clientId: String(holder.clientId) },
                    });
                    setOpen(false);
                    setQuery("");
                  }}
                  className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-surface-elevated"
                >
                  <div>
                    <div className="font-medium text-foreground">{holder.clientName}</div>
                    <div className="num text-[10px] text-muted-foreground">
                      {holder.quantity.toLocaleString("es-AR")} un. ·{" "}
                      {fmtMoney(holder.value, { compact: true })}
                    </div>
                  </div>
                  <span className="num text-[11px] text-muted-foreground">
                    {holder.pctOfPortfolio.toFixed(1)}%
                  </span>
                  <span
                    className={cn(
                      "num w-16 text-right text-[11px] font-medium",
                      holder.pnlPct >= 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    {holder.pnlPct >= 0 ? "+" : ""}
                    {holder.pnlPct.toFixed(1)}%
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
