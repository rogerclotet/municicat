"use server";

import type { Municipality } from "@/data/municipality";
import {
  findMunicipalityByName,
  getDailyMunicipality,
  getHistogram,
} from "@/data/queries";
import { db } from "@/db";
import { dailyResults } from "@/db/schema";
import { type GuessComparison, compareGuess } from "@/game/compare";
import { currentPuzzleDate } from "@/game/daily";
import type { Histogram } from "@/game/histogram";
import { getOrCreatePlayerId, guessLimitReached, readProgress, writeProgress } from "@/game/session";

export type GuessResponse =
  /** The text typed does not name a Catalan municipality; it does not count as a guess. */
  | { status: "unknown"; puzzleDate: string }
  /** Already guessed; returned so the UI can point at the existing row instead of duplicating it. */
  | { status: "duplicate"; puzzleDate: string; comparison: GuessComparison }
  | { status: "limit"; puzzleDate: string }
  /** Today is already won; the UI hides the input, but a direct POST must not pad the run. */
  | { status: "solved"; puzzleDate: string }
  | {
      status: "ok";
      puzzleDate: string;
      comparison: GuessComparison;
      /** Only ever populated once the player has actually solved the puzzle. */
      answer: Municipality | null;
      histogram: Histogram | null;
    };

/**
 * Evaluates one guess. The answer stays on the server until the player names it, and the
 * guess count comes from the httpOnly progress cookie rather than from the client, so
 * neither can be forged from the browser.
 */
export async function submitGuess(input: string): Promise<GuessResponse> {
  const puzzleDate = currentPuzzleDate();
  const trimmed = input.trim();
  if (trimmed === "") return { status: "unknown", puzzleDate };

  const guess = await findMunicipalityByName(trimmed);
  if (!guess) return { status: "unknown", puzzleDate };

  const answer = await getDailyMunicipality(puzzleDate);
  const comparison = compareGuess(guess, answer);
  const progress = await readProgress(puzzleDate);

  if (progress.guessIds.includes(answer.id)) return { status: "solved", puzzleDate };
  if (progress.guessIds.includes(guess.id)) {
    return { status: "duplicate", puzzleDate, comparison };
  }
  if (guessLimitReached(progress)) return { status: "limit", puzzleDate };

  const guessIds = [...progress.guessIds, guess.id];
  await writeProgress({ puzzleDate, guessIds });

  if (!comparison.correct) {
    return { status: "ok", puzzleDate, comparison, answer: null, histogram: null };
  }

  const histogram = await recordResult(puzzleDate, guessIds.length);
  return { status: "ok", puzzleDate, comparison, answer, histogram };
}

/**
 * Files the finished run in the anonymous distribution. `ON CONFLICT DO NOTHING` keeps a
 * replayed or duplicated request from counting the same browser twice.
 */
async function recordResult(puzzleDate: string, guessCount: number): Promise<Histogram> {
  const playerId = await getOrCreatePlayerId();
  await db
    .insert(dailyResults)
    .values({ puzzleDate, playerId, guessCount })
    .onConflictDoNothing({ target: [dailyResults.puzzleDate, dailyResults.playerId] });
  return getHistogram(puzzleDate);
}
