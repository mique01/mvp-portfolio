import { getClientDetail } from "@/lib/server/wealth-repository";

export async function createOperacion() {
  throw new Error("El flujo legacy de operaciones fue reemplazado por imports multi-custodio.");
}

export async function listOperacionesByCliente(clienteId: string) {
  const detail = await getClientDetail(clienteId);
  return {
    operaciones:
      detail?.movements.map((movement) => ({
        id: movement.id,
        clienteId: movement.clientId,
        tipo: movement.movementType,
        activo: movement.symbol ?? "",
        cantidad: movement.quantity ?? 0,
        precio: movement.price ?? 0,
        fecha: movement.tradeDate,
        createdAt: movement.tradeDate,
        updatedAt: movement.tradeDate,
      })) ?? [],
    posiciones:
      detail?.holdings.map((holding) => ({
        activo: holding.symbol,
        cantidad: holding.quantity,
        precioPromedio: holding.averageCost ?? 0,
      })) ?? [],
  };
}
