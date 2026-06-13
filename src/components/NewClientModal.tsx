import { useState } from "react";
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
import { createClientAction } from "@/lib/server/crm-server-functions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewClientModal({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<
    "INSTITUTIONAL" | "PRIVATE" | "FAMILY_OFFICE" | "CORPORATE" | "OTHER"
  >("INSTITUTIONAL");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Nuevo cliente</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4 pt-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const name = String(formData.get("name") ?? "").trim();
            const legalName = String(formData.get("legalName") ?? "").trim();
            const email = String(formData.get("email") ?? "").trim();
            const phone = String(formData.get("phone") ?? "").trim();
            const taxId = String(formData.get("taxId") ?? "").trim();

            if (!name) {
              toast.error("Nombre requerido", { description: "Ingresa el nombre del cliente." });
              return;
            }

            setIsSubmitting(true);
            try {
              await createClientAction({
                data: {
                  name,
                  type,
                  legalName: legalName || undefined,
                  email,
                  phone: phone || undefined,
                  taxId: taxId || undefined,
                },
              });
              await router.invalidate();
              toast.success("Cliente creado", {
                description: "Ya aparece en la base y puede recibir imports.",
              });
              onOpenChange(false);
            } catch (error) {
              toast.error("No se pudo crear el cliente", {
                description: error instanceof Error ? error.message : "Error inesperado.",
              });
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nombre visible</Label>
            <Input id="name" name="name" placeholder="Ej: Fundacion Sur" required />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="legalName">Razon social / nombre legal</Label>
              <Input id="legalName" name="legalName" placeholder="Ej: Fundacion Sur para el Desarrollo" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de cliente</Label>
              <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSTITUTIONAL">Institucional</SelectItem>
                  <SelectItem value="PRIVATE">Privado</SelectItem>
                  <SelectItem value="FAMILY_OFFICE">Family office</SelectItem>
                  <SelectItem value="CORPORATE">Corporativo</SelectItem>
                  <SelectItem value="OTHER">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="cliente@empresa.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input id="phone" name="phone" placeholder="+54 11 5555 0000" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxId">CUIT / identificacion fiscal</Label>
            <Input id="taxId" name="taxId" placeholder="30-00000000-0" />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Crear cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
