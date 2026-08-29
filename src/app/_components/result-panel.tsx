"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { commonsFilePage, commonsThumb } from "@/data/commons";
import type { Municipality } from "@/data/municipality";
import { pickClue } from "@/game/clue";
import { msUntilNextPuzzle } from "@/game/daily";
import { MAX_BUCKET, type Histogram } from "@/game/histogram";

const integer = new Intl.NumberFormat("ca-ES");
const decimal = new Intl.NumberFormat("ca-ES", { maximumFractionDigits: 1 });

function Countdown() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(msUntilNextPuzzle());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Rendered only after mount so the server and client never disagree on the clock.
  if (remaining === null) return <span className="font-mono tabular-nums">--:--:--</span>;

  const totalSeconds = Math.max(0, Math.floor(remaining / 1000));
  const parts = [
    Math.floor(totalSeconds / 3600),
    Math.floor((totalSeconds % 3600) / 60),
    totalSeconds % 60,
  ].map((part) => String(part).padStart(2, "0"));

  return <span className="font-mono tabular-nums">{parts.join(":")}</span>;
}

function Distribution({ histogram, playerBucket }: { histogram: Histogram; playerBucket: number }) {
  const peak = Math.max(1, ...histogram.buckets.map((bucket) => bucket.count));

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="label">Intents de tothom, avui</h3>
        <p className="label">
          {integer.format(histogram.totalPlayers)}{" "}
          {histogram.totalPlayers === 1 ? "jugador" : "jugadors"}
          {histogram.meanGuesses !== null && ` · mitjana ${decimal.format(histogram.meanGuesses)}`}
        </p>
      </div>
      <ol className="mt-3 flex flex-col gap-1.5">
        {histogram.buckets.map((bucket, index) => {
          const isPlayer = index + 1 === playerBucket;
          return (
            <li key={bucket.label} className="flex items-center gap-3">
              <span className="w-6 shrink-0 text-right font-mono text-sm text-ink-muted">
                {bucket.label}
              </span>
              <div className="h-6 flex-1 bg-paper-sunk">
                {bucket.count === 0 ? (
                  <span className="flex h-full items-center px-2 font-mono text-xs text-ink-faint">
                    0
                  </span>
                ) : (
                  <div
                    className={`flex h-full min-w-8 items-center justify-end px-2 font-mono text-xs tabular-nums transition-[width] duration-700 ${
                      isPlayer ? "bg-gold text-ink" : "bg-oxblood/85 text-paper"
                    }`}
                    style={{ width: `${Math.max(6, (bucket.count / peak) * 100)}%` }}
                  >
                    {integer.format(bucket.count)}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="font-mono text-sm tabular-nums">{value}</dd>
    </div>
  );
}

export function ResultPanel({
  answer,
  histogram,
  guessCount,
}: {
  answer: Municipality;
  histogram: Histogram | null;
  guessCount: number;
}) {
  const clue = pickClue(answer);

  return (
    <section className="engraved animate-rise rounded-sm border border-gold/60 bg-paper-raised p-5 sm:p-7">
      <p className="label">
        Resolt en {guessCount} {guessCount === 1 ? "intent" : "intents"}
      </p>
      <h2 className="mt-1 font-display text-4xl font-semibold tracking-tight text-oxblood">
        {answer.name}
      </h2>

      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex gap-4">
          <a
            href={answer.wikipediaUrl}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 lg:w-60 lg:flex-none"
            title={`${answer.name} a la Viquipèdia`}
          >
            <Image
              src={commonsThumb(answer.imageUrl, 480)}
              alt={answer.name}
              width={240}
              height={160}
              className="h-40 w-full rounded-sm border border-rule object-cover"
            />
          </a>
          {/* Held back until now: on the board it would have named the municipality. */}
          {answer.mapUrl && (
            <figure className="min-w-0 flex-1 lg:w-60 lg:flex-none">
              <Image
                src={commonsThumb(answer.mapUrl, 480)}
                alt={`Situació de ${answer.name} dins la seva comarca`}
                width={240}
                height={160}
                className="h-40 w-full rounded-sm border border-rule bg-paper-raised object-contain p-1"
              />
              <figcaption className="label mt-1.5">Situació</figcaption>
            </figure>
          )}
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3">
          <Fact label="Comarca" value={answer.comarca} />
          <Fact label="Província" value={answer.province} />
          <Fact label="Capital" value={answer.capital ?? "—"} />
          <Fact label="Població" value={integer.format(answer.population)} />
          <Fact label="Superfície" value={`${decimal.format(answer.areaKm2)} km²`} />
          <Fact label="Altitud" value={`${integer.format(answer.elevationM)} m`} />
        </dl>
      </div>

      <p className="mt-4 text-xs text-ink-faint">
        <a
          className="underline decoration-rule underline-offset-2 hover:text-oxblood"
          href={answer.wikipediaUrl}
          target="_blank"
          rel="noreferrer"
        >
          Article a la Viquipèdia
        </a>
        {clue.url !== answer.imageUrl && (
          <>
            {" · "}
            <a
              className="underline decoration-rule underline-offset-2 hover:text-oxblood"
              href={commonsFilePage(clue.url)}
              target="_blank"
              rel="noreferrer"
            >
              Crèdits de la pista
            </a>
          </>
        )}
        {" · "}
        <a
          className="underline decoration-rule underline-offset-2 hover:text-oxblood"
          href={commonsFilePage(answer.imageUrl)}
          target="_blank"
          rel="noreferrer"
        >
          Crèdits de la fotografia
        </a>
        {answer.mapUrl && (
          <>
            {" · "}
            <a
              className="underline decoration-rule underline-offset-2 hover:text-oxblood"
              href={commonsFilePage(answer.mapUrl)}
              target="_blank"
              rel="noreferrer"
            >
              Crèdits del mapa
            </a>
          </>
        )}
      </p>

      {histogram && (
        <div className="mt-7 border-t border-rule pt-6">
          <Distribution histogram={histogram} playerBucket={Math.min(guessCount, MAX_BUCKET)} />
        </div>
      )}

      <p className="mt-7 border-t border-rule pt-5 text-sm text-ink-muted">
        Nou municipi d&apos;aquí a <Countdown />
      </p>
    </section>
  );
}
