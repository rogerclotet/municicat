import type { NextRequest } from "next/server";
import { commonsThumb } from "@/data/commons";
import { getDailyMunicipality } from "@/data/queries";
import { pickClue } from "@/game/clue";
import { currentPuzzleDate } from "@/game/daily";

/**
 * Serves today's clue image from our own origin.
 *
 * Commons filenames spell out the municipality — `Escut de Tiana.svg` — so linking the
 * image directly would hand the answer to anyone who opens the network tab. This route
 * fetches the file server-side and streams back only the bytes.
 *
 * The date sits in the path purely so browsers drop the previous day's copy; a request
 * for any date other than today is refused, so it cannot be used to read ahead.
 */
export const dynamic = "force-dynamic";

const CLUE_WIDTH = 512;

/** A day's clue never changes, but it must not outlive the day. */
const CACHE_SECONDS = 60 * 60;

const UPSTREAM_TIMEOUT_MS = 8000;
const UPSTREAM_ATTEMPTS = 2;

type ClueImage = { body: ArrayBuffer; contentType: string };

/**
 * One image per day, identical for every player, so it is worth holding: it spares
 * Commons a request per page view and makes a transient upstream blip invisible.
 */
let cached: (ClueImage & { date: string }) | null = null;

async function fetchClue(url: string): Promise<ClueImage | null> {
  for (let attempt = 1; attempt <= UPSTREAM_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "municicat/0.1 (https://github.com/rogerclotet/municicat)",
          Accept: "image/*",
        },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!response.ok) continue;
      return {
        body: await response.arrayBuffer(),
        contentType: response.headers.get("content-type") ?? "image/png",
      };
    } catch (error) {
      // Commons times out often enough that one retry is worth more than a 500.
      if (attempt === UPSTREAM_ATTEMPTS) {
        console.warn("Could not fetch the clue image from Commons", error);
      }
    }
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ date: string }> },
) {
  const { date } = await context.params;
  if (date !== currentPuzzleDate()) {
    return new Response("Not found", { status: 404 });
  }

  let image = cached?.date === date ? cached : null;
  if (!image) {
    const answer = await getDailyMunicipality(date);
    const fetched = await fetchClue(commonsThumb(pickClue(answer).url, CLUE_WIDTH));
    if (!fetched) return new Response("Clue unavailable", { status: 502 });
    image = { ...fetched, date };
    cached = image;
  }

  return new Response(image.body, {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
      // Nothing downstream should be able to work backwards to the Commons filename.
      "Content-Disposition": 'inline; filename="pista"',
    },
  });
}
