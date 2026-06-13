import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createOperacion, listOperacionesByCliente } from "@/lib/server/services/operaciones-service";

const createOperacionSchema = z.object({
  clienteId: z.string().min(1, "clienteId es obligatorio"),
  tipo: z.enum(["compra", "venta", "suscripcion", "rescate"]),
  activo: z.string().min(1, "activo es obligatorio"),
  cantidad: z.number().positive("cantidad debe ser mayor a 0"),
  precio: z.number().positive("precio debe ser mayor a 0"),
  fecha: z.coerce.date(),
});

function toApiError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Body invalido", issues: error.issues.map((issue) => issue.message) },
      { status: 400 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    return NextResponse.json({ error: "El cliente no existe." }, { status: 404 });
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clienteId = url.searchParams.get("clienteId");

    if (!clienteId) {
      return NextResponse.json({ error: "clienteId es obligatorio en query string." }, { status: 400 });
    }

    const result = await listOperacionesByCliente(clienteId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const input = createOperacionSchema.parse(payload);

    const operacion = await createOperacion(input);
    return NextResponse.json(operacion, { status: 201 });
  } catch (error) {
    return toApiError(error);
  }
}
