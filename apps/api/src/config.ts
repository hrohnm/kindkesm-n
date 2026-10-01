import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Laufzeit-Konfiguration aus Umgebungsvariablen. */

/** Sucht ausgehend von dieser Datei nach oben den Repository-Ordner (erkennbar am Ordner "regelwerk"). */
function repoWurzel(): string {
  let ordner = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(ordner, "regelwerk"))) return ordner;
    ordner = dirname(ordner);
  }
  return process.cwd();
}
const wurzel = repoWurzel();
function pflicht(name: string, standard?: string): string {
  const wert = process.env[name] ?? standard;
  if (!wert) throw new Error(`Umgebungsvariable ${name} fehlt`);
  return wert;
}

export const config = {
  databaseUrl: pflicht("DATABASE_URL", "postgres://kindkes:kindkes@localhost:5432/kindkes"),
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "0.0.0.0",
  produktion: process.env.NODE_ENV === "production",
  /** Schnellanmeldung mit Demo-Konten auf der Login-Seite: in der Entwicklung an, im Betrieb nur mit DEMO_MODUS=ja. */
  demoModus: process.env.DEMO_MODUS ? process.env.DEMO_MODUS === "ja" : process.env.NODE_ENV !== "production",
  /** Ordner mit dem gebauten Frontend (wird von der API ausgeliefert). */
  webDist: process.env.WEB_DIST,
  /** Laufzeit einer Sitzung in Stunden. */
  sitzungStunden: Number(process.env.SITZUNG_STUNDEN ?? 12),
  /** Basisordner des Repositorys (Regelwerk- und Konfigurationsdateien für den Import). */
  datenOrdner: process.env.DATEN_ORDNER ?? wurzel,
  /** Ordner mit den SQL-Migrationen. */
  migrationsOrdner: process.env.MIGRATIONS_ORDNER ?? join(wurzel, "apps/api/drizzle"),
};
