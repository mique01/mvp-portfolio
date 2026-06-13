import { useMemo, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { LoaderCircle, UploadCloud } from "lucide-react";
import { toast } from "sonner";
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
import { createImportBatchAction } from "@/lib/server/crm-server-functions";
import type { ClientSummary, CustodianRecord, ImportsPageBundle } from "@/lib/wealth-types";

type Props = Pick<ImportsPageBundle, "clients" | "custodians" | "accounts">;

async function toBase64(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function ImportUploadPanel({ clients, custodians, accounts }: Props) {
  const navigate = useNavigate();
  const router = useRouter();
  const [clientId, setClientId] = useState(clients[0]?.client.id ?? "");
  const [accountId, setAccountId] = useState<string>("__new__");
  const [custodianId, setCustodianId] = useState<string>(custodians[0]?.id ?? "");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const availableAccounts = useMemo(
    () => accounts.filter((account) => account.clientId === clientId),
    [accounts, clientId],
  );
  const selectedClient = clients.find((item) => item.client.id === clientId) as ClientSummary | undefined;

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const file = formData.get("file");

        if (!(file instanceof File) || !file.size) {
          toast.error("Archivo requerido", { description: "Selecciona un archivo para importar." });
          return;
        }
        if (!clientId) {
          toast.error("Cliente requerido", { description: "Selecciona un cliente antes de subir." });
          return;
        }

        setIsUploading(true);
        try {
          const batch = await createImportBatchAction({
            data: {
              clientId,
              accountId: accountId !== "__new__" ? accountId : undefined,
              custodianId: accountId === "__new__" ? custodianId || undefined : undefined,
              accountName: accountId === "__new__" ? accountName || undefined : undefined,
              accountNumber: accountId === "__new__" ? accountNumber || undefined : undefined,
              filename: file.name,
              fileType: file.name.split(".").pop()?.toUpperCase() ?? "FILE",
              mimeType: file.type || undefined,
              contentBase64: await toBase64(file),
            },
          });
          await router.invalidate();
          toast.success("Archivo procesado", {
            description: `${batch.detectedCustodian ?? "Origen"} · ${batch.reportKind}`,
          });
          void navigate({ to: "/imports/$importId", params: { importId: batch.id } });
        } catch (error) {
          toast.error("No se pudo procesar el archivo", {
            description: error instanceof Error ? error.message : "Error inesperado.",
          });
        } finally {
          setIsUploading(false);
        }
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Cliente</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((item) => (
                <SelectItem key={item.client.id} value={item.client.id}>
                  {item.client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedClient ? (
            <p className="text-xs text-muted-foreground">
              {selectedClient.custodians.length} custodios · {selectedClient.holdingsCount} tenencias
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Cuenta destino</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Elegir cuenta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__new__">Crear cuenta al importar</SelectItem>
              {availableAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.custodianName} · {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {accountId === "__new__" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Custodio manual</Label>
            <Select value={custodianId} onValueChange={setCustodianId}>
              <SelectTrigger>
                <SelectValue placeholder="Elegir custodio" />
              </SelectTrigger>
              <SelectContent>
                {custodians.map((custodian) => (
                  <SelectItem key={custodian.id} value={custodian.id}>
                    {custodian.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nombre de cuenta</Label>
            <Input value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="Ej: Cuenta Allaria 931931" />
          </div>
          <div className="space-y-2">
            <Label>Numero de cuenta</Label>
            <Input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="931931 / 415326" />
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-dashed border-border bg-secondary/35 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-background p-2 text-primary">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="font-medium text-foreground">Subir PDF, CSV, XLS o XLSX</p>
              <p className="text-sm text-muted-foreground">
                El sistema detecta Allaria o Cocos, arma una preview editable y recién después permite confirmar.
              </p>
            </div>
            <Input name="file" type="file" accept=".pdf,.csv,.xls,.xlsx" />
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full md:w-auto" disabled={isUploading}>
        {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
        {isUploading ? "Procesando..." : "Procesar import"}
      </Button>
    </form>
  );
}
