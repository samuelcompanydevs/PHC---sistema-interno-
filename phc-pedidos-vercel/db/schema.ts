import { doublePrecision, integer, pgTable, text } from "drizzle-orm/pg-core";

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull().default("Balcão"),
  attendant: text("attendant").notNull(),
  paymentMethod: text("payment_method").notNull(),
  amountReceived: doublePrecision("amount_received"),
  total: doublePrecision("total").notNull(),
  status: text("status").notNull().default("received"),
  notes: text("notes").notNull().default(""),
  updatedBy: text("updated_by"),
  cancelReason: text("cancel_reason"),
  cancelledBy: text("cancelled_by"),
  cancelledAt: text("cancelled_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  category: text("category").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  lineTotal: doublePrecision("line_total").notNull(),
});
