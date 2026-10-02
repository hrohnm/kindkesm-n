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
  /** Anmeldeversuche je IP-Adresse in 15 Minuten (Schutz vor Passwort-Raten; für automatische Tests höher setzbar). */
  anmeldungMax: Number(process.env.ANMELDUNG_MAX ?? 10),
  /** Laufzeit einer Sitzung in Stunden. */
  sitzungStunden: Number(process.env.SITZUNG_STUNDEN ?? 12),
  /** Basisordner des Repositorys (Regelwerk- und Konfigurationsdateien für den Import). */
  datenOrdner: process.env.DATEN_ORDNER ?? wurzel,
  /** OSRM-Server für Straßenstrecken (leer = Schätzung aus der Luftlinie). */
  osrmUrl: process.env.OSRM_URL || undefined,
  /** Kartenkacheln für die Kartenansicht im Browser ({z}/{x}/{y}); leer = keine Karte. */
  kartenKacheln: process.env.KARTE_KACHELN ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  kartenHinweis: process.env.KARTE_HINWEIS ?? "© OpenStreetMap-Mitwirkende",
  /**
   * Online-Adresssuche (Nominatim-kompatibel), nur wenn das eigene Adressverzeichnis keinen Treffer hat.
   * Übermittelt werden nur Straße, PLZ und Ort – keine Namen. "aus" schaltet sie ab (in Tests immer aus).
   */
  geocoderUrl:
    process.env.GEOCODER_URL === "aus" || process.env.NODE_ENV === "test" || process.env.VITEST
      ? undefined
      : (process.env.GEOCODER_URL || "https://nominatim.openstreetmap.org").replace(/\/$/, ""),
  /** Kontakt (E-Mail) für die Kennung bei der Online-Adresssuche (Nutzungsregeln von Nominatim) */
  geocoderKontakt: process.env.GEOCODER_KONTAKT || undefined,
  /** Ordner mit den SQL-Migrationen. */
  migrationsOrdner: process.env.MIGRATIONS_ORDNER ?? join(wurzel, "apps/api/drizzle"),
};
