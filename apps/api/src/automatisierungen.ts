/**
 * M23: Erinnerungen im Cockpit aus ET und Geburtsdatum der eigenen bzw. vertretenen Betreuungen.
 * Jede Erinnerung lässt sich als erledigt abhaken (Tabelle hinweis_erledigt) und erscheint dann nicht mehr.
 */
import { etBald, isoDatum, rueckbildungAnbieten, uUntersuchungFaellig, type FristHinweis } from "@kindkesmoeoen/shared";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { Datenbank } from "./db/client";
import { betreuung, hinweisErledigt, kind, klientin, kurs, kursTeilnahme } from "./db/schema";

export async function erinnerungen(db: Datenbank, benutzerId: string, heute: Date): Promise<FristHinweis[]> {
  const heuteIso = isoDatum(heute);
  const meine = await db
    .select({ id: betreuung.id, status: betreuung.status, et: betreuung.et, klientinId: klientin.id, vorname: klientin.vorname, nachname: klientin.nachname })
    .from(betreuung)
    .innerJoin(klientin, eq(klientin.id, betreuung.klientinId))
    .where(
      and(
        inArray(betreuung.status, ["schwangerschaft", "wochenbett"]),
        eq(klientin.archiviert, false),
        or(sql`coalesce(${betreuung.zustaendigeHebammeId}, ${klientin.zustaendigeHebammeId}) = ${benutzerId}`, eq(betreuung.vertretungHebammeId, benutzerId)),
      ),
    );
  if (!meine.length) return [];
  const hinweise: FristHinweis[] = [];
  const kinder = await db.select().from(kind).where(inArray(kind.betreuungId, meine.map((b) => b.id)));
  // Wer schon in einem Rückbildungskurs angemeldet ist, braucht keinen Vorschlag
  const imKurs = new Set(
    (
      await db
        .select({ klientinId: kursTeilnahme.klientinId })
        .from(kursTeilnahme)
        .innerJoin(kurs, eq(kurs.id, kursTeilnahme.kursId))
        .where(and(eq(kurs.art, "rueckbildung"), inArray(kursTeilnahme.status, ["angemeldet", "bestaetigt", "warteliste"])))
    ).map((t) => t.klientinId),
  );

  for (const b of meine) {
    const name = `${b.vorname} ${b.nachname}`;
    if (b.status === "schwangerschaft") {
      const et = etBald(b.et, heuteIso);
      if (et) {
        hinweise.push({
          id: `auto-et-${b.id}`,
          titel: `ET von ${name} ${et.tage === 0 ? "ist heute" : `in ${et.tage} ${et.tage === 1 ? "Tag" : "Tagen"}`} – Wochenbett vorbereiten`,
          datum: b.et!,
          tage: et.tage,
          stufe: "info",
          quelle: "Erinnerung – Erstbesuch planen, Material, Kinderärztin/Klinik notiert?",
          link: `/klientinnen/${b.klientinId}`,
          erledigbar: true,
        });
      }
    }
    for (const k of kinder.filter((x) => x.betreuungId === b.id)) {
      const u = uUntersuchungFaellig(k.geburtsdatum, heuteIso);
      if (u) {
        hinweise.push({ id: `auto-${u.id.toLowerCase()}-${k.id}`, titel: `${u.id} für ${k.vorname} steht an (${u.zeitraum}) – Eltern erinnern`, datum: heuteIso, tage: 0, stufe: "info", quelle: "Erinnerung – Kinderärztliche Früherkennung", link: `/klientinnen/${b.klientinId}`, erledigbar: true });
      }
      const rb = rueckbildungAnbieten(k.geburtsdatum, heuteIso);
      if (rb && !imKurs.has(b.klientinId)) {
        hinweise.push({ id: `auto-rueckbildung-${b.id}`, titel: `Rückbildungskurs anbieten: ${name} (Kind in der ${rb.woche}. Lebenswoche)`, datum: heuteIso, tage: 0, stufe: "info", quelle: "Erinnerung – Kurse", link: "/kurse", erledigbar: true });
      }
    }
  }
  // Doppelte (z. B. Rückbildung bei Mehrlingen) zusammenfassen, Erledigtes ausblenden
  const eindeutig = [...new Map(hinweise.map((h) => [h.id, h])).values()];
  if (!eindeutig.length) return [];
  const erledigt = new Set(
    (await db.select({ id: hinweisErledigt.hinweisId }).from(hinweisErledigt).where(and(eq(hinweisErledigt.benutzerId, benutzerId), inArray(hinweisErledigt.hinweisId, eindeutig.map((h) => h.id))))).map((e) => e.id),
  );
  return eindeutig.filter((h) => !erledigt.has(h.id));
}
