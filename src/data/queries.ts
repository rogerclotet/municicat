import "server-only";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyResults, municipalities } from "@/db/schema";
import { dailyMunicipalityId } from "@/game/daily";
import { MAX_BUCKET, type Histogram } from "@/game/histogram";
import type { Municipality } from "./municipality";
import { searchKeys, toSearchName } from "./normalize";

/**
 * The municipality table only changes when the ingestion script is re-run, so the
 * lookup index is held in process rather than re-read on every guess. A short TTL
 * means a re-seed is picked up without a redeploy.
 */
const INDEX_TTL_MS = 10 * 60 * 1000;

type MunicipalityIndex = {
  ids: string[];
  /** Ids with a coat of arms or flag — a photo alone is never a fair opening clue. */
  dailyEligibleIds: string[];
  /** Display names, ordered as the autocomplete should present them. */
  names: string[];
  /** Every accepted spelling — with and without the article — mapped to an id. */
  byKey: Map<string, string>;
};

let cachedIndex: { value: MunicipalityIndex; expiresAt: number } | null = null;
let inFlight: Promise<MunicipalityIndex> | null = null;

async function loadIndex(): Promise<MunicipalityIndex> {
  const rows = await db
    .select({
      id: municipalities.id,
      name: municipalities.name,
      coatOfArmsUrl: municipalities.coatOfArmsUrl,
      flagUrl: municipalities.flagUrl,
    })
    .from(municipalities)
    .orderBy(asc(municipalities.sortName));

  if (rows.length === 0) {
    throw new Error("No municipalities in the database — run `pnpm db:seed`.");
  }

  // Full names are claimed first so that, if a municipality named `Masnou` were ever to
  // exist alongside `el Masnou`, typing the bare name could not resolve to the other one.
  const byKey = new Map<string, string>();
  for (const row of rows) byKey.set(toSearchName(row.name), row.id);
  for (const row of rows) {
    for (const key of searchKeys(row.name)) {
      if (!byKey.has(key)) byKey.set(key, row.id);
    }
  }

  return {
    ids: rows.map((row) => row.id),
    dailyEligibleIds: rows
      .filter((row) => row.coatOfArmsUrl || row.flagUrl)
      .map((row) => row.id),
    names: rows.map((row) => row.name),
    byKey,
  };
}

export async function getMunicipalityIndex(): Promise<MunicipalityIndex> {
  if (cachedIndex && cachedIndex.expiresAt > Date.now()) return cachedIndex.value;
  // Concurrent requests on a cold process should share one query, not race.
  inFlight ??= loadIndex()
    .then((value) => {
      cachedIndex = { value, expiresAt: Date.now() + INDEX_TTL_MS };
      return value;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export async function getAllMunicipalities(): Promise<Municipality[]> {
  return db.select().from(municipalities).orderBy(asc(municipalities.sortName));
}

export async function getMunicipalityById(id: string): Promise<Municipality | null> {
  const [row] = await db.select().from(municipalities).where(eq(municipalities.id, id));
  return row ?? null;
}

/**
 * Everything the game board needs in one round-trip: the autocomplete vocabulary and the
 * full rows for whatever the player has already guessed today.
 */
export async function getMunicipaliesForBoard(
  guessedIds: string[],
): Promise<{ names: string[]; byId: Map<string, Municipality> }> {
  const [{ names }, guessed] = await Promise.all([
    getMunicipalityIndex(),
    guessedIds.length === 0
      ? Promise.resolve([] as Municipality[])
      : db.select().from(municipalities).where(inArray(municipalities.id, guessedIds)),
  ]);
  return { names, byId: new Map(guessed.map((row) => [row.id, row])) };
}

/** Resolves free text typed by the player, tolerating accents and a missing article. */
export async function findMunicipalityByName(input: string): Promise<Municipality | null> {
  const { byKey } = await getMunicipalityIndex();
  for (const key of searchKeys(input)) {
    const id = byKey.get(key);
    if (id) return getMunicipalityById(id);
  }
  return null;
}

export async function getDailyMunicipality(puzzleDate: string): Promise<Municipality> {
  const { dailyEligibleIds } = await getMunicipalityIndex();
  const id = dailyMunicipalityId(puzzleDate, dailyEligibleIds);
  const municipality = await getMunicipalityById(id);
  if (!municipality) throw new Error(`Daily municipality ${id} is missing from the database`);
  return municipality;
}

export async function getHistogram(puzzleDate: string): Promise<Histogram> {
  // Grouping on the raw column and bucketing here keeps the SQL trivial; a single day
  // yields at most a few dozen distinct guess counts.
  const rows = await db
    .select({
      guessCount: dailyResults.guessCount,
      players: sql<number>`count(*)::int`,
    })
    .from(dailyResults)
    .where(eq(dailyResults.puzzleDate, puzzleDate))
    .groupBy(dailyResults.guessCount);

  const buckets = Array.from({ length: MAX_BUCKET }, (_, index) => ({
    label: index + 1 === MAX_BUCKET ? `${MAX_BUCKET}+` : String(index + 1),
    count: 0,
  }));

  let totalPlayers = 0;
  let totalGuesses = 0;
  for (const row of rows) {
    buckets[Math.min(row.guessCount, MAX_BUCKET) - 1].count += row.players;
    totalPlayers += row.players;
    totalGuesses += row.players * row.guessCount;
  }

  return {
    buckets,
    totalPlayers,
    meanGuesses: totalPlayers === 0 ? null : totalGuesses / totalPlayers,
  };
}
