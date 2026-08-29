import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Municipality } from "@/data/municipality";
import { pickClue } from "./clue";

const base: Municipality = {
  id: "Q1",
  name: "Vilafictícia",
  sortName: "Vilafictícia",
  searchName: "vilafictícia",
  slug: "vilafictitia",
  comarca: "Comarca",
  province: "Barcelona",
  capital: null,
  population: 1,
  areaKm2: 1,
  elevationM: 1,
  latitude: 41,
  longitude: 2,
  imageUrl: "https://example.org/foto.jpg",
  coatOfArmsUrl: null,
  flagUrl: null,
  mapUrl: null,
  wikipediaUrl: "https://ca.wikipedia.org/wiki/Vilafict%C3%ADcia",
};

describe("pickClue", () => {
  it("prefers the coat of arms", () => {
    const clue = pickClue({
      ...base,
      coatOfArmsUrl: "https://example.org/escut.svg",
      flagUrl: "https://example.org/bandera.svg",
    });
    assert.deepEqual(clue, { url: "https://example.org/escut.svg", kind: "escut" });
  });

  it("falls back to the flag for the 68 without a coat of arms", () => {
    const clue = pickClue({ ...base, flagUrl: "https://example.org/bandera.svg" });
    assert.deepEqual(clue, { url: "https://example.org/bandera.svg", kind: "bandera" });
  });

  it("falls back to the photograph when there is neither", () => {
    assert.deepEqual(pickClue(base), { url: "https://example.org/foto.jpg", kind: "imatge" });
  });

  it("never opens with the locator map, which would give the answer away", () => {
    const clue = pickClue({ ...base, mapUrl: "https://example.org/mapa.svg" });
    assert.notEqual(clue.url, "https://example.org/mapa.svg");
  });
});
