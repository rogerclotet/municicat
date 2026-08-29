import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add a Postgres connection string to .env.local.",
    );
  }
  return url;
}

/**
 * Next's dev server re-evaluates modules on every edit, which would leak a new
 * connection pool each time without this handle.
 */
const globalForDb = globalThis as unknown as { municicatSql?: postgres.Sql };

const sql = globalForDb.municicatSql ?? postgres(connectionString(), { max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.municicatSql = sql;

export const db = drizzle(sql, { schema });
