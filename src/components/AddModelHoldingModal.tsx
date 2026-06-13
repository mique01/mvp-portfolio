import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import type { AssetType } from "@/lib/mock-data";
import { saveModelHolding } from "@/lib/server/crm-server-functions";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export function AddModelHoldingModal({
  open,
  onOpenChange,
  dataMode,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  dataMode: "database" | "seed";
}) {
  const router = useRouter();
  const [assetType, setAssetType] = useState<AssetType>("CEDEAR");
  const [isPeso, setIsPeso] = useState<"NO" | "SI">("NO");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Nuevo peso objetivo</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4 pt-2"
          onSubmit={async (event) => {
            event.preventDefault();

            if (dataMode !== "database") {
              toast.error("Modo demo activo", {
                description: "Conecta Postgres para editar la cartera modelo.",
              });
              return;
            }

            const formData = new FormData(event.currentTarget);

            setIsSubmitting(true);
            try {
              await saveModelHolding({
                data: {
                  asset: String(formData.get("asset")),
                  assetType,
                  weightPct: Number(formData.get("weightPct")),
                  currentPrice: Number(formData.get("currentPrice") || 0) || undefined,
                  isPeso: isPeso === "SI",
                },
              });
              await router.invalidate();
              toast.success("Peso guardado", {
                description: "La cartera modelo se actualizo correctamente en porcentaje.",
              });
              onOpenChange(false);
            } catch (error) {
              toast.error("No se pudo guardar", {
                description: error instanceof Error ? error.message : "Error inesperado.",
              });
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="asset">Activo</Label>
            <Input id="asset" name="asset" placeholder="Ej: SPY o AL30" required />
          </div>

          <div className="space-y-2">
            <Label>Tipo de activo</Label>
            <Select value={assetType} onValueChange={(value) => setAssetType(value as AssetType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CEDEAR">CEDEAR</SelectItem>
                <SelectItem value="Bono">Bono</SelectItem>
                <SelectItem value="Acción">Accion</SelectItem>
                <SelectItem value="ON">ON</SelectItem>
                <SelectItem value="Letra">Letra</SelectItem>
                <SelectItem value="Fondo">Fondo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weightPct">Peso objetivo (%)</Label>
            <Input
              id="weightPct"
              name="weightPct"
              type="number"
              min={0.01}
              max={100}
              step="any"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentPrice">Precio actual (opcional)</Label>
            <Input id="currentPrice" name="currentPrice" type="number" min={0} step="any" />
          </div>

          <div className="space-y-2">
            <Label>Esta en pesos?</Label>
            <Select value={isPeso} onValueChange={(value) => setIsPeso(value as "NO" | "SI")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NO">No</SelectItem>
                <SelectItem value="SI">Si</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Si esta en pesos, se convierte a USD usando dolar MEP.
            </p>
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
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
