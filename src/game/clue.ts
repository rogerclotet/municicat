import type { Municipality } from "@/data/municipality";

export type ClueKind = "escut" | "bandera" | "imatge";

export type Clue = { url: string; kind: ClueKind };

/**
 * The opening clue. 68 municipalities have no coat of arms anywhere on Wikidata or
 * Wikipedia; two of those have a flag, and the remaining 66 fall back to their
 * photograph. The locator map is deliberately not in this chain — it would give the
 * answer away outright, so it is only shown once the puzzle is solved.
 */
export function pickClue(municipality: Municipality): Clue {
  if (municipality.coatOfArmsUrl) return { url: municipality.coatOfArmsUrl, kind: "escut" };
  if (municipality.flagUrl) return { url: municipality.flagUrl, kind: "bandera" };
  return { url: municipality.imageUrl, kind: "imatge" };
}
