import { createClientRecord, getClientsBundle } from "@/lib/server/wealth-repository";
import type { CreateClientInput } from "@/lib/wealth-types";

export async function createCliente(input: {
  nombre: string;
  comitente?: string;
  email?: string;
  telefono?: string;
}) {
  return createClientRecord({
    name: input.nombre,
    type: "PRIVATE",
    legalName: input.nombre,
    email: input.email,
    phone: input.telefono,
    taxId: input.comitente,
  } satisfies CreateClientInput);
}

export async function listClientes() {
  const clients = await getClientsBundle();
  return clients.map((entry) => ({
    id: entry.client.id,
    nombre: entry.client.name,
    comitente: entry.client.taxId ?? "",
    createdAt: entry.client.createdAt,
    updatedAt: entry.client.updatedAt,
  }));
}
