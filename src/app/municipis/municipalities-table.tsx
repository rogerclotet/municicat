"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { commonsFilePage, commonsThumb } from "@/data/commons";
import type { Municipality } from "@/data/municipality";
import { toSearchName } from "@/data/normalize";

type SortKey =
  | "sortName"
  | "comarca"
  | "province"
  | "population"
  | "areaKm2"
  | "elevationM";

type Column = {
  key: SortKey;
  label: string;
  numeric?: boolean;
};

const COLUMNS: readonly Column[] = [
  { key: "sortName", label: "Municipi" },
  { key: "comarca", label: "Comarca" },
  { key: "province", label: "Província" },
  { key: "population", label: "Població", numeric: true },
  { key: "areaKm2", label: "Superfície km²", numeric: true },
  { key: "elevationM", label: "Altitud m", numeric: true },
];

/** Fields that are legitimately absent for some municipalities, tracked in the summary. */
const OPTIONAL_FIELDS = [
  { key: "coatOfArmsUrl", label: "escut" },
  { key: "flagUrl", label: "bandera" },
  { key: "mapUrl", label: "mapa" },
  { key: "capital", label: "capital" },
] as const satisfies readonly { key: keyof Municipality; label: string }[];

const integer = new Intl.NumberFormat("ca-ES");
const decimal = new Intl.NumberFormat("ca-ES", { maximumFractionDigits: 1 });
const coordinate = new Intl.NumberFormat("ca-ES", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

function Thumb({ url, alt, kind }: { url: string | null; alt: string; kind: string }) {
  if (!url) {
    return (
      <span className="block text-center text-ink-faint" title={`Sense ${kind}`}>
        —
      </span>
    );
  }
  return (
    <a href={commonsFilePage(url)} target="_blank" rel="noreferrer" title={alt}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 3.000 lazy thumbnails on a
          review page would swamp the image optimizer for no benefit. */}
      <img
        src={commonsThumb(url, 96)}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="mx-auto h-10 w-10 object-contain"
      />
    </a>
  );
}

export function MunicipalitiesTable({ municipalities }: { municipalities: Municipality[] }) {
  const [query, setQuery] = useState("");
  const [comarca, setComarca] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("sortName");
  const [descending, setDescending] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const comarques = useMemo(
    () => [...new Set(municipalities.map((m) => m.comarca))].sort((a, b) => a.localeCompare(b, "ca")),
    [municipalities],
  );

  const rows = useMemo(() => {
    const needle = toSearchName(deferredQuery);
    const filtered = municipalities.filter(
      (m) =>
        (comarca === "" || m.comarca === comarca) &&
        (needle === "" ||
          m.searchName.includes(needle) ||
          toSearchName(m.comarca).includes(needle)),
    );
    const direction = descending ? -1 : 1;
    return filtered.sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      const order =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), "ca");
      return order * direction;
    });
  }, [municipalities, deferredQuery, comarca, sortKey, descending]);

  const missing = OPTIONAL_FIELDS.map(({ key, label }) => ({
    label,
    count: municipalities.filter((m) => m[key] === null).length,
  }));

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDescending((previous) => !previous);
      return;
    }
    setSortKey(key);
    setDescending(false);
  }

  return (
    <div className="mx-auto w-full max-w-[100rem] px-5 py-10">
      <header className="max-w-3xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          El registre complet
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Les {integer.format(municipalities.length)} files importades de Wikidata, tal com
          han quedat desades. Aquesta pàgina existeix per comprovar-les.
        </p>
        <dl className="mt-5 flex flex-wrap gap-x-7 gap-y-2">
          {missing.map(({ label, count }) => (
            <div key={label} className="flex items-baseline gap-2">
              <dt className="label">sense {label}</dt>
              <dd className="font-mono text-sm tabular-nums">{integer.format(count)}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="sticky top-0 z-20 -mx-5 mt-8 flex flex-wrap items-center gap-3 border-y border-rule/70 bg-paper/90 px-5 py-3 backdrop-blur">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca un municipi o una comarca…"
          aria-label="Cerca un municipi o una comarca"
          className="min-w-64 flex-1 rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:border-oxblood"
        />
        <select
          value={comarca}
          onChange={(event) => setComarca(event.target.value)}
          aria-label="Filtra per comarca"
          className="rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-oxblood"
        >
          <option value="">Totes les comarques ({comarques.length})</option>
          {comarques.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <span className="label whitespace-nowrap">
          {integer.format(rows.length)} de {integer.format(municipalities.length)}
        </span>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule text-left align-bottom">
              <th scope="col" className="label px-2 pb-2">Escut</th>
              <th scope="col" className="label px-2 pb-2">Imatge</th>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-2 pb-2 ${column.numeric ? "text-right" : ""}`}
                  aria-sort={
                    sortKey === column.key ? (descending ? "descending" : "ascending") : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className="label transition-colors hover:text-oxblood"
                  >
                    {column.label}
                    <span aria-hidden className="ml-1 text-oxblood">
                      {sortKey === column.key ? (descending ? "▼" : "▲") : ""}
                    </span>
                  </button>
                </th>
              ))}
              <th scope="col" className="label px-2 pb-2 text-right">Coordenades</th>
              <th scope="col" className="label px-2 pb-2">Capital</th>
              <th scope="col" className="label px-2 pb-2">Bandera</th>
              <th scope="col" className="label px-2 pb-2">Mapa</th>
              <th scope="col" className="label px-2 pb-2">Wiki</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b border-rule/40 even:bg-paper-sunk/40">
                <td className="w-14 px-2 py-1.5">
                  <Thumb url={m.coatOfArmsUrl} alt={`Escut de ${m.name}`} kind="escut" />
                </td>
                <td className="w-14 px-2 py-1.5">
                  <Thumb url={m.imageUrl} alt={`Imatge de ${m.name}`} kind="imatge" />
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 font-display text-base font-medium">{m.name}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-ink-muted">{m.comarca}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-ink-muted">{m.province}</td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {integer.format(m.population)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {decimal.format(m.areaKm2)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {integer.format(m.elevationM)}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right font-mono text-xs tabular-nums text-ink-muted">
                  {coordinate.format(m.latitude)} N · {coordinate.format(m.longitude)} E
                </td>
                <td className="px-2 py-1.5 text-ink-muted">{m.capital ?? "—"}</td>
                <td className="w-14 px-2 py-1.5">
                  <Thumb url={m.flagUrl} alt={`Bandera de ${m.name}`} kind="bandera" />
                </td>
                <td className="w-14 px-2 py-1.5">
                  <Thumb url={m.mapUrl} alt={`Mapa de ${m.name}`} kind="mapa" />
                </td>
                <td className="px-2 py-1.5">
                  <a
                    href={m.wikipediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-oxblood underline decoration-rule underline-offset-2"
                  >
                    ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-16 text-center text-ink-muted">Cap municipi coincideix.</p>
        )}
      </div>
    </div>
  );
}
