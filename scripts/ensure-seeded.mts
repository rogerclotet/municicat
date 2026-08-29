/**
 * Seeds municipalities only when the table is empty. Safe to run on every
 * container start — skips once data is present so restarts stay fast.
 *
 * Run with `pnpm db:ensure-seed`. For a full refresh, use `pnpm db:seed`.
 */
import "./load-env.mts";
import { spawnSync } from "node:child_process";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { municipalities } from "@/db/schema";

const [{ count }] = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(municipalities);

if (count > 0) {
  console.log(`Database already has ${count} municipalities; skipping seed.`);
  process.exit(0);
}

console.log("No municipalities found; running seed…");
const result = spawnSync("pnpm", ["db:seed"], { stdio: "inherit" });
process.exit(result.status ?? 1);
