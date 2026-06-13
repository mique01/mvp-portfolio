import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createCliente, listClientes } from "@/lib/server/services/clientes-service";

const createClienteSchema = z.object({
  id: z.string().min(1).optional(),
  nombre: z.string().min(1, "nombre es obligatorio"),
  comitente: z.string().min(1, "comitente es obligatorio"),
});

function toApiError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Body invalido", issues: error.issues.map((issue) => issue.message) },
      { status: 400 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ error: "El comitente ya existe." }, { status: 409 });
  }

  return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
}

export async function GET() {
  try {
    const clientes = await listClientes();
    return NextResponse.json(clientes, { status: 200 });
  } catch (error) {
    return toApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const input = createClienteSchema.parse(payload);

    const cliente = await createCliente(input);
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    return toApiError(error);
  }
}
