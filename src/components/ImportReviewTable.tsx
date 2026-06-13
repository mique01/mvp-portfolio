import { useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { CheckCircle2, LoaderCircle, Save, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  confirmImportBatchAction,
  saveImportRowsAction,
} from "@/lib/server/crm-server-functions";
import type { ImportBatchDetail, ImportRowPreview } from "@/lib/wealth-types";

type EditableRow = ImportRowPreview;

const assetClassOptions = [
  "CASH",
  "SOVEREIGN_BOND",
  "CORPORATE_BOND",
  "LETTER",
  "FUND",
  "CEDEAR",
  "EQUITY",
  "ETF",
  "OPTION",
  "FUTURE",
  "FIXED_TERM",
  "CAUCION",
  "OTHER",
] as const;

const movementTypeOptions = [
  "",
  "BUY",
  "SELL",
  "FUND_SUBSCRIPTION",
  "FUND_REDEMPTION",
  "DIVIDEND",
  "COUPON",
  "AMORTIZATION",
  "DEPOSIT",
  "WITHDRAWAL",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "FEE",
  "TAX",
  "CASH_BLOCK",
  "CASH_RELEASE",
  "OTHER",
] as const;

const stateOptions = ["READY", "NEEDS_REVIEW", "IGNORED", "ERROR"] as const;
const matchOptions = ["MATCHED", "AMBIGUOUS", "NEW_ASSET", "IGNORED"] as const;

export function ImportReviewTable({ batch }: { batch: ImportBatchDetail }) {
  const router = useRouter();
  const [rows, setRows] = useState<EditableRow[]>(batch.rows);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const pendingCount = useMemo(
    () => rows.filter((row) => row.state !== "READY" || row.matchStatus !== "MATCHED").length,
    [rows],
  );

  function updateRow(id: string, patch: Partial<EditableRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function saveRows(shouldToast = true) {
    setIsSaving(true);
    try {
      await saveImportRowsAction({
        data: {
          importId: batch.id,
          rows: rows.map((row) => ({
            id: row.id,
            state: row.state,
            matchStatus: row.matchStatus,
            symbol: row.symbol,
            description: row.description,
            assetClass: row.assetClass,
            movementType: row.movementType,
            quantity: row.quantity,
            availableQuantity: row.availableQuantity,
            pledgedQuantity: row.pledgedQuantity,
            price: row.price,
            averageCost: row.averageCost,
            fxRate: row.fxRate,
            marketValue: row.marketValue,
            currency: row.currency,
            tradeDate: row.tradeDate,
            settlementDate: row.settlementDate,
            notes: row.notes,
          })),
        },
      });
      await router.invalidate();
      if (shouldToast) {
        toast.success("Preview guardada", {
          description: "La revisión quedó persistida antes de confirmar.",
        });
      }
    } catch (error) {
      if (shouldToast) {
        toast.error("No se pudo guardar", {
          description: error instanceof Error ? error.message : "Error inesperado.",
        });
      }
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmBatch() {
    setIsConfirming(true);
    try {
      await saveRows(false);
      await confirmImportBatchAction({ data: { importId: batch.id } });
      await router.invalidate();
      toast.success("Importación confirmada", {
        description: "Las filas listas ya impactaron holdings o movimientos.",
      });
    } catch (error) {
      toast.error("No se pudo confirmar", {
        description: error instanceof Error ? error.message : "Error inesperado.",
      });
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/35 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {batch.detectedCustodian ?? "Origen no detectado"} · {batch.reportKind}
          </p>
          <p className="text-sm text-muted-foreground">
            {batch.filename} · {batch.rowCount} filas · {pendingCount} filas necesitan revisión o matching manual
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={saveRows} disabled={isSaving || isConfirming}>
            {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar revisión
          </Button>
          <Button onClick={confirmBatch} disabled={isSaving || isConfirming}>
            {isConfirming ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Confirmar import
          </Button>
        </div>
      </div>

      {batch.warnings.length ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <ShieldAlert className="h-4 w-4" />
            Advertencias del parser
          </div>
          <ul className="space-y-1 text-muted-foreground">
            {batch.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="min-w-[1480px] w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-3 py-3">Fila</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3">Matching</th>
              <th className="px-3 py-3">Activo</th>
              <th className="px-3 py-3">Descripcion</th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">Movimiento</th>
              <th className="px-3 py-3 text-right">Cantidad</th>
              <th className="px-3 py-3 text-right">Precio</th>
              <th className="px-3 py-3 text-right">PPC</th>
              <th className="px-3 py-3 text-right">TC</th>
              <th className="px-3 py-3 text-right">Valuacion</th>
              <th className="px-3 py-3">Moneda</th>
              <th className="px-3 py-3">Fecha</th>
              <th className="px-3 py-3">Notas</th>
              <th className="px-3 py-3">Ignorar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 align-top last:border-b-0">
                <td className="px-3 py-3 text-muted-foreground">{row.rowIndex + 1}</td>
                <td className="px-3 py-3">
                  <Select value={row.state} onValueChange={(value) => updateRow(row.id, { state: value as EditableRow["state"] })}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stateOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-3">
                  <Select value={row.matchStatus} onValueChange={(value) => updateRow(row.id, { matchStatus: value as EditableRow["matchStatus"] })}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {matchOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-3">
                  <Input value={row.symbol} onChange={(event) => updateRow(row.id, { symbol: event.target.value.toUpperCase() })} className="w-[120px]" />
                </td>
                <td className="px-3 py-3">
                  <Input value={row.description} onChange={(event) => updateRow(row.id, { description: event.target.value })} className="w-[260px]" />
                </td>
                <td className="px-3 py-3">
                  <Select value={row.assetClass} onValueChange={(value) => updateRow(row.id, { assetClass: value as EditableRow["assetClass"] })}>
                    <SelectTrigger className="w-[170px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assetClassOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-3">
                  <Select value={row.movementType} onValueChange={(value) => updateRow(row.id, { movementType: value as EditableRow["movementType"] })}>
                    <SelectTrigger className="w-[170px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {movementTypeOptions.map((option) => (
                        <SelectItem key={option || "__empty"} value={option}>
                          {option || "Sin movimiento"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-3">
                  <NumericInput value={row.quantity} onChange={(value) => updateRow(row.id, { quantity: value, availableQuantity: value })} />
                </td>
                <td className="px-3 py-3">
                  <NumericInput value={row.price} onChange={(value) => updateRow(row.id, { price: value })} />
                </td>
                <td className="px-3 py-3">
                  <NumericInput value={row.averageCost} onChange={(value) => updateRow(row.id, { averageCost: value })} />
                </td>
                <td className="px-3 py-3">
                  <NumericInput value={row.fxRate} onChange={(value) => updateRow(row.id, { fxRate: value })} />
                </td>
                <td className="px-3 py-3">
                  <NumericInput value={row.marketValue} onChange={(value) => updateRow(row.id, { marketValue: value })} />
                </td>
                <td className="px-3 py-3">
                  <Input value={row.currency} onChange={(event) => updateRow(row.id, { currency: event.target.value.toUpperCase() })} className="w-[96px]" />
                </td>
                <td className="px-3 py-3">
                  <Input value={row.tradeDate ?? row.reportDate ?? ""} onChange={(event) => updateRow(row.id, { tradeDate: event.target.value })} className="w-[130px]" placeholder="YYYY-MM-DD" />
                </td>
                <td className="px-3 py-3">
                  <Input value={row.notes} onChange={(event) => updateRow(row.id, { notes: event.target.value })} className="w-[220px]" />
                </td>
                <td className="px-3 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => updateRow(row.id, { state: "IGNORED", matchStatus: "IGNORED" })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NumericInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <Input
      value={value ?? ""}
      onChange={(event) => {
        const raw = event.target.value.trim();
        if (!raw) {
          onChange(null);
          return;
        }
        const next = Number(raw.replace(/,/g, "."));
        onChange(Number.isFinite(next) ? next : null);
      }}
      className="w-[120px] text-right"
    />
  );
}
