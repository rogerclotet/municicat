/**
 * Wikimedia's `Special:FilePath` endpoint renders a raster thumbnail at the requested
 * width and redirects to the CDN, which spares us from vendoring ~3.000 files and gives
 * SVG coats of arms as PNG for free.
 */
export function commonsThumb(url: string, width: number): string {
  return `${url}?width=${width}`;
}

/** The human-readable Commons page for a file, for attribution links. */
export function commonsFilePage(url: string): string {
  const file = url.split("/Special:FilePath/")[1];
  return file
    ? `https://commons.wikimedia.org/wiki/File:${file}`
    : "https://commons.wikimedia.org";
}
