/**
 * Rebuilds `data/municipalities.json` from Wikidata.
 *
 * The Wikipedia "Llista de municipis de Catalunya" page is itself generated from a
 * `{{Wikidata list}}` SPARQL query, so we query the same source directly instead of
 * scraping rendered HTML.
 *
 * Run with `pnpm data:fetch`.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { Municipality } from "@/data/municipality";
import { toSearchName, toSlug, toSortName } from "@/data/normalize";

const ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT =
  "municicat/0.1 (https://github.com/rogerclotet/municicat; clotet89@gmail.com)";
const OUTPUT = path.join(import.meta.dirname, "..", "data", "municipalities.json");

/** Catalonia has had 947 municipalities since 2015; a different count means the query drifted. */
const EXPECTED_COUNT = 947;

const QUERY = `
SELECT DISTINCT ?item ?itemLabel ?comarcaLabel ?population ?image ?coa ?flag ?map
                ?coord ?capitalLabel ?provinceLabel ?area ?elevation ?article WHERE {
  VALUES ?comarcaOrAran { wd:Q937876 wd:Q19920968 }
  ?item wdt:P31/wdt:P279* wd:Q2074737; wdt:P131 ?comarca.
  ?comarca wdt:P31 ?comarcaOrAran.
  MINUS { ?item wdt:P31 wd:Q55863584 }
  OPTIONAL { ?item wdt:P1082 ?population. }
  OPTIONAL { ?item wdt:P18 ?image. }
  OPTIONAL { ?item wdt:P94 ?coa. }
  OPTIONAL { ?item wdt:P41 ?flag. }
  OPTIONAL { ?item wdt:P242 ?map. }
  OPTIONAL { ?item wdt:P625 ?coord. }
  OPTIONAL { ?item wdt:P36 ?capital. }
  OPTIONAL { ?item wdt:P2046 ?area. }
  OPTIONAL { ?item wdt:P2044 ?elevation. }
  OPTIONAL { ?item wdt:P131* ?province. ?province wdt:P31 wd:Q162620. }
  OPTIONAL { ?article schema:about ?item; schema:isPartOf <https://ca.wikipedia.org/>. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ca,es,en". }
}`;

type SparqlBinding = Record<string, { value: string } | undefined>;

