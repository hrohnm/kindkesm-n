/**
 * M23: Erinnerungen im Cockpit aus ET und Geburtsdatum der eigenen bzw. vertretenen Betreuungen.
 * Jede Erinnerung lässt sich als erledigt abhaken (Tabelle hinweis_erledigt) und erscheint dann nicht mehr.
 */
import { etBald, isoDatum, rueckbildungAnbieten, uUntersuchungFaellig, type FristHinweis } from "@kindkesmoeoen/shared";
import { and, eq, gte, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import type { Datenbank } from "./db/client";
import { benutzer, betreuung, hinweisErledigt, kind, klientin, kurs, kursTeilnahme, rufbereitschaft } from "./db/schema";

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
  const hinweise: FristHinweis[] = [];
  // Rufbereitschaft heute (für das ganze Team)
  const ruf = await db
    .select({ id: rufbereitschaft.id, name: benutzer.name, hebammeId: rufbereitschaft.hebammeId, bis: rufbereitschaft.bis })
    .from(rufbereitschaft)
    .innerJoin(benutzer, eq(benutzer.id, rufbereitschaft.hebammeId))
    .where(and(lte(rufbereitschaft.von, heuteIso), gte(rufbereitschaft.bis, heuteIso)));
  for (const r of ruf) {
    hinweise.push({ id: `rufbereitschaft-${r.id}`, titel: r.hebammeId === benutzerId ? `Du hast heute Rufbereitschaft${r.bis > heuteIso ? ` (bis ${r.bis.split("-").reverse().join(".")})` : ""}` : `Rufbereitschaft heute: ${r.name}`, datum: heuteIso, tage: 0, stufe: "info", quelle: "Team", link: "/team" });
  }
  // Übergaben an mich als Vertretung (neue Übergabe → neue Kennung, erscheint wieder)
  const uebergaben = await db
    .select({ id: betreuung.id, am: betreuung.uebergabeAm, klientinId: klientin.id, vorname: klientin.vorname, nachname: klientin.nachname, von: benutzer.name })
    .from(betreuung)
    .innerJoin(klientin, eq(klientin.id, betreuung.klientinId))
    .leftJoin(benutzer, eq(benutzer.id, betreuung.uebergabeVon))
    .where(and(eq(betreuung.vertretungHebammeId, benutzerId), isNotNull(betreuung.uebergabe), isNotNull(betreuung.uebergabeAm), inArray(betreuung.status, ["schwangerschaft", "wochenbett"])));
  for (const u of uebergaben) {
    hinweise.push({ id: `auto-uebergabe-${u.id}-${u.am!.getTime()}`, titel: `Übergabe für dich: ${u.vorname} ${u.nachname}${u.von ? ` (von ${u.von.split(" ")[0]})` : ""}`, datum: isoDatum(u.am!), tage: 0, stufe: "info", quelle: "Vertretung – bitte lesen", link: `/klientinnen/${u.klientinId}`, erledigbar: true });
  }
  if (!meine.length) return filtern(db, benutzerId, hinweise);
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
  return filtern(db, benutzerId, hinweise);
}

/** Doppelte (z. B. Rückbildung bei Mehrlingen) zusammenfassen, Erledigtes ausblenden */
async function filtern(db: Datenbank, benutzerId: string, hinweise: FristHinweis[]) {
  const eindeutig = [...new Map(hinweise.map((h) => [h.id, h])).values()];
  if (!eindeutig.length) return [];
  const erledigt = new Set(
    (await db.select({ id: hinweisErledigt.hinweisId }).from(hinweisErledigt).where(and(eq(hinweisErledigt.benutzerId, benutzerId), inArray(hinweisErledigt.hinweisId, eindeutig.map((h) => h.id))))).map((e) => e.id),
  );
  return eindeutig.filter((h) => !erledigt.has(h.id));
}
