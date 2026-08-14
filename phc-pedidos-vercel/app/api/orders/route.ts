import { desc, gte, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { orderItems, orders } from "../../../db/schema";
import { productById } from "../../../lib/catalog";

export const dynamic = "force-dynamic";

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function orderCode() {
  const now = new Date();
  const date = now.toISOString().slice(2, 10).replaceAll("-", "");
  const time = now.getTime().toString(36).slice(-5).toUpperCase();
  return `${date}-${time}`;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const db = await getDb();
    const rows = await db
      .select()
      .from(orders)
      .where(from ? gte(orders.createdAt, from) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(500);

    const ids = rows.map((order) => order.id);
    const selectedItems = ids.length
      ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids))
      : [];

    return Response.json({
      orders: rows.map((order) => ({
        ...order,
        items: selectedItems.filter((item) => item.orderId === order.id),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar os pedidos.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      customerName?: string;
      attendant?: string;
      paymentMethod?: string;
      amountReceived?: number | null;
      notes?: string;
      items?: Array<{ productId: string; quantity: number; productName?: string; category?: string; unitPrice?: number }>;
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
      if (quantity < 1) throw new Error("Existe um produto inválido no pedido.");
      if (!product) {
        const productName = item.productName?.trim().slice(0, 80);
        const unitPrice = money(Number(item.unitPrice));
        if (!item.productId.startsWith("extra-") || !productName || !Number.isFinite(unitPrice) || unitPrice <= 0) {
          throw new Error("Existe um extra inválido no pedido.");
        }
        return {
          productId: item.productId,
          productName,
          category: "Extras",
          unitPrice,
          quantity,
          lineTotal: money(unitPrice * quantity),
        };
      }
      return {
        productId: product.id,
        productName: product.name,
        category: product.category,
        unitPrice: product.price,
        quantity,
        lineTotal: money(product.price * quantity),
      };
    });

    const total = money(normalized.reduce((sum, item) => sum + item.lineTotal, 0));
    const amountReceived = payload.amountReceived == null ? null : money(Number(payload.amountReceived));
    if (paymentMethod === "Dinheiro" && amountReceived !== null && amountReceived < total) {
      return Response.json({ error: "O valor recebido é menor que o total do pedido." }, { status: 400 });
    }

    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const order = {
      id,
      orderNumber: orderCode(),
      customerName: payload.customerName?.trim() || "Balcão",
      attendant,
      paymentMethod,
      amountReceived,
      total,
      status: "received",
      notes: payload.notes?.trim() || "",
      updatedBy: attendant,
      cancelReason: null,
      cancelledBy: null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(orders).values(order);
    await db.insert(orderItems).values(
      normalized.map(({ productId, productName, category, unitPrice, quantity, lineTotal }) => ({
        id: crypto.randomUUID(),
        orderId: id,
        productId,
        productName,
        category,
        quantity,
        unitPrice,
        lineTotal,
      })),
    );

    return Response.json({ order }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível registrar o pedido.";
    return Response.json({ error: message }, { status: 500 });
  }
}
