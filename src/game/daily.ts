/** Timezone whose midnight rolls the puzzle over. */
const PUZZLE_TIMEZONE = "Europe/Madrid";

/** First puzzle day. Changing this reshuffles which municipality falls on which date. */
const PUZZLE_EPOCH = "2026-01-01";

/** Fixed seed ("muni" in ASCII) so the permutation is identical on every deploy. */
const SHUFFLE_SEED = 0x6d756e69;

const MS_PER_DAY = 86_400_000;

/** Today's puzzle date as `YYYY-MM-DD`, rolled over at midnight in Catalonia. */
export function currentPuzzleDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PUZZLE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Renders a puzzle date for display, e.g. "diumenge, 30 d'agost de 2026". */
export function formatPuzzleDate(puzzleDate: string): string {
  return new Intl.DateTimeFormat("ca-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${puzzleDate}T00:00:00Z`));
}

function daysSinceEpoch(puzzleDate: string): number {
  const day = Date.parse(`${puzzleDate}T00:00:00Z`);
  if (Number.isNaN(day)) throw new Error(`Invalid puzzle date: ${puzzleDate}`);
  return Math.round((day - Date.parse(`${PUZZLE_EPOCH}T00:00:00Z`)) / MS_PER_DAY);
}

/** Small, fast, fully deterministic PRNG — no platform-dependent behaviour. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One fixed permutation of the municipalities, walked one entry per day. Using a
 * permutation rather than hashing the date means no municipality repeats until all
 * 947 have been played — about two and a half years.
 */
function shuffled(ids: readonly string[]): string[] {
  const order = [...ids].sort();
  const random = mulberry32(SHUFFLE_SEED);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * The municipality id for a given puzzle date. Pure in `(puzzleDate, ids)`, so every
 * player worldwide resolves the same answer without consulting a server.
 */
export function dailyMunicipalityId(puzzleDate: string, ids: readonly string[]): string {
  if (ids.length === 0) throw new Error("No municipalities to pick from");
  const order = shuffled(ids);
  // Modulo of a possibly negative day offset, kept in range for dates before the epoch.
  const index = ((daysSinceEpoch(puzzleDate) % order.length) + order.length) % order.length;
  return order[index];
}

/** Milliseconds until the next puzzle, for the countdown shown after solving. */
export function msUntilNextPuzzle(now: Date = new Date()): number {
  const tomorrow = daysSinceEpoch(currentPuzzleDate(now)) + 1;
  const epochUtc = Date.parse(`${PUZZLE_EPOCH}T00:00:00Z`);
  const nextMidnightUtcNaive = epochUtc + tomorrow * MS_PER_DAY;
  // The naive value is midnight *UTC*; shift it by Catalonia's offset on that day.
  const offsetMs = madridOffsetMs(new Date(nextMidnightUtcNaive));
  return nextMidnightUtcNaive - offsetMs - now.getTime();
}

/** Catalonia's UTC offset at a given instant, accounting for summer time. */
function madridOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PUZZLE_TIMEZONE,
    timeZoneName: "longOffset",
  }).formatToParts(at);
  const name = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 3_600_000 + Number(match[3]) * 60_000);
}
