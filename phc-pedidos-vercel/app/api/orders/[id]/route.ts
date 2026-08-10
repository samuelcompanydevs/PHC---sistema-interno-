import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { orderItems, orders } from "../../../../db/schema";
import { productById } from "../../../../lib/catalog";

export const dynamic = "force-dynamic";

const allowedStatuses = new Set(["received", "preparing", "ready", "delivered", "cancelled"]);

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as {
      customerName?: string;
      attendant?: string;
      paymentMethod?: string;
      amountReceived?: number | null;
      notes?: string;
      items?: Array<{ productId: string; quantity: number }>;
    };
    const attendant = payload.attendant?.trim();
    const paymentMethod = payload.paymentMethod?.trim();
    const requestedItems = payload.items ?? [];

    if (!attendant || !paymentMethod || requestedItems.length === 0) {
      return Response.json({ error: "Atendente, pagamento e produtos são obrigatórios." }, { status: 400 });
    }

    const normalized = requestedItems.map((item) => {
      const product = productById.get(item.productId);
      const quantity = Math.max(0, Math.floor(Number(item.quantity)));
      if (!product || quantity < 1) throw new Error("Existe um produto inválido no pedido.");
      return { product, quantity, lineTotal: money(product.price * quantity) };
    });
    const total = money(normalized.reduce((sum, item) => sum + item.lineTotal, 0));
    const amountReceived = payload.amountReceived == null ? null : money(Number(payload.amountReceived));
    if (paymentMethod === "Dinheiro" && amountReceived !== null && amountReceived < total) {
      return Response.json({ error: "O valor recebido é menor que o total do pedido." }, { status: 400 });
    }

    const db = await getDb();
    const [existing] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!existing) return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
    if (existing.status === "cancelled") {
      return Response.json({ error: "Um pedido cancelado não pode ser editado." }, { status: 409 });
    }

    const now = new Date().toISOString();
    await db.update(orders).set({
      customerName: payload.customerName?.trim() || "Balcão",
      attendant,
      paymentMethod,
      amountReceived,
      total,
      notes: payload.notes?.trim() || "",
      updatedBy: attendant,
      updatedAt: now,
    }).where(eq(orders.id, id));
    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    await db.insert(orderItems).values(normalized.map(({ product, quantity, lineTotal }) => ({
      id: crypto.randomUUID(),
      orderId: id,
      productId: product.id,
      productName: product.name,
      category: product.category,
      quantity,
      unitPrice: product.price,
      lineTotal,
    })));

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível editar o pedido.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as { status?: string; cancelReason?: string; attendant?: string };
    if (!payload.status || !allowedStatuses.has(payload.status)) {
      return Response.json({ error: "Situação inválida." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const changes: Record<string, string | null> = { status: payload.status, updatedAt: now };
    if (payload.status === "cancelled") {
      const cancelReason = payload.cancelReason?.trim();
      const attendant = payload.attendant?.trim();
      if (!cancelReason || !attendant) {
        return Response.json({ error: "Informe o motivo e o atendente responsável pelo cancelamento." }, { status: 400 });
      }
      changes.cancelReason = cancelReason;
      changes.cancelledBy = attendant;
      changes.cancelledAt = now;
      changes.updatedBy = attendant;
    }

    const db = await getDb();
    await db.update(orders).set(changes).where(eq(orders.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o pedido.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as { confirm?: boolean; attendant?: string };
    if (payload.confirm !== true || !payload.attendant?.trim()) {
      return Response.json({ error: "Confirmação e atendente responsável são obrigatórios." }, { status: 400 });
    }

    const db = await getDb();
    const [existing] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, id)).limit(1);
    if (!existing) return Response.json({ error: "Pedido não encontrado." }, { status: 404 });

    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    await db.delete(orders).where(eq(orders.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível excluir o pedido.";
    return Response.json({ error: message }, { status: 500 });
  }
}
