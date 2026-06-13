import { Button } from "@/components/ui/button";
import type { OperationRow } from "@/lib/client-profile";
import { fmtDate, fmtMoney } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

type Props = {
  rows: OperationRow[];
  totalRows: number;
  onViewAll: () => void;
  onEdit?: (operation: OperationRow) => void;
  onDelete?: (operation: OperationRow) => void;
};

const statusClasses: Record<OperationRow["status"], string> = {
  Ejecutada: "bg-success/15 text-success border-success/30",
  Pendiente: "bg-warning/20 text-warning border-warning/30",
  Cancelada: "bg-destructive/15 text-destructive border-destructive/30",
};

const operationClasses: Record<OperationRow["type"], string> = {
  Compra: "bg-success/15 text-success",
  Venta: "bg-destructive/15 text-destructive",
  Suscripción: "bg-chart-2/15 text-chart-2",
  Rescate: "bg-primary/15 text-primary",
};

export function OperationsTable({ rows, totalRows, onViewAll, onEdit, onDelete }: Props) {
  const hasMore = totalRows > 8;
  const isExpanded = totalRows > 8 && rows.length === totalRows;
  const showActions = Boolean(onEdit && onDelete);

  return (
    <div className="space-y-3">
      <div className="space-y-2 md:hidden">
        {rows.map((operation) => (
          <article key={operation.id} className="rounded-md border border-border bg-background/50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="num text-xs text-muted-foreground">{fmtDate(operation.date)}</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="num font-medium text-foreground">{operation.asset}</span>
                  <span
                    className={cn(
                      "inline-flex rounded-sm px-2 py-1 text-[10px] font-medium",
                      operationClasses[operation.type],
                    )}
                  >
                    {operation.type}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">{operation.assetType}</div>
              </div>
              <span
                className={`inline-flex rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${statusClasses[operation.status]}`}
              >
                {operation.status}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Cantidad
                </div>
                <div className="num mt-0.5 font-medium">
                  {operation.quantity.toLocaleString("es-AR")}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Precio
                </div>
                <div className="num mt-0.5 font-medium">{fmtMoney(operation.price)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Monto
                </div>
                <div className="num mt-0.5 font-medium">{fmtMoney(operation.amount)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Comisión
                </div>
                <div className="num mt-0.5 font-medium">{fmtMoney(operation.commission)}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  TC
                </div>
                <div className="num mt-0.5 font-medium">
                  {operation.isPeso && operation.mepFxRate
                    ? operation.mepFxRate.toLocaleString("es-AR", { maximumFractionDigits: 2 })
                    : "-"}
                </div>
              </div>
            </div>

            {showActions && (
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="h-8 flex-1" onClick={() => onEdit?.(operation)}>
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 flex-1 text-destructive hover:text-destructive"
                  onClick={() => onDelete?.(operation)}
                >
                  Borrar
                </Button>
              </div>
            )}
          </article>
        ))}

        {rows.length === 0 && (
          <div className="rounded-md border border-dashed border-border/70 bg-background/30 px-4 py-10 text-center text-xs text-muted-foreground">
            No hay operaciones registradas para este cliente.
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1120px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Instrumento</th>
              <th className="px-4 py-2 font-medium">Operación</th>
              <th className="px-4 py-2 text-right font-medium">Cantidad</th>
              <th className="px-4 py-2 text-right font-medium">Precio</th>
              <th className="px-4 py-2 text-right font-medium">Monto</th>
              <th className="px-4 py-2 text-right font-medium">Comisión</th>
              <th className="px-4 py-2 text-right font-medium">TC</th>
              <th className="px-4 py-2 text-right font-medium">Estado</th>
              {showActions && <th className="px-4 py-2 text-right font-medium">Acciones</th>}
            </tr>
          </thead>

          <tbody>
            {rows.map((operation) => {
              return (
                <tr
                  key={operation.id}
                  className="border-b border-border/40 hover:bg-surface-elevated"
                >
                  <td className="num px-4 py-2 text-muted-foreground">{fmtDate(operation.date)}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex rounded-sm border border-border/70 bg-background/70 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {operation.assetType}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="num font-medium text-foreground">{operation.asset}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {operation.id.slice(0, 8)}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={cn(
                        "inline-flex rounded-sm px-2 py-1 text-[10px] font-medium",
                        operationClasses[operation.type],
                      )}
                    >
                      {operation.type}
                    </span>
                  </td>
                  <td className="num px-4 py-2 text-right">
                    {operation.quantity.toLocaleString("es-AR")}
                  </td>
                  <td className="num px-4 py-2 text-right">{fmtMoney(operation.price)}</td>
                  <td className="num px-4 py-2 text-right font-medium">
                    {fmtMoney(operation.amount, { compact: true })}
                  </td>
                  <td className="num px-4 py-2 text-right">{fmtMoney(operation.commission)}</td>
                  <td className="num px-4 py-2 text-right">
                    {operation.isPeso && operation.mepFxRate
                      ? operation.mepFxRate.toLocaleString("es-AR", { maximumFractionDigits: 2 })
                      : "-"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className={`inline-flex rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${statusClasses[operation.status]}`}
                    >
                      {operation.status}
                    </span>
                  </td>
                  {showActions && (
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onEdit?.(operation)}>
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={() => onDelete?.(operation)}
                        >
                          Borrar
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={showActions ? 11 : 10} className="px-4 py-10 text-center text-xs text-muted-foreground">
                  No hay operaciones registradas para este cliente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <Button variant="outline" size="sm" onClick={onViewAll}>
          {isExpanded ? "Ver recientes" : "Ver todas"}
        </Button>
      )}
    </div>
  );
}
