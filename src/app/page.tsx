import {
  getDailyMunicipality,
  getHistogram,
  getMunicipaliesForBoard,
} from "@/data/queries";
import { compareGuess } from "@/game/compare";
import { pickClue } from "@/game/clue";
import { currentPuzzleDate } from "@/game/daily";
import { readProgress } from "@/game/session";
import { GameBoard } from "./_components/game-board";

/** The board reflects the player's cookie, so it is rendered per request. */
export const dynamic = "force-dynamic";

export default async function GamePage() {
  const puzzleDate = currentPuzzleDate();
  const [answer, progress] = await Promise.all([
    getDailyMunicipality(puzzleDate),
    readProgress(puzzleDate),
  ]);

  const { names, byId } = await getMunicipaliesForBoard(progress.guessIds);
  const comparisons = progress.guessIds
    .map((id) => byId.get(id))
    .filter((municipality) => municipality !== undefined)
    .map((municipality) => compareGuess(municipality, answer));

  const solved = comparisons.some((comparison) => comparison.correct);

  return (
    <GameBoard
      puzzleDate={puzzleDate}
      clueKind={pickClue(answer).kind}
      names={names}
      initialGuesses={comparisons}
      initialAnswer={solved ? answer : null}
      initialHistogram={solved ? await getHistogram(puzzleDate) : null}
    />
  );
}
