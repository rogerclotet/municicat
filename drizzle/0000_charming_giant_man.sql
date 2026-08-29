CREATE TABLE "daily_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_date" date NOT NULL,
	"player_id" uuid NOT NULL,
	"guess_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_results_date_player_unique" UNIQUE("puzzle_date","player_id")
);
--> statement-breakpoint
CREATE TABLE "municipalities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_name" text NOT NULL,
	"search_name" text NOT NULL,
	"slug" text NOT NULL,
	"comarca" text NOT NULL,
	"province" text NOT NULL,
	"capital" text,
	"population" integer NOT NULL,
	"area_km2" real NOT NULL,
	"elevation_m" integer NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"image_url" text NOT NULL,
	"coat_of_arms_url" text,
	"flag_url" text,
	"map_url" text,
	"wikipedia_url" text NOT NULL,
	CONSTRAINT "municipalities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "daily_results_puzzle_date_idx" ON "daily_results" USING btree ("puzzle_date");--> statement-breakpoint
CREATE INDEX "municipalities_search_name_idx" ON "municipalities" USING btree ("search_name");--> statement-breakpoint
CREATE INDEX "municipalities_sort_name_idx" ON "municipalities" USING btree ("sort_name");