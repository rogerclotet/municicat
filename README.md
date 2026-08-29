# Municicat

A daily guessing game for the 947 municipalities of Catalonia, built as an installable PWA.

Every day the game picks one municipality — the same one for everyone, worldwide — and shows
its *escut* as the only clue. You name municipalities until you find it; each guess tells you
whether the answer has more or fewer people, more or less land, sits higher or lower, shares a
comarca or a província, has a longer or shorter name, and how far away it is and in which
direction. Once you solve it you see how your guess count compares with everyone else's that day.

- `/` — the game
- `/municipis` — every imported row, for checking the data

## Where the data comes from

Wikipedia's *Llista de municipis de Catalunya* is generated from a `{{Wikidata list}}` SPARQL
query, so `scripts/fetch-wikidata.mts` queries the same source directly rather than scraping
rendered HTML. It writes `data/municipalities.json`, which is committed so every change to the
dataset shows up as a reviewable diff.

Known gaps, all of them genuine absences upstream rather than parsing failures:

| Field | Missing |
|---|---|
| Escut (`P94`) | 68 |
| Bandera (`P41`) | 429 |
| Mapa (`P242`) | 7 |
| Capital (`P36`) | 18 |

The opening clue is the escut; the 68 without one fall back to their flag (2 of them) and then
to their photograph (the other 66), so all 947 stay eligible as the answer of the day. The
locator map is never a clue — it names the answer outright — and is only shown once solved.

## Setup

Postgres is required. For local development:

```sh
docker compose -f compose.dev.yml up -d
cp .env.example .env.local   # already points at the container above
```

```sh
pnpm install
pnpm db:migrate   # create the tables
pnpm db:seed      # load data/municipalities.json
pnpm dev
```

## Deployment

`compose.yaml` runs Postgres and the app together — this is what production uses. Copy
`.env.example` to `.env` on the server and adjust the values (at least the Postgres password),
then:

```sh
docker compose up -d --build
```

The app container runs `pnpm db:migrate` on every start before serving traffic, so schema changes
land automatically on deploy. To load or refresh the dataset:

```sh
docker compose --profile ops run --rm seed
```

### CI/CD

`.github/workflows/ci.yml` lints, typechecks and tests every push and PR. On `main`, it SSHes into
the server, `git pull`s, and re-runs `docker compose up -d --build`. It needs these repo secrets:

| Secret | Purpose |
|---|---|
| `SSH_USERNAME`, `SSH_PASSWORD`, `SSH_IP` | Login for the deploy target |
| `SSH_PROJECT_DIRECTORY` | Where this repo is checked out on the server |
| `PORT` | Host port the app should bind to (`APP_PORT` in `compose.yaml`) |

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm test` | Unit tests (`node:test`) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm data:fetch` | Re-query Wikidata into `data/municipalities.json` |
| `pnpm db:generate` | Generate a migration from `src/db/schema.ts` |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Upsert the JSON into Postgres (idempotent) |

## How the daily puzzle is chosen

`src/game/daily.ts` shuffles all 947 ids once with a fixed-seed PRNG and walks that permutation
one entry per day, rolling over at midnight in `Europe/Madrid`. It is a pure function of the
date and the id list, so every client agrees without asking a server, and no municipality
repeats for two and a half years.

## Keeping the answer secret

Commons filenames spell out the municipality — `Escut de Tiana.svg` gives the game away — so the
clue is streamed through `/pista/[date]` from our own origin, and that route refuses any date
but today. Guesses are evaluated in a Server Action; the answer only reaches the browser once
the player has named it. The run itself lives in an httpOnly cookie, so the guess count filed
in the daily distribution is not something the browser can edit.

## Attribution

All data and imagery come from [Wikidata](https://www.wikidata.org) and
[Wikimedia Commons](https://commons.wikimedia.org) under free licences. Every escut, map and
photograph links back to its Commons file page.
