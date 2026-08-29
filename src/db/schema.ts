import {
  date,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const municipalities = pgTable(
  "municipalities",
  {
    /** Wikidata Q-id, e.g. `Q1492`. Stable across data refreshes, so it drives upserts. */
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    sortName: text("sort_name").notNull(),
    searchName: text("search_name").notNull(),
    slug: text("slug").notNull().unique(),
    comarca: text("comarca").notNull(),
    province: text("province").notNull(),
    capital: text("capital"),
    population: integer("population").notNull(),
    areaKm2: real("area_km2").notNull(),
    elevationM: integer("elevation_m").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    imageUrl: text("image_url").notNull(),
    /** Null for the 68 municipalities with no coat of arms on Wikidata or Wikipedia. */
    coatOfArmsUrl: text("coat_of_arms_url"),
    flagUrl: text("flag_url"),
    mapUrl: text("map_url"),
    wikipediaUrl: text("wikipedia_url").notNull(),
  },
  (table) => [
    index("municipalities_search_name_idx").on(table.searchName),
    index("municipalities_sort_name_idx").on(table.sortName),
  ],
);

export const dailyResults = pgTable(
  "daily_results",
  {
    id: serial("id").primaryKey(),
    puzzleDate: date("puzzle_date").notNull(),
    /** Anonymous per-browser id from an httpOnly cookie; no account is ever created. */
    playerId: uuid("player_id").notNull(),
    guessCount: integer("guess_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("daily_results_puzzle_date_idx").on(table.puzzleDate),
    unique("daily_results_date_player_unique").on(table.puzzleDate, table.playerId),
  ],
);

export type MunicipalityRow = typeof municipalities.$inferSelect;
