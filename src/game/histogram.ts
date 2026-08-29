/** Guess counts 1..7 are shown individually; everything from 8 upwards shares a bucket. */
export const MAX_BUCKET = 8;

export type Histogram = {
  buckets: { label: string; count: number }[];
  totalPlayers: number;
  meanGuesses: number | null;
};
