import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchKeys, toSearchName, toSlug, toSortName } from "./normalize";

describe("toSortName", () => {
  it("drops the leading article", () => {
    assert.equal(toSortName("el Masnou"), "Masnou");
    assert.equal(toSortName("l'Escala"), "Escala");
    assert.equal(toSortName("les Borges Blanques"), "Borges Blanques");
  });

  it("leaves a name that only starts with those letters alone", () => {
    assert.equal(toSortName("Lleida"), "Lleida");
    assert.equal(toSortName("Elx"), "Elx");
  });
});

describe("toSearchName", () => {
  it("folds accents and case so a bare keyboard still matches", () => {
    assert.equal(toSearchName("Sant Julià de Ramis"), "sant julia de ramis");
    assert.equal(toSearchName("Camós"), "camos");
  });

  it("normalises the punctuation Catalan names carry", () => {
    assert.equal(toSearchName("L’Escala"), "l'escala");
    assert.equal(toSearchName("Cabrera d'Anoia"), "cabrera d'anoia");
  });
});

describe("searchKeys", () => {
  it("accepts a municipality with or without its article", () => {
    assert.deepEqual(searchKeys("el Masnou"), ["el masnou", "masnou"]);
  });

  it("returns a single key when there is no article to drop", () => {
    assert.deepEqual(searchKeys("Barcelona"), ["barcelona"]);
  });
});

describe("toSlug", () => {
  it("produces url-safe identifiers", () => {
    assert.equal(toSlug("l'Escala"), "l-escala");
    assert.equal(toSlug("Sant Julià de Ramis"), "sant-julia-de-ramis");
  });
});
