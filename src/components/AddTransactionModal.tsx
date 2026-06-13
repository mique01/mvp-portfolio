import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createClientTransaction } from "@/lib/server/crm-server-functions";

export function AddTransactionModal({
  open,
  onOpenChange,
  clientId,
  dataMode,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  dataMode: "database" | "seed";
}) {
  const router = useRouter();
  const [type, setType] = useState("Compra");
  const [assetType, setAssetType] = useState("Bono");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Nueva operación</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();

            if (dataMode !== "database") {
              toast.error("Modo demo activo", {
                description: "Configura una base Postgres para guardar operaciones reales.",
              });
              return;
            }

            const formData = new FormData(e.currentTarget);

            setIsSubmitting(true);
            try {
              await createClientTransaction({
                data: {
                  clientId,
                  date: String(formData.get("date")),
                  type: type as "Compra" | "Venta" | "Suscripción" | "Rescate",
                  asset: String(formData.get("asset")),
                  assetType: assetType as "Bono" | "Acción" | "CEDEAR" | "Fondo" | "ON" | "Letra",
                  quantity: Number(formData.get("qty")),
                  price: Number(formData.get("price")),
                  commission: Number(formData.get("comm") || 0),
                  currentPrice: Number(formData.get("currentPrice") || 0) || undefined,
                },
              });
              await router.invalidate();
              toast.success("Operación registrada", {
                description: "La operación se agregó al portfolio del cliente.",
              });
              onOpenChange(false);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "No se pudo guardar la operación.";
              toast.error("Error al registrar", { description: message });
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="space-y-4 pt-2"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Compra">Compra</SelectItem>
                  <SelectItem value="Venta">Venta</SelectItem>
                  <SelectItem value="Suscripción">Suscripción</SelectItem>
                  <SelectItem value="Rescate">Rescate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Clase de activo</Label>
              <Select value={assetType} onValueChange={setAssetType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bono">Bono</SelectItem>
                  <SelectItem value="Acción">Acción</SelectItem>
                  <SelectItem value="CEDEAR">CEDEAR</SelectItem>
                  <SelectItem value="ON">ON</SelectItem>
                  <SelectItem value="Letra">Letra</SelectItem>
                  <SelectItem value="Fondo">Fondo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset">Activo</Label>
            <Input id="asset" name="asset" placeholder="Ej: AL30" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qty">Cantidad</Label>
              <Input id="qty" name="qty" type="number" min={0} step="any" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Precio</Label>
              <Input id="price" name="price" type="number" min={0} step="any" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentPrice">Precio actual (opcional)</Label>
            <Input id="currentPrice" name="currentPrice" type="number" min={0} step="any" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comm">Comisión</Label>
            <Input id="comm" name="comm" type="number" min={0} step="any" defaultValue={0} />
          </div>
          {dataMode !== "database" && (
            <p className="text-xs text-muted-foreground">
              Estás viendo datos demo. Para guardar operaciones reales necesitás una base Postgres.
            </p>
          )}
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
              {isSubmitting ? "Guardando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
