import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { Municipality } from "@/data/municipality";
import { currentPuzzleDate, dailyMunicipalityId, msUntilNextPuzzle } from "./daily";

const municipalities: Municipality[] = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "..", "..", "data", "municipalities.json"), "utf8"),
);
const ids = municipalities.map((municipality) => municipality.id);

function addDays(puzzleDate: string, days: number): string {
  const date = new Date(`${puzzleDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

describe("dailyMunicipalityId", () => {
  it("is stable for a given date", () => {
    assert.equal(dailyMunicipalityId("2026-08-29", ids), dailyMunicipalityId("2026-08-29", ids));
  });

  it("does not depend on the order the ids arrive in", () => {
    const reversed = [...ids].reverse();
    assert.equal(dailyMunicipalityId("2026-08-29", ids), dailyMunicipalityId("2026-08-29", reversed));
  });

  it("plays every municipality once before repeating", () => {
    const picks = Array.from({ length: ids.length }, (_, day) =>
      dailyMunicipalityId(addDays("2026-01-01", day), ids),
    );
    assert.equal(new Set(picks).size, ids.length);
  });

  it("wraps around after a full cycle", () => {
    assert.equal(
      dailyMunicipalityId("2026-01-01", ids),
      dailyMunicipalityId(addDays("2026-01-01", ids.length), ids),
    );
  });

  it("handles dates before the epoch without going out of range", () => {
    assert.ok(ids.includes(dailyMunicipalityId("2020-03-15", ids)));
  });

  it("rejects a malformed date", () => {
    assert.throws(() => dailyMunicipalityId("no-en-fotis", ids));
  });
});

describe("currentPuzzleDate", () => {
  it("rolls over at midnight in Catalonia, not UTC", () => {
    // 22:30 UTC on 28 August is already 00:30 on 29 August in Barcelona (CEST, UTC+2).
    assert.equal(currentPuzzleDate(new Date("2026-08-28T22:30:00Z")), "2026-08-29");
    assert.equal(currentPuzzleDate(new Date("2026-08-28T21:30:00Z")), "2026-08-28");
  });

  it("tracks the winter offset too", () => {
    // 23:30 UTC on 10 January is 00:30 on 11 January in Barcelona (CET, UTC+1).
    assert.equal(currentPuzzleDate(new Date("2026-01-10T23:30:00Z")), "2026-01-11");
    assert.equal(currentPuzzleDate(new Date("2026-01-10T22:30:00Z")), "2026-01-10");
  });
});

describe("msUntilNextPuzzle", () => {
  it("counts down to the next local midnight", () => {
    const now = new Date("2026-08-29T10:00:00Z"); // 12:00 in Barcelona
    assert.equal(msUntilNextPuzzle(now), 12 * 60 * 60 * 1000);
  });

  it("stays within a day at every hour of the year", () => {
    for (let hour = 0; hour < 24 * 365; hour += 7) {
      const now = new Date(Date.UTC(2026, 0, 1) + hour * 3_600_000);
      const remaining = msUntilNextPuzzle(now);
      assert.ok(remaining > 0 && remaining <= 25 * 3_600_000, `${now.toISOString()}: ${remaining}`);
    }
  });
});
