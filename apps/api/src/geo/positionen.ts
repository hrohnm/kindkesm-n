/** Positionen (Koordinaten) von Klientinnen und Orten aus dem Adressverzeichnis ergänzen. */
import { eq, isNull, ne, or } from "drizzle-orm";
import type { Datenbank } from "../db/client";
import { klientin, ort } from "../db/schema";
import { anschriftZerlegen, geokodieren } from "./adressen";

export async function klientinVerorten(db: Datenbank, id: string): Promise<void> {
  const [k] = await db.select().from(klientin).where(eq(klientin.id, id));
  if (!k || k.geoQuelle === "manuell") return;
  const t = await geokodieren(db, { strasse: k.strasse, plz: k.plz, ort: k.ort });
  await db
    .update(klientin)
    .set(t ? { lat: t.lat, lon: t.lon, geoQuelle: t.quelle } : { lat: null, lon: null, geoQuelle: null })
    .where(eq(klientin.id, id));
}

export async function ortVerorten(db: Datenbank, id: string): Promise<void> {
  const [o] = await db.select().from(ort).where(eq(ort.id, id));
  if (!o) return;
  const a = anschriftZerlegen(o.anschrift);
  const t = await geokodieren(db, a);
  if (t) await db.update(ort).set({ lat: t.lat.toFixed(6), lon: t.lon.toFixed(6) }).where(eq(ort.id, id));
}

/** Ergänzt fehlende Positionen; mit alleNeu werden auch vorhandene (nicht von Hand gesetzte) neu bestimmt. */
export async function fehlendeKoordinatenErgaenzen(db: Datenbank, alleNeu: boolean) {
  const ks = await db
    .select({ id: klientin.id })
    .from(klientin)
    .where(alleNeu ? or(isNull(klientin.geoQuelle), ne(klientin.geoQuelle, "manuell")) : isNull(klientin.lat));
  for (const k of ks) await klientinVerorten(db, k.id);
  const os = await db.select({ id: ort.id }).from(ort).where(alleNeu ? undefined : isNull(ort.lat));
  for (const o of os) await ortVerorten(db, o.id);
  const [nachher] = await db.select({ id: klientin.id }).from(klientin).where(isNull(klientin.lat)).limit(1);
  return { klientinnen: ks.length, orte: os.length, offen: !!nachher };
}
