/** Shape shared by the ingestion script, the seed script and the app. */
export type Municipality = {
  /** Wikidata Q-id, e.g. `Q1492`. */
  id: string;
  /** Official Catalan name, article included: `el Masnou`. */
  name: string;
  /** `name` without the leading article, for alphabetical ordering. */
  sortName: string;
  /** Accent-free lowercase form used for guess matching and search. */
  searchName: string;
  slug: string;
  comarca: string;
  province: string;
  capital: string | null;
  population: number;
  areaKm2: number;
  elevationM: number;
  latitude: number;
  longitude: number;
  imageUrl: string;
  coatOfArmsUrl: string | null;
  flagUrl: string | null;
  mapUrl: string | null;
  wikipediaUrl: string;
};
