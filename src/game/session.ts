import "server-only";
import { cookies } from "next/headers";

const PROGRESS_COOKIE = "municicat_progress";
const PLAYER_COOKIE = "municicat_player";

/** Bounds the cookie so a player mashing guesses cannot grow the request headers. */
const MAX_GUESSES = 100;

const YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Today's guesses, held server-side in an httpOnly cookie.
 *
 * Keeping the run on the server rather than in `localStorage` means the guess count
 * reported to the leaderboard is one the player cannot edit, and it lets the page render
 * an in-progress run on first paint with no client round-trip.
 */
export type Progress = {
  puzzleDate: string;
  guessIds: string[];
};

type StoredProgress = { d: string; g: string[] };

function isStoredProgress(value: unknown): value is StoredProgress {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.d === "string" &&
    Array.isArray(candidate.g) &&
    candidate.g.every((id) => typeof id === "string")
  );
}

export async function readProgress(puzzleDate: string): Promise<Progress> {
  const raw = (await cookies()).get(PROGRESS_COOKIE)?.value;
  if (!raw) return { puzzleDate, guessIds: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // A malformed cookie is indistinguishable from no cookie as far as the player cares.
    return { puzzleDate, guessIds: [] };
  }

  // Yesterday's run must not leak into today's board.
  if (!isStoredProgress(parsed) || parsed.d !== puzzleDate) {
    return { puzzleDate, guessIds: [] };
  }
  return { puzzleDate, guessIds: parsed.g.slice(0, MAX_GUESSES) };
}

export async function writeProgress(progress: Progress): Promise<void> {
  const stored: StoredProgress = {
    d: progress.puzzleDate,
    g: progress.guessIds.slice(0, MAX_GUESSES),
  };
  (await cookies()).set(PROGRESS_COOKIE, JSON.stringify(stored), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: YEAR_SECONDS,
  });
}

export function guessLimitReached(progress: Progress): boolean {
  return progress.guessIds.length >= MAX_GUESSES;
}

/**
 * A stable anonymous id so one browser counts once per day in the distribution.
 * It identifies nothing but the browser and is never shown or shared.
 */
export async function getOrCreatePlayerId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(PLAYER_COOKIE)?.value;
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;

  const playerId = crypto.randomUUID();
  store.set(PLAYER_COOKIE, playerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: YEAR_SECONDS,
  });
  return playerId;
}
