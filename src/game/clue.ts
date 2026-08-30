import type { Municipality } from "@/data/municipality";

export type ClueKind = "escut" | "bandera" | "imatge";

export type Clue = { url: string; kind: ClueKind };

/**
 * The opening clue: coat of arms first, flag otherwise. The daily pick is restricted to
 * municipalities with one of the two (see `dailyEligibleIds` in `data/queries.ts`), so the
 * photograph fallback below only fires for `/municipis` browsing, never as an opening clue.
 * The locator map is deliberately not in this chain — it would give the answer away
 * outright, so it is only shown once the puzzle is solved.
 */
export function pickClue(municipality: Municipality): Clue {
  if (municipality.coatOfArmsUrl) return { url: municipality.coatOfArmsUrl, kind: "escut" };
  if (municipality.flagUrl) return { url: municipality.flagUrl, kind: "bandera" };
  return { url: municipality.imageUrl, kind: "imatge" };
}
