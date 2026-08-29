/**
 * Applies pending Drizzle migrations. Run with `pnpm db:migrate`.
 */
import "./load-env.mts";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "@/db";

await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations applied.");
process.exit(0);
