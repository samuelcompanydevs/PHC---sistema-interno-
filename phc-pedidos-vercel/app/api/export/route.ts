import { asc, eq, gte } from "drizzle-orm";
import { getDb } from "../../../db";
import { orderItems, orders } from "../../../db/schema";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
}

function brl(value: number) {
  return value.toFixed(2).replace(".", ",");
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const from = url.searchParams.get("from") ?? "1970-01-01T00:00:00.000Z";
    const db = await getDb();
    const rows = await db.select().from(orders).where(gte(orders.createdAt, from)).orderBy(asc(orders.createdAt));
    const lines = [["Data", "Pedido", "Cliente", "Produto", "Quantidade", "Valor unitário", "Subtotal", "Pagamento", "Atendente", "Situação", "Motivo do cancelamento", "Cancelado por", "Observações"]];

    for (const order of rows) {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      for (const item of items) {
        lines.push([
          new Date(order.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
          order.orderNumber,
          order.customerName,
          item.productName,
          String(item.quantity),
          brl(item.unitPrice),
          brl(item.lineTotal),
          order.paymentMethod,
          order.attendant,
          order.status,
          order.cancelReason ?? "",
          order.cancelledBy ?? "",
          order.notes,
        ]);
      }
    }

    const csv = "\uFEFF" + lines.map((line) => line.map(csvCell).join(";")).join("\r\n");
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="phc-vendas-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível gerar a planilha.";
    return Response.json({ error: message }, { status: 500 });
  }
}
