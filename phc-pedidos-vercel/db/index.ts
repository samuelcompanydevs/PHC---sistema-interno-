import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let sqlClient: NeonQueryFunction<false, false> | null = null;
let database: NeonHttpDatabase<typeof schema> | null = null;
let schemaReady: Promise<void> | null = null;

function getSqlClient() {
  if (sqlClient) return sqlClient;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Banco online não configurado. Conecte o Neon ao projeto na Vercel para criar DATABASE_URL.");
  }
  sqlClient = neon(databaseUrl);
  return sqlClient;
}

async function ensureSchema() {
  const sql = getSqlClient();
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id text PRIMARY KEY,
      order_number text NOT NULL UNIQUE,
      customer_name text NOT NULL DEFAULT 'Balcão',
      attendant text NOT NULL,
      payment_method text NOT NULL,
      amount_received double precision,
      total double precision NOT NULL,
      status text NOT NULL DEFAULT 'received',
      notes text NOT NULL DEFAULT '',
      updated_by text,
      cancel_reason text,
      cancelled_by text,
      cancelled_at text,
      created_at text NOT NULL,
      updated_at text NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id text PRIMARY KEY,
      order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id text NOT NULL,
      product_name text NOT NULL,
      category text NOT NULL,
      quantity integer NOT NULL,
      unit_price double precision NOT NULL,
      line_total double precision NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id)`;
}

export async function getDb() {
  if (!schemaReady) schemaReady = ensureSchema();
  await schemaReady;
  if (!database) database = drizzle(getSqlClient(), { schema });
  return database;
}
