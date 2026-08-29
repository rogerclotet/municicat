FROM node:25-slim AS base

RUN npm install -g pnpm@11.21.0

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder

COPY . .
# `next build` imports route modules to collect page data, which reaches
# src/db/index.ts's module-scope connection check — it never connects at
# build time, but it does need the env var present.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
RUN pnpm build

FROM base AS production

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json next.config.ts drizzle.config.ts ./
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY src ./src
COPY public ./public
COPY data ./data
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next

EXPOSE 3000

CMD ["sh", "-lc", "pnpm db:migrate && pnpm start"]
