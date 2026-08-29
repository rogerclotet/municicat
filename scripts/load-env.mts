/**
 * Side-effect module: reads `.env.local` on import.
 *
 * Next loads it for the app, but standalone scripts and drizzle-kit run outside that
 * lifecycle. Import this *before* any module that reads `process.env`, since ES modules
 * evaluate in import-declaration order.
 */
try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