async function runQuery(): Promise<SparqlBinding[]> {
  const url = `${ENDPOINT}?query=${encodeURIComponent(QUERY)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(
      `Wikidata query failed: ${response.status} ${response.statusText}\n${await response.text()}`,
    );
  }
  const body = (await response.json()) as { results: { bindings: SparqlBinding[] } };
  return body.results.bindings;
}

/**
 * A handful of items carry several values for the same optional property (two photos,
 * two elevations). Sorting the rows first makes the pick stable, so re-running the
 * script produces a byte-identical file and diffs stay reviewable.
 */
function firstValue(rows: SparqlBinding[], key: string): string | null {
  for (const row of rows) {
    const value = row[key]?.value;
    if (value) return value;
  }
  return null;
}

function required(rows: SparqlBinding[], key: string, qid: string): string {
  const value = firstValue(rows, key);
  if (!value) throw new Error(`${qid}: missing required field "${key}"`);
  return value;
}

/** `Point(2.767222222 42.094444444)` — longitude first, per WKT. */
function parsePoint(wkt: string): { latitude: number; longitude: number } {
  const match = /^Point\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)$/.exec(wkt);
  if (!match) throw new Error(`Unparseable coordinate: ${wkt}`);
  return { longitude: Number(match[1]), latitude: Number(match[2]) };
}

function stripProvincePrefix(label: string): string {
  return label.replace(/^prov[ií]ncia\s+d[e']\s*/i, "");
}

/** Wikidata returns Commons and Wikipedia URLs over plain http; the app only loads https. */
function toHttps(url: string): string;
function toHttps(url: string | null): string | null;
function toHttps(url: string | null): string | null {
  return url === null ? null : url.replace(/^http:\/\//, "https://");
}

function qidFromUri(uri: string): string {
  const qid = uri.split("/").pop();
  if (!qid?.startsWith("Q")) throw new Error(`Unexpected entity URI: ${uri}`);
  return qid;
}

/**
 * Wikidata's `?item wdt:P131* ?province` path misses the odd municipality whose
 * administrative chain is incomplete. Comarques do not straddle provinces, so the
 * province of the other municipalities in the same comarca is a safe fill-in.
 */
function provinceByComarca(groups: Map<string, SparqlBinding[]>): Map<string, string> {
  const counts = new Map<string, Map<string, number>>();
  for (const rows of groups.values()) {
    const comarca = firstValue(rows, "comarcaLabel");
    const province = firstValue(rows, "provinceLabel");
    if (!comarca || !province) continue;
    const byProvince = counts.get(comarca) ?? new Map<string, number>();
    const name = stripProvincePrefix(province);
    byProvince.set(name, (byProvince.get(name) ?? 0) + 1);
    counts.set(comarca, byProvince);
  }
  const modal = new Map<string, string>();
  for (const [comarca, byProvince] of counts) {
    const [best] = [...byProvince].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    modal.set(comarca, best[0]);
  }
  return modal;
}

function toMunicipality(
  qid: string,
  rows: SparqlBinding[],
  fallbackProvince: Map<string, string>,
): Municipality {
  const name = required(rows, "itemLabel", qid);
  const comarca = required(rows, "comarcaLabel", qid);
  const province = firstValue(rows, "provinceLabel");
  const resolvedProvince = province
    ? stripProvincePrefix(province)
    : fallbackProvince.get(comarca);
  if (!resolvedProvince) throw new Error(`${qid} (${name}): no province for comarca ${comarca}`);

  const { latitude, longitude } = parsePoint(required(rows, "coord", qid));

  return {
    id: qid,
    name,
    sortName: toSortName(name),
    searchName: toSearchName(name),
    slug: toSlug(name),
    comarca,
    province: resolvedProvince,
    capital: firstValue(rows, "capitalLabel"),
    population: Number(required(rows, "population", qid)),
    areaKm2: Number(required(rows, "area", qid)),
    elevationM: Math.round(Number(required(rows, "elevation", qid))),
    latitude,
    longitude,
    imageUrl: toHttps(required(rows, "image", qid)),
    coatOfArmsUrl: toHttps(firstValue(rows, "coa")),
    flagUrl: toHttps(firstValue(rows, "flag")),
    mapUrl: toHttps(firstValue(rows, "map")),
    wikipediaUrl: toHttps(required(rows, "article", qid)),
  };
}

function assertUniqueSlugs(municipalities: Municipality[]): void {
  const seen = new Map<string, string>();
  for (const { slug, name } of municipalities) {
    const clash = seen.get(slug);
    if (clash) throw new Error(`Slug collision "${slug}": ${clash} and ${name}`);
    seen.set(slug, name);
  }
}

function summarise(municipalities: Municipality[]): void {
  const optional = ["coatOfArmsUrl", "flagUrl", "mapUrl", "capital"] as const;
  console.log(`${municipalities.length} municipalities`);
  for (const field of optional) {
    const present = municipalities.filter((m) => m[field] !== null).length;
    console.log(`  ${field}: ${present} present, ${municipalities.length - present} missing`);
  }
}

async function main(): Promise<void> {
  const bindings = await runQuery();

  const groups = new Map<string, SparqlBinding[]>();
  for (const row of bindings) {
    const uri = row.item?.value;
    if (!uri) throw new Error("Row without an item URI");
    const qid = qidFromUri(uri);
    const rows = groups.get(qid) ?? [];
    rows.push(row);
    groups.set(qid, rows);
  }
  for (const rows of groups.values()) {
    rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }

  const fallbackProvince = provinceByComarca(groups);
  const municipalities = [...groups]
    .map(([qid, rows]) => toMunicipality(qid, rows, fallbackProvince))
    .sort((a, b) => a.id.localeCompare(b.id));

  if (municipalities.length !== EXPECTED_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_COUNT} municipalities, got ${municipalities.length}. ` +
        "The Wikidata model may have changed — review the query before seeding.",
    );
  }
  assertUniqueSlugs(municipalities);

  await writeFile(OUTPUT, `${JSON.stringify(municipalities, null, 2)}\n`, "utf8");
  summarise(municipalities);
  console.log(`Wrote ${OUTPUT}`);
}

await main();
