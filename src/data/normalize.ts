/**
 * Definite articles Catalan municipality names carry, e.g. `el Masnou`, `l'Escala`.
 * The word forms must be followed by whitespace, or `Elx` would lose its first two letters.
 */
const LEADING_ARTICLE = /^(?:(?:el|la|els|les)\s+|l')/i;

/**
 * Drops the leading article so `el Masnou` files under M, matching how Catalan
 * indexes and the Wikipedia list itself order these names.
 */
export function toSortName(name: string): string {
  return name.replace(LEADING_ARTICLE, "");
}

/**
 * Folds a name down to the form used for guess matching and search: lowercase,
 * unaccented, apostrophes and dashes unified, whitespace collapsed. Deliberately
 * lossy so that `Sant Julia de Ramis` matches `Sant Julià de Ramis`.
 */
export function toSearchName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[‐-―]/g, "-")
    .replace(/·/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A guess of `Masnou` should find `el Masnou`, so search keys exist both with and
 * without the article.
 */
export function searchKeys(name: string): string[] {
  const full = toSearchName(name);
  const bare = toSearchName(toSortName(name));
  return bare === full ? [full] : [full, bare];
}

export function toSlug(name: string): string {
  return toSearchName(name)
    .replace(/'/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
