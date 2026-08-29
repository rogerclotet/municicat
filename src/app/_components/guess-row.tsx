import type { Direction, GuessComparison } from "@/game/compare";

const integer = new Intl.NumberFormat("ca-ES");
const decimal = new Intl.NumberFormat("ca-ES", { maximumFractionDigits: 1 });

const DIRECTION_GLYPH: Record<Direction, string> = {
  higher: "▲",
  lower: "▼",
  equal: "=",
};

/** Spoken form of each verdict, so the hint never depends on colour or shape alone. */
const DIRECTION_WORD: Record<Direction, string> = {
  higher: "el municipi del dia en té més",
  lower: "el municipi del dia en té menys",
  equal: "igual",
};

function directionClass(direction: Direction): string {
  return direction === "equal" ? "text-verd" : "text-oxblood";
}

function Hint({
  label,
  value,
  direction,
  match,
  wide,
}: {
  label: string;
  /** Place names can be long enough to clip; measurements never are. */
  value: string;
  direction?: Direction;
  match?: boolean;
  /** Comarca names run to "Pla de l\'Estany"; they get a double column. */
  wide?: boolean;
}) {
  const isMatch = match === true || direction === "equal";
  return (
    <div
      className={`flex min-w-0 flex-col gap-0.5 rounded-sm border px-2 py-1.5 ${
        wide ? "sm:col-span-2" : ""
      } ${isMatch ? "border-verd/60 bg-verd/10" : "border-rule bg-paper-raised"}`}
    >
      <span className="label leading-none">{label}</span>
      <span className="flex items-baseline gap-1.5 font-mono text-[0.8125rem] tabular-nums">
        <span
          className={match === undefined ? "whitespace-nowrap" : "truncate"}
          title={match === undefined ? undefined : value}
        >
          {value}
        </span>
        {direction !== undefined && (
          <span className={`shrink-0 text-xs ${directionClass(direction)}`} aria-hidden>
            {DIRECTION_GLYPH[direction]}
          </span>
        )}
        {direction !== undefined && <span className="sr-only">{DIRECTION_WORD[direction]}</span>}
        {match !== undefined && (
          <span className={`shrink-0 text-xs ${match ? "text-verd" : "text-oxblood"}`}>
            <span aria-hidden>{match ? "✓" : "✕"}</span>
            <span className="sr-only">{match ? "coincideix" : "no coincideix"}</span>
          </span>
        )}
      </span>
    </div>
  );
}

/** Arrow pointing from the guessed municipality towards the answer. */
function Compass({ comparison }: { comparison: GuessComparison }) {
  const distance =
    comparison.distanceKm < 10
      ? `${decimal.format(comparison.distanceKm)} km`
      : `${integer.format(Math.round(comparison.distanceKm))} km`;

  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-sm border border-rule bg-paper-raised px-2 py-1.5">
      <span className="label leading-none">Distància</span>
      <span className="flex items-baseline gap-1.5 font-mono text-[0.8125rem] tabular-nums">
        <span className="truncate">{distance}</span>
        {/* A stemmed arrow rather than a chevron: at 14px a chevron is unreadable at
            anything but the four cardinal angles. */}
        <svg
          viewBox="0 0 16 16"
          className="size-3.5 shrink-0 self-center fill-oxblood"
          style={{ transform: `rotate(${comparison.bearingDeg}deg)` }}
          aria-hidden
        >
          <path d="M8 2 L12.5 8 H9.8 V14 H6.2 V8 H3.5 Z" />
        </svg>
        <span className="sr-only">cap al {comparison.cardinal}</span>
      </span>
    </div>
  );
}

export function GuessRow({
  comparison,
  ordinal,
  animate,
}: {
  comparison: GuessComparison;
  ordinal: number;
  animate: boolean;
}) {
  if (comparison.correct) {
    return (
      <li
        className={`rounded-sm border-2 border-verd bg-verd/15 px-4 py-3 ${animate ? "animate-stamp" : ""}`}
      >
        <p className="flex items-baseline gap-3">
          <span className="label">Intent {ordinal}</span>
          <span className="font-display text-2xl font-semibold text-verd">{comparison.name}</span>
          <span className="label text-verd">correcte</span>
        </p>
      </li>
    );
  }

  return (
    <li
      className={`rounded-sm border border-rule/80 bg-paper-raised/60 px-3 py-3 ${animate ? "animate-rise" : ""}`}
    >
      <p className="mb-2 flex items-baseline gap-3">
        <span className="label">Intent {ordinal}</span>
        <span className="font-display text-xl font-semibold">{comparison.name}</span>
      </p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-8">
        <Hint label="Comarca" value={comparison.comarca} match={comparison.sameComarca} wide />
        <Hint label="Província" value={comparison.province} match={comparison.sameProvince} />
        <Hint
          label="Població"
          value={integer.format(comparison.population)}
          direction={comparison.populationDirection}
        />
        <Hint
          label="Superfície"
          value={`${decimal.format(comparison.areaKm2)} km²`}
          direction={comparison.areaDirection}
        />
        <Hint
          label="Altitud"
          value={`${integer.format(comparison.elevationM)} m`}
          direction={comparison.elevationDirection}
        />
        <Hint
          label="Lletres"
          value={String(comparison.nameLength)}
          direction={comparison.nameLengthDirection}
        />
        <Compass comparison={comparison} />
      </div>
    </li>
  );
}
