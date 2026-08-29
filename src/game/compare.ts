import type { Municipality } from "@/data/municipality";

/** Where the answer sits relative to the guess. */
export type Direction = "higher" | "lower" | "equal";

/** The eight-point bearing from the guess towards the answer. */
export type Cardinal = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export type GuessComparison = {
  /** Values of the *guessed* municipality, shown alongside each verdict. */
  name: string;
  comarca: string;
  province: string;
  population: number;
  areaKm2: number;
  elevationM: number;
  nameLength: number;
  sameComarca: boolean;
  sameProvince: boolean;
  populationDirection: Direction;
  areaDirection: Direction;
  elevationDirection: Direction;
  nameLengthDirection: Direction;
  distanceKm: number;
  /** Degrees clockwise from north, for rotating the direction arrow. */
  bearingDeg: number;
  cardinal: Cardinal;
  correct: boolean;
};

const EARTH_RADIUS_KM = 6371;

function compareNumbers(guess: number, answer: number): Direction {
  if (answer > guess) return "higher";
  if (answer < guess) return "lower";
  return "equal";
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export function distanceKm(a: Municipality, b: Municipality): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Initial great-circle bearing from `from` towards `to`, in degrees clockwise from north. */
export function bearingDeg(from: Municipality, to: Municipality): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

const CARDINALS: readonly Cardinal[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function toCardinal(degrees: number): Cardinal {
  return CARDINALS[Math.round(degrees / 45) % 8];
}

/**
 * Every hint the player gets for one guess. All verdicts are phrased from the guess
 * towards the answer: `higher` means the answer's value is the larger one.
 */
export function compareGuess(guess: Municipality, answer: Municipality): GuessComparison {
  const correct = guess.id === answer.id;
  const bearing = bearingDeg(guess, answer);
  return {
    name: guess.name,
    comarca: guess.comarca,
    province: guess.province,
    population: guess.population,
    areaKm2: guess.areaKm2,
    elevationM: guess.elevationM,
    nameLength: guess.name.length,
    sameComarca: guess.comarca === answer.comarca,
    sameProvince: guess.province === answer.province,
    populationDirection: compareNumbers(guess.population, answer.population),
    areaDirection: compareNumbers(guess.areaKm2, answer.areaKm2),
    elevationDirection: compareNumbers(guess.elevationM, answer.elevationM),
    nameLengthDirection: compareNumbers(guess.name.length, answer.name.length),
    distanceKm: correct ? 0 : distanceKm(guess, answer),
    bearingDeg: bearing,
    cardinal: toCardinal(bearing),
    correct,
  };
}
