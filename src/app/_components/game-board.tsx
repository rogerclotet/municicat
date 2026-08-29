"use client";

import { useState, useTransition } from "react";
import type { Municipality } from "@/data/municipality";
import type { ClueKind } from "@/game/clue";
import type { GuessComparison } from "@/game/compare";
import type { Histogram } from "@/game/histogram";
import { submitGuess } from "../actions";
import { GuessInput } from "./guess-input";
import { GuessRow } from "./guess-row";
import { ResultPanel } from "./result-panel";

/** Neutral and parallel: the prompt never comments on what data a municipality lacks. */
const CLUE_PROMPT: Record<ClueKind, string> = {
  escut: "De quin municipi és aquest escut?",
  bandera: "De quin municipi és aquesta bandera?",
  imatge: "Reconeixes aquest municipi?",
};

const CLUE_CREDIT: Record<ClueKind, string> = {
  escut: "Escut",
  bandera: "Bandera",
  imatge: "Fotografia",
};

/**
 * The clue is always served from `/pista/[date]` on our own origin: the Commons filename
 * spells out the municipality, so it must never reach the browser.
 *
 * Emblems get a medallion; a landscape photograph gets a mounted plate, because a wide
 * rectangle floating inside a circle reads as a mistake.
 */
function ClueFrame({ puzzleDate, kind }: { puzzleDate: string; kind: ClueKind }) {
  const source = `/pista/${puzzleDate}`;
  const alt = CLUE_PROMPT[kind];

  if (kind === "imatge") {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={source}
        alt={alt}
        width={640}
        height={427}
        fetchPriority="high"
        className="engraved aspect-3/2 w-full max-w-md rounded-sm border border-rule object-cover"
      />
    );
  }

  return (
    <div className="relative mb-4">
      {/* A medallion of parchment behind the emblem, with a slow sheen across it. */}
      <div aria-hidden className="absolute -inset-5 rounded-full border border-rule bg-paper-raised" />
      <div
        aria-hidden
        className="animate-sheen absolute -inset-5 rounded-full bg-linear-to-tr from-transparent via-gold-soft to-transparent"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={source}
        alt={alt}
        width={224}
        height={224}
        fetchPriority="high"
        className="relative h-44 w-44 object-contain drop-shadow-[0_6px_12px_rgba(33,26,19,0.28)] sm:h-56 sm:w-56"
      />
    </div>
  );
}

function formatPuzzleDate(puzzleDate: string): string {
  return new Intl.DateTimeFormat("ca-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${puzzleDate}T00:00:00Z`));
}

export function GameBoard({
  puzzleDate,
  clueKind,
  names,
  initialGuesses,
  initialAnswer,
  initialHistogram,
}: {
  puzzleDate: string;
  clueKind: ClueKind;
  names: string[];
  initialGuesses: GuessComparison[];
  initialAnswer: Municipality | null;
  initialHistogram: Histogram | null;
}) {
  const [guesses, setGuesses] = useState(initialGuesses);
  const [answer, setAnswer] = useState(initialAnswer);
  const [histogram, setHistogram] = useState(initialHistogram);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const solved = answer !== null;

  function handleGuess(name: string) {
    setNotice(null);
    startTransition(async () => {
      const response = await submitGuess(name);

      if (response.puzzleDate !== puzzleDate) {
        // Midnight passed mid-session; a reload is the honest way to start the new puzzle.
        window.location.reload();
        return;
      }

      switch (response.status) {
        case "unknown":
          setNotice(`"${name}" no és cap municipi de Catalunya.`);
          return;
        case "duplicate":
          setNotice(`Ja has provat ${response.comparison.name}.`);
          return;
        case "limit":
          setNotice("Has arribat al màxim d'intents per avui.");
          return;
        case "solved":
          setNotice("Ja has resolt el municipi d'avui.");
          return;
        case "ok":
          setGuesses((current) => [...current, response.comparison]);
          setAnswer(response.answer);
          setHistogram(response.histogram);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
      <p className="label text-center">{formatPuzzleDate(puzzleDate)}</p>

      <figure className="mt-6 flex flex-col items-center">
        <ClueFrame puzzleDate={puzzleDate} kind={clueKind} />
        <figcaption className="mt-8 max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold leading-snug tracking-tight text-balance sm:text-3xl">
            {CLUE_PROMPT[clueKind]}
          </h1>
          {/* The link to the Commons file page would name the municipality, so the
              credit only becomes a link once the puzzle is solved. */}
          <p className="mt-2 text-xs text-ink-faint">
            {CLUE_CREDIT[clueKind]} de Wikimedia Commons
          </p>
        </figcaption>
      </figure>

      {!solved && (
        <div className="mx-auto mt-8 max-w-xl">
          <GuessInput
            names={names}
            disabled={solved}
            pending={pending}
            onGuess={handleGuess}
          />
          <p
            role="status"
            aria-live="polite"
            className="mt-2 min-h-5 text-sm text-oxblood"
          >
            {notice}
          </p>
        </div>
      )}

      {answer && (
        <div className="mt-8">
          <ResultPanel answer={answer} histogram={histogram} guessCount={guesses.length} />
        </div>
      )}

      {guesses.length > 0 && (
        <ol className="mt-8 flex flex-col-reverse gap-2">
          {guesses.map((comparison, index) => (
            <GuessRow
              key={comparison.name}
              comparison={comparison}
              ordinal={index + 1}
              animate={index >= initialGuesses.length}
            />
          ))}
        </ol>
      )}

      {guesses.length === 0 && (
        <p className="mt-10 text-center text-sm text-ink-muted">
          Cada intent et diu si el municipi del dia té més o menys població, superfície i
          altitud, si comparteix comarca o província, i a quina distància i direcció es
          troba.
        </p>
      )}
    </div>
  );
}
