/**
 * Geokodierung über das eigene Adressverzeichnis (Tabelle "adresse", Hausnummern aus OpenStreetMap).
 * Adressen der Familien verlassen dadurch nie den Server. Import: scripts/karte-einrichten.sh.
 */
import { and, eq, sql } from "drizzle-orm";
import type { Datenbank } from "../db/client";
import { adresse } from "../db/schema";

export type Treffer = { lat: number; lon: number; quelle: "adresse" | "strasse" };

/** Vereinheitlicht Straßennamen: "Mollistraße" = "Molli-Str." = "mollistr" */
export function strasseNormieren(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/str(\.|asse|aße)?(?=\s|$|-)/g, "str")
    .replace(/[^a-z0-9]/g, "");
}

export function hausnummerNormieren(h: string): string {
  return h.toLowerCase().replace(/\s+/g, "");
}

/** Trennt "Dammchaussee 12a" in Straße und Hausnummer. */
export function strasseZerlegen(s: string): { strasse: string; hausnummer: string | null } {
  const m = s.trim().match(/^(.*?)[\s,]+(\d+\s*[a-zA-Z]?(?:\s*[-/]\s*\d+\s*[a-zA-Z]?)?)$/);
  return m ? { strasse: m[1]!.trim(), hausnummer: m[2]!.replace(/\s+/g, "") } : { strasse: s.trim(), hausnummer: null };
}

/** Zerlegt eine einzeilige Anschrift "Am Markt 1, 18209 Bad Doberan". */
export function anschriftZerlegen(a: string): { strasse: string; plz: string | null; ort: string | null } {
  const m = a.trim().match(/^(.*?),?\s*(\d{5})\s+(.+)$/);
  if (!m) return { strasse: a.trim(), plz: null, ort: null };
  return { strasse: m[1]!.replace(/,\s*$/, "").trim(), plz: m[2]!, ort: m[3]!.trim() };
}

export async function geokodieren(db: Datenbank, eingabe: { strasse?: string | null; plz?: string | null; ort?: string | null }): Promise<Treffer | null> {
  if (!eingabe.strasse) return null;
  const { strasse, hausnummer } = strasseZerlegen(eingabe.strasse);
  const norm = strasseNormieren(strasse);
  if (!norm) return null;
  const mittel = { lat: sql<number>`avg(${adresse.lat})::float8`, lon: sql<number>`avg(${adresse.lon})::float8`, anzahl: sql<number>`count(*)::int` };
  const suchen = async (...bedingungen: ReturnType<typeof eq>[]) => {
    const [r] = await db.select(mittel).from(adresse).where(and(...bedingungen));
    return r && r.anzahl > 0 ? { lat: Number(r.lat), lon: Number(r.lon) } : null;
  };
  const ortBedingung = eingabe.plz ? eq(adresse.plz, eingabe.plz) : eingabe.ort ? sql`lower(${adresse.ort}) = lower(${eingabe.ort})` : null;
  if (!ortBedingung) return null;

  if (hausnummer) {
    const h = hausnummerNormieren(hausnummer);
    const genau = await suchen(ortBedingung as ReturnType<typeof eq>, eq(adresse.strasseNorm, norm), eq(adresse.hausnummer, h));
    if (genau) return { ...genau, quelle: "adresse" };
    const zahl = h.match(/^\d+/)?.[0];
    if (zahl && zahl !== h) {
      const ohneZusatz = await suchen(ortBedingung as ReturnType<typeof eq>, eq(adresse.strasseNorm, norm), eq(adresse.hausnummer, zahl));
      if (ohneZusatz) return { ...ohneZusatz, quelle: "adresse" };
    }
  }
  const strasseMitte = await suchen(ortBedingung as ReturnType<typeof eq>, eq(adresse.strasseNorm, norm));
  if (strasseMitte) return { ...strasseMitte, quelle: "strasse" };
  if (eingabe.plz && eingabe.ort) {
    const perOrt = await suchen(sql`lower(${adresse.ort}) = lower(${eingabe.ort})` as ReturnType<typeof eq>, eq(adresse.strasseNorm, norm));
    if (perOrt) return { ...perOrt, quelle: "strasse" };
  }
  return null;
}

export async function anzahlAdressen(db: Datenbank): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(adresse);
  return r?.n ?? 0;
}

/** Liest Adressen im Format plz;ort;strasse;hausnummer;lat;lon (eine je Zeile) und ersetzt das Verzeichnis. */
export async function adressenImportieren(db: Datenbank, zeilen: AsyncIterable<string>): Promise<number> {
  // Iterator sofort holen: readline puffert Zeilen erst ab diesem Moment (sonst gehen sie während des ersten await verloren)
  const iterator = zeilen[Symbol.asyncIterator]();
  const quelle = { [Symbol.asyncIterator]: () => iterator };
  let anzahl = 0;
  await db.transaction(async (tx) => {
    await tx.delete(adresse);
    let stapel: Array<typeof adresse.$inferInsert> = [];
    const schreiben = async () => {
      if (stapel.length) await tx.insert(adresse).values(stapel);
      anzahl += stapel.length;
      stapel = [];
    };
    for await (const zeile of quelle) {
      const [plz, ort, strasse, hausnummer, lat, lon] = zeile.split(";");
      if (!plz || !ort || !strasse || !hausnummer || !lat || !lon || plz === "plz") continue;
      const la = Number(lat), lo = Number(lon);
      if (!Number.isFinite(la) || !Number.isFinite(lo)) continue;
      stapel.push({ plz, ort, strasse, strasseNorm: strasseNormieren(strasse), hausnummer: hausnummerNormieren(hausnummer), lat: la, lon: lo });
      if (stapel.length >= 2000) await schreiben();
    }
    await schreiben();
  });
  return anzahl;
}
