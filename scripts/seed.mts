/**
 * Loads `data/municipalities.json` into Postgres. Idempotent: re-running after a
 * `pnpm data:fetch` updates changed rows in place rather than duplicating them.
 *
 * Run with `pnpm db:seed`.
 */
import "./load-env.mts";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { Municipality } from "@/data/municipality";
import { db } from "@/db";
import { municipalities } from "@/db/schema";

const INPUT = path.join(import.meta.dirname, "..", "data", "municipalities.json");
/** postgres.js caps a statement at 65535 parameters; 18 columns leaves ample headroom. */
const BATCH_SIZE = 200;

const rows: Municipality[] = JSON.parse(await readFile(INPUT, "utf8"));
if (rows.length === 0) throw new Error(`${INPUT} is empty — run \`pnpm data:fetch\` first.`);

for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
  const batch = rows.slice(offset, offset + BATCH_SIZE);
  await db
    .insert(municipalities)
    .values(batch)
    .onConflictDoUpdate({
      target: municipalities.id,
      set: {
        name: sql`excluded.name`,
        sortName: sql`excluded.sort_name`,
        searchName: sql`excluded.search_name`,
        slug: sql`excluded.slug`,
        comarca: sql`excluded.comarca`,
        province: sql`excluded.province`,
        capital: sql`excluded.capital`,
        population: sql`excluded.population`,
        areaKm2: sql`excluded.area_km2`,
        elevationM: sql`excluded.elevation_m`,
        latitude: sql`excluded.latitude`,
        longitude: sql`excluded.longitude`,
        imageUrl: sql`excluded.image_url`,
        coatOfArmsUrl: sql`excluded.coat_of_arms_url`,
        flagUrl: sql`excluded.flag_url`,
        mapUrl: sql`excluded.map_url`,
        wikipediaUrl: sql`excluded.wikipedia_url`,
      },
    });
}

const [{ count }] = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(municipalities);
console.log(`Seeded ${rows.length} municipalities; table now holds ${count}.`);
process.exit(0);
