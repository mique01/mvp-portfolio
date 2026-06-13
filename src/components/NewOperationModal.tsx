import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  createClientTransaction,
  updateClientTransaction,
} from "@/lib/server/crm-server-functions";
import { fmtMoney } from "@/lib/portfolio";
import type { OperationRow } from "@/lib/client-profile";
import type { AssetType, TxType } from "@/lib/mock-data";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  dataMode: "database" | "seed";
  mepRate?: number | null;
  cclRate?: number | null;
  operation?: OperationRow | null;
  suggestions?: Array<{
    symbol: string;
    label: string;
    assetType: AssetType;
  }>;
};

const operationTypes: TxType[] = ["Compra", "Venta", "Suscripción", "Rescate"];
const assetTypes: AssetType[] = ["Bono", "Acción", "CEDEAR", "Fondo", "ON", "Letra"];

function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseOptionalNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function automaticCommissionRate(assetType: AssetType) {
  if (assetType === "Acción" || assetType === "CEDEAR") return 0.002;
  if (assetType === "Bono" || assetType === "ON" || assetType === "Letra") return 0.001;
  return 0;
}

function todayInBuenosAires() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatRate(value: number) {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function NewOperationModal({
  open,
  onOpenChange,
  clientId,
  dataMode,
  mepRate = null,
  cclRate = null,
  operation = null,
  suggestions = [],
}: Props) {
  const router = useRouter();
  const [type, setType] = useState<TxType>("Compra");
  const [assetType, setAssetType] = useState<AssetType>("CEDEAR");
  const [assetInput, setAssetInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [currentPriceInput, setCurrentPriceInput] = useState("");
  const [mepFxRateInput, setMepFxRateInput] = useState("");
  const [isPeso, setIsPeso] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssetMenuOpen, setIsAssetMenuOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (operation) {
      setType(operation.type);
      setAssetType(operation.assetType);
      setAssetInput(operation.asset);
      setQuantityInput(operation.quantity.toString());
      setPriceInput(operation.price.toString());
      setCurrentPriceInput("");
      setMepFxRateInput(operation.mepFxRate ? operation.mepFxRate.toString() : "");
      setIsPeso(operation.assetType === "CEDEAR" ? true : operation.isPeso);
      return;
    }

    setType("Compra");
    setAssetType("CEDEAR");
    setAssetInput("");
    setQuantityInput("");
    setPriceInput("");
    setCurrentPriceInput("");
    setMepFxRateInput("");
    setIsPeso(false);
    setIsAssetMenuOpen(false);
  }, [open, operation]);

  const isFundOperation = type === "Suscripción" || type === "Rescate" || assetType === "Fondo";
  const quantity = parsePositiveNumber(quantityInput);
  const price = parsePositiveNumber(priceInput);
  const fxRate = parseOptionalNumber(mepFxRateInput);
  const currentFxRate = assetType === "CEDEAR" ? cclRate : mepRate;
  const fxLabel = assetType === "CEDEAR" ? "CCL" : "MEP";
  const estimatedAmount = useMemo(() => quantity * price, [price, quantity]);
  const estimatedUsdAmount =
    isPeso && currentFxRate && currentFxRate > 0
      ? estimatedAmount / currentFxRate
      : estimatedAmount;
  const estimatedCommission = useMemo(
    () => estimatedAmount * automaticCommissionRate(assetType),
    [assetType, estimatedAmount],
  );
  const filteredSuggestions = useMemo(() => {
    const term = assetInput.trim().toUpperCase();
    if (!term) return suggestions.slice(0, 10);

    return suggestions
      .filter(
        (item) =>
          item.symbol.toUpperCase().includes(term) || item.label.toUpperCase().includes(term),
      )
      .slice(0, 10);
  }, [assetInput, suggestions]);
  const showAssetSuggestions =
    isAssetMenuOpen && assetInput.trim().length > 0 && filteredSuggestions.length > 0;

  const quantityLabel = isFundOperation ? "Cuotapartes" : "Cantidad";
  const priceLabel = isFundOperation ? "Valor de cuotaparte" : "Precio";
  const assetPlaceholder = isFundOperation ? "Ej: FCI Renta Mixta" : "Ej: AL30, AAPL, YPFD";
  const selectedDate = operation?.date ?? todayInBuenosAires();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {operation ? "Editar operación" : "Nueva operación"}
          </DialogTitle>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col pt-2"
          onSubmit={async (event) => {
            event.preventDefault();

            if (dataMode !== "database") {
              toast.error("Modo demo activo", {
                description: "Conecta Postgres para registrar operaciones reales.",
              });
              return;
            }

            const formData = new FormData(event.currentTarget);
            const asset = String(formData.get("asset") ?? assetInput).trim();
            const nextQuantity = Number(formData.get("quantity"));
            const nextPrice = Number(formData.get("price"));
            const date = String(formData.get("date") ?? "");
            const currentPrice = Number(formData.get("currentPrice") ?? 0);

            if (!asset) {
              toast.error("Activo requerido", { description: "Ingresa un activo válido." });
              return;
            }

            if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
              toast.error("Cantidad inválida", {
                description: "La cantidad debe ser mayor a 0.",
              });
              return;
            }

            if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
              toast.error("Precio inválido", {
                description: "El precio debe ser mayor a 0.",
              });
              return;
            }

            if (
              isPeso &&
              date !== todayInBuenosAires() &&
              !(Number(formData.get("mepFxRate") ?? 0) > 0)
            ) {
              toast.error("Tipo de cambio requerido", {
                description: `Para una operación histórica en pesos necesitas cargar el TC del momento (${fxLabel}).`,
              });
              return;
            }

            setIsSubmitting(true);
            try {
              const selectedAssetType: AssetType =
                type === "Suscripción" || type === "Rescate" ? "Fondo" : assetType;

              const payload = {
                clientId,
                type,
                asset,
                assetType: selectedAssetType,
                quantity: nextQuantity,
                price: nextPrice,
                date,
                status: "Ejecutada" as const,
                currentPrice:
                  Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : undefined,
                isPeso,
                mepFxRate:
                  isPeso && Number(formData.get("mepFxRate") ?? 0) > 0
                    ? Number(formData.get("mepFxRate"))
                    : undefined,
              };

              if (operation) {
                await updateClientTransaction({
                  data: {
                    ...payload,
                    id: operation.id,
                  },
                });
              } else {
                await createClientTransaction({ data: payload });
              }

              await router.invalidate();
              toast.success(operation ? "Operación actualizada" : "Operación registrada", {
                description: "La posición del cliente se actualizó correctamente.",
              });
              onOpenChange(false);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "No se pudo registrar la operación.";
              toast.error(operation ? "Error al actualizar" : "Error al registrar", {
                description: message,
              });
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tx-type">Operación</Label>
                <Select
                  value={type}
                  onValueChange={(value) => {
                    const nextType = value as TxType;
                    setType(nextType);
                    if (nextType === "Suscripción" || nextType === "Rescate") {
                      setAssetType("Fondo");
                      setIsPeso(false);
                    }
                  }}
                >
                  <SelectTrigger id="tx-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operationTypes.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset-type">Tipo de activo</Label>
                <Select
                  value={type === "Suscripción" || type === "Rescate" ? "Fondo" : assetType}
                  onValueChange={(value) => {
                    const nextAssetType = value as AssetType;
                    setAssetType(nextAssetType);
                    if (nextAssetType === "CEDEAR") {
                      setIsPeso(true);
                    }
                  }}
                  disabled={type === "Suscripción" || type === "Rescate"}
                >
                  <SelectTrigger id="asset-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypes.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
              {isFundOperation
                ? "Para fondos cargamos cuotapartes y valor de cuotaparte (VCP). La valuación toma la misma fuente que el panel de precios."
                : assetType === "CEDEAR"
                  ? "Para CEDEARs registramos cantidad y precio de ejecución; la conversión a USD usa CCL."
                  : "Para bonos, acciones, CEDEARs, ONs y letras registramos cantidad y precio de ejecución."}
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset">Instrumento</Label>
              <div className="relative">
                <Input
                  id="asset"
                  name="asset"
                  value={assetInput}
                  onChange={(event) => {
                    setAssetInput(event.target.value);
                    setIsAssetMenuOpen(true);
                  }}
                  placeholder={assetPlaceholder}
                  autoComplete="off"
                  onFocus={() => setIsAssetMenuOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => setIsAssetMenuOpen(false), 120);
                  }}
                  required
                />

                {showAssetSuggestions && (
                  <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover shadow-lg">
                    {filteredSuggestions.map((item) => (
                      <button
                        key={`${item.symbol}-${item.assetType}`}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-elevated"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setAssetInput(item.symbol);
                          setAssetType(item.assetType);
                          if (item.assetType === "CEDEAR") {
                            setIsPeso(true);
                          }
                          setIsAssetMenuOpen(false);
                        }}
                      >
                        <span className="font-medium text-foreground">{item.label}</span>
                        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          {item.assetType}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">{quantityLabel}</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min={0.0001}
                  step="any"
                  value={quantityInput}
                  onChange={(event) => setQuantityInput(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">{priceLabel}</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min={0.0001}
                  step="any"
                  value={priceInput}
                  onChange={(event) => setPriceInput(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input id="date" name="date" type="date" defaultValue={selectedDate} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentPrice">
                  Precio actual para cartera{" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="currentPrice"
                  name="currentPrice"
                  type="number"
                  min={0.0001}
                  step="any"
                  value={currentPriceInput}
                  onChange={(event) => setCurrentPriceInput(event.target.value)}
                  placeholder="Si no lo cargas, usamos el precio de la operación"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mepFxRate">
                  TC {fxLabel}{" "}
                  <span className="text-muted-foreground">(opcional si es de hoy)</span>
                </Label>
                <Input
                  id="mepFxRate"
                  name="mepFxRate"
                  type="number"
                  min={0.0001}
                  step="any"
                  value={mepFxRateInput}
                  onChange={(event) => setMepFxRateInput(event.target.value)}
                  placeholder={`Usá el TC histórico si la operación no fue hoy (${fxLabel})`}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Comisión automática</Label>
                <div className="rounded-md border border-border/70 bg-background/50 px-3 py-2 text-sm">
                  <div className="num font-medium text-foreground">
                    {fmtMoney(estimatedCommission)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {automaticCommissionRate(assetType) > 0
                      ? `${(automaticCommissionRate(assetType) * 100).toFixed(2)}% del monto operado`
                      : "Sin comisión automática para este tipo de activo."}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border/70 bg-background/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="is-peso" className="text-sm font-medium text-foreground">
                    ¿Está en pesos?
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Si lo activás, guardamos el tipo de cambio del momento y dolarizamos costo y
                    tenencia para la cartera.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{isPeso ? "Sí" : "No"}</span>
                  <Switch id="is-peso" checked={isPeso} onCheckedChange={setIsPeso} />
                </div>
              </div>

              {isPeso && (
                <div className="mt-3 rounded-sm border border-primary/20 bg-primary/8 px-3 py-2 text-xs text-foreground">
                  {fxRate > 0 ? (
                    <>
                      TC manual cargado ({fxLabel}):{" "}
                      <span className="num font-medium">{formatRate(fxRate)}</span>
                    </>
                  ) : currentFxRate && currentFxRate > 0 ? (
                    <>
                      Si la operación fue hoy, usamos el {fxLabel} actual:{" "}
                      <span className="num font-medium">{formatRate(currentFxRate)}</span>
                    </>
                  ) : (
                    `Si la operación no fue hoy, completá el TC ${fxLabel} para poder guardar.`
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-md border border-border/70 bg-background/40 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Monto estimado
                </div>
                <div className="num mt-2 text-xl font-semibold text-foreground">
                  {fmtMoney(estimatedAmount)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {quantity > 0 && price > 0
                    ? `${quantity.toLocaleString("es-AR", { maximumFractionDigits: 4 })} × ${price.toLocaleString(
                        "es-AR",
                        {
                          maximumFractionDigits: 4,
                        },
                      )}`
                    : "Se calcula automáticamente cuando completás cantidad y precio."}
                </div>
                {isPeso && currentFxRate && currentFxRate > 0 && quantity > 0 && price > 0 && (
                  <div className="mt-2 text-xs text-primary">
                    Equivalente dolarizado {fxLabel}: {fmtMoney(estimatedUsdAmount)}
                  </div>
                )}
              </div>

              <div className="rounded-md border border-border/70 bg-background/40 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Impacto en cartera
                </div>
                <div className="mt-2 text-sm font-medium text-foreground">
                  {type === "Compra" || type === "Suscripción"
                    ? "Incrementa o crea posición"
                    : "Reduce la posición existente"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  La tenencia se recalcula al guardar la operación.
                </div>
              </div>
            </div>

            {dataMode !== "database" && (
              <p className="text-xs text-muted-foreground">
                Estás en modo seed. Para guardar operaciones definitivas habilitá una base Postgres.
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || dataMode !== "database"}>
              {isSubmitting ? "Guardando..." : operation ? "Guardar cambios" : "Guardar operación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
