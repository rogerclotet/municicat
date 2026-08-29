import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { Municipality } from "@/data/municipality";
import { compareGuess, distanceKm, toCardinal } from "./compare";

const municipalities: Municipality[] = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "..", "..", "data", "municipalities.json"), "utf8"),
);

function find(name: string): Municipality {
  const municipality = municipalities.find((candidate) => candidate.name === name);
  if (!municipality) throw new Error(`${name} is not in the dataset`);
  return municipality;
}

const barcelona = find("Barcelona");
const lleida = find("Lleida");

describe("distanceKm", () => {
  it("matches the known Barcelona–Lleida separation", () => {
    assert.ok(Math.abs(distanceKm(barcelona, lleida) - 130) < 8);
  });

  it("is zero for a municipality against itself", () => {
    assert.equal(distanceKm(barcelona, barcelona), 0);
  });
});

describe("toCardinal", () => {
  it("snaps to the eight compass points", () => {
    assert.equal(toCardinal(0), "N");
    assert.equal(toCardinal(91), "E");
    assert.equal(toCardinal(180), "S");
    assert.equal(toCardinal(359), "N");
  });
});

describe("compareGuess", () => {
  it("phrases every verdict from the guess towards the answer", () => {
    const comparison = compareGuess(lleida, barcelona);
    assert.equal(comparison.name, "Lleida");
    assert.equal(comparison.populationDirection, "higher"); // Barcelona is far bigger
    assert.equal(comparison.areaDirection, "lower"); // Lleida covers more ground
    assert.equal(comparison.elevationDirection, "lower"); // Barcelona sits at sea level
    assert.equal(comparison.sameComarca, false);
    assert.equal(comparison.sameProvince, false);
    assert.equal(comparison.cardinal, "E"); // Barcelona is east of Lleida
    assert.equal(comparison.correct, false);
  });

  it("reports a match on the answer itself", () => {
    const comparison = compareGuess(barcelona, barcelona);
    assert.equal(comparison.correct, true);
    assert.equal(comparison.distanceKm, 0);
    assert.equal(comparison.populationDirection, "equal");
    assert.equal(comparison.nameLengthDirection, "equal");
  });

  it("compares name length on the displayed name, article included", () => {
    const masnou = find("el Masnou");
    assert.equal(compareGuess(masnou, masnou).nameLength, "el Masnou".length);
  });
});
