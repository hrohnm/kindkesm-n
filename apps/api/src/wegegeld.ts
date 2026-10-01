/**
 * Wegegeld eines Tages (§ 11 Anlage 1.1): wird nach jedem Speichern eines Besuchs neu berechnet.
 *
 * - Zählt alle abgeschlossenen aufsuchenden Besuche (Leistungsart 1) einer Hebamme an einem Tag.
 * - Reihenfolge aus der Tour (falls geplant), sonst nach Uhrzeit.
 * - Strecke: Ausgangspunkt (Routenkonfiguration, Standard Wohnort) → Familien → Ausgangspunkt.
 *   Mehrere Familien auf einem Weg teilen sich die Gesamtstrecke (50200 mit Anzahl).
 * - Wegegeld-Zeilen hängen am jeweiligen Besuch (leistung.quelle = "wegegeld") und laufen so in die Abrechnung.
 */
import { wegegeldAufteilen, type WegegeldRegel } from "@kindkesmoeoen/shared";
import { and, asc, eq, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { config } from "./config";
import type { Datenbank } from "./db/client";
import { besuch, betreuung, klientin, leistung, ort, termin, tour, tourvorlage, wegegeldTag } from "./db/schema";
import { routingFuer, type Punkt } from "./geo/routing";
import { regelwerkFuer } from "./regelwerk-laden";

export const routing = routingFuer(config.osrmUrl, (t) => console.warn(t));

type Hinweis = { stufe: "fehler" | "warnung" | "info"; text: string };

/** ISO-Wochentag 1 (Mo) … 7 (So) eines Datums JJJJ-MM-TT */
export function wochentag(datum: string): number {
  const t = new Date(`${datum}T12:00:00Z`).getUTCDay();
  return t === 0 ? 7 : t;
}

/** Ausgangspunkt für das Wegegeld: Tour des Tages → Tourvorlage des Wochentags → Wohnort → Praxis. */
export async function ausgangsOrt(db: Datenbank, hebammeId: string, datum: string) {
  const [t] = await db.select({ id: tour.wegegeldAusgangsOrtId }).from(tour).where(and(eq(tour.hebammeId, hebammeId), eq(tour.datum, datum)));
  let id = t?.id;
  if (!id) {
    const vorlagen = await db.select().from(tourvorlage).where(eq(tourvorlage.benutzerId, hebammeId)).orderBy(asc(tourvorlage.erstelltAm));
    id = vorlagen.find((v) => v.wochentage.includes(wochentag(datum)))?.wegegeldAusgangsOrtId;
  }
  if (!id) {
    const [privat] = await db.select({ id: ort.id }).from(ort).where(and(eq(ort.benutzerId, hebammeId), eq(ort.typ, "privat"))).limit(1);
    const [praxis] = privat ? [privat] : await db.select({ id: ort.id }).from(ort).where(and(isNull(ort.benutzerId), eq(ort.typ, "praxis"))).limit(1);
    id = praxis?.id;
  }
  if (!id) return undefined;
  const [o] = await db.select().from(ort).where(eq(ort.id, id));
  return o;
}

export const ortPunkt = (o: { lat: string | number | null; lon: string | number | null } | undefined): Punkt | null =>
  o && o.lat != null && o.lon != null ? { lat: Number(o.lat), lon: Number(o.lon) } : null;

export type WegegeldStand = typeof wegegeldTag.$inferSelect & {
  zeilen: Array<{ besuchId: string; name: string; ort: string | null; gpos: string; km: number; betrag: string; txt: string | null; versendet: boolean }>;
  gesperrt: boolean;
};

export async function wegegeldStand(db: Datenbank, hebammeId: string, datum: string): Promise<WegegeldStand | null> {
  const [tag] = await db.select().from(wegegeldTag).where(and(eq(wegegeldTag.hebammeId, hebammeId), eq(wegegeldTag.datum, datum)));
  if (!tag) return null;
  const zeilen = await db
    .select({
      besuchId: leistung.besuchId,
      name: sql<string>`${klientin.vorname} || ' ' || ${klientin.nachname}`,
      ort: klientin.ort,
      gpos: leistung.gpos,
      km: leistung.menge,
      betrag: leistung.betrag,
      txt: leistung.txt,
      versendet: sql<boolean>`${leistung.versandId} is not null`,
    })
    .from(leistung)
    .innerJoin(besuch, eq(besuch.id, leistung.besuchId))
    .innerJoin(betreuung, eq(betreuung.id, besuch.betreuungId))
    .innerJoin(klientin, eq(klientin.id, betreuung.klientinId))
    .where(and(eq(leistung.hebammeId, hebammeId), eq(leistung.datum, datum), eq(leistung.quelle, "wegegeld")))
    .orderBy(asc(besuch.von));
  return { ...tag, zeilen, gesperrt: zeilen.some((z) => z.versendet) };
}

/** Berechnet das Wegegeld eines Tages neu (außer es ist schon einem Versand zugeordnet). */
export async function wegegeldNeuBerechnen(db: Datenbank, hebammeId: string, datum: string): Promise<WegegeldStand | null> {
  const gesperrt = await db
    .select({ id: leistung.id })
    .from(leistung)
    .where(and(eq(leistung.hebammeId, hebammeId), eq(leistung.datum, datum), eq(leistung.quelle, "wegegeld"), or(isNotNull(leistung.versandId), ne(leistung.status, "erfasst"))))
    .limit(1);
  if (gesperrt.length) return wegegeldStand(db, hebammeId, datum);

  const [einstellung] = await db.select().from(wegegeldTag).where(and(eq(wegegeldTag.hebammeId, hebammeId), eq(wegegeldTag.datum, datum)));
  const besuche = await db
    .select({ b: besuch, k: klientin, reihenfolge: termin.reihenfolge })
    .from(besuch)
    .innerJoin(betreuung, eq(betreuung.id, besuch.betreuungId))
    .innerJoin(klientin, eq(klientin.id, betreuung.klientinId))
    .leftJoin(termin, eq(termin.besuchId, besuch.id))
    .where(and(eq(besuch.hebammeId, hebammeId), eq(besuch.datum, datum), eq(besuch.status, "abgeschlossen"), eq(besuch.art, 1)))
    .orderBy(asc(besuch.von));
  // Mit geplanter Tour zählt die gefahrene Reihenfolge
  if (besuche.every((x) => x.reihenfolge != null)) besuche.sort((a, b) => a.reihenfolge! - b.reihenfolge!);

  const hinweise: Hinweis[] = [];
  const ausgang = await ausgangsOrt(db, hebammeId, datum);
  const rw = await regelwerkFuer(db, datum);
  const regel = rw?.wegegeld as WegegeldRegel | undefined;
  const satz = (gpos: string) => rw?.positionen.find((p) => p.gpos === gpos);

  let gesamtMeter: number | null = null;
  let quelle: "osrm" | "luftlinie" | "manuell" | null = null;
  let neueZeilen: Array<typeof leistung.$inferInsert> = [];

  if (!besuche.length) {
    // nichts abzurechnen
  } else if (!regel || !rw) {
    hinweise.push({ stufe: "fehler", text: "Im Regelwerk fehlen die Angaben zum Wegegeld." });
  } else {
    const start = ortPunkt(ausgang);
    const ohnePosition = besuche.filter((x) => x.k.lat == null || x.k.lon == null);
    const manuell = einstellung?.manuellKm != null;
    if (!ausgang) hinweise.push({ stufe: "fehler", text: "Kein Ausgangspunkt: Bitte unter Einstellungen → Orte & Touren die Wohnanschrift anlegen." });
    else if (!start && !manuell) hinweise.push({ stufe: "fehler", text: `Für den Ausgangspunkt „${ausgang.bezeichnung}“ ist keine Position bekannt. Bitte auf der Karte setzen.` });
    if (ohnePosition.length && !manuell) {
      hinweise.push({ stufe: "fehler", text: `Position der Wohnung fehlt: ${ohnePosition.map((x) => `${x.k.vorname} ${x.k.nachname}`).join(", ")}. Bitte in der Akte auf der Karte setzen oder die Kilometer von Hand eintragen.` });
    }
    if (ausgang && (start || manuell) && (!ohnePosition.length || manuell)) {
      const faktor = regel.hin_und_rueckweg === false ? 1 : 2;
      const punkte = start && !ohnePosition.length ? [start, ...besuche.map((x) => ({ lat: x.k.lat!, lon: x.k.lon! }))] : null;
      const direkt = punkte ? (await routing.matrix(punkte)).meter[0]!.slice(1) : besuche.map(() => 0);
      const begruendungen = einstellung?.begruendungen ?? {};
      const eingaben = besuche.map((x, i) => ({ id: x.b.id, direktMeter: direkt[i]!, begruendung: begruendungen[x.b.id] ?? null }));
      let ergebnis;
      if (manuell) {
        quelle = "manuell";
        gesamtMeter = Math.round(einstellung!.manuellKm! * 1000);
        ergebnis = einstellung!.getrennteWege
          ? eingaben.flatMap((e) => wegegeldAufteilen(gesamtMeter! / eingaben.length, [e], regel))
          : wegegeldAufteilen(gesamtMeter, eingaben, regel);
      } else if (einstellung?.getrennteWege) {
        const m = await routing.matrix(punkte!);
        quelle = m.quelle;
        ergebnis = eingaben.flatMap((e, i) => wegegeldAufteilen(m.meter[0]![i + 1]! + (faktor === 2 ? m.meter[i + 1]![0]! : 0), [e], regel));
        gesamtMeter = ergebnis.reduce((s, z) => s + z.km * 1000, 0);
      } else {
        const weg = await routing.strecke(faktor === 2 ? [...punkte!, start!] : punkte!);
        quelle = weg.quelle;
        gesamtMeter = weg.meter;
        ergebnis = wegegeldAufteilen(weg.meter, eingaben, regel);
      }
      if (quelle === "luftlinie") hinweise.push({ stufe: "info", text: "Kilometer geschätzt (Luftlinie × 1,3), weil kein Routing-Server eingerichtet ist. Vor dem Versand prüfen." });
      for (const z of ergebnis) {
        const x = besuche.find((y) => y.b.id === z.id)!;
        const p = satz(z.gpos);
        for (const h of z.hinweise) hinweise.push({ stufe: h.stufe, text: `${x.k.vorname} ${x.k.nachname}: ${h.text}` });
        const txt = [z.gpos === regel.gpos_anteilig ? `Anzahl Versicherte: ${z.anzahl}` : null, begruendungen[z.id] ? `Begründung: ${begruendungen[z.id]}` : null].filter(Boolean).join(" · ") || null;
        neueZeilen.push({
          besuchId: z.id,
          hebammeId,
          regelwerkId: rw.id,
          gpos: z.gpos,
          bezeichnung: p?.bezeichnung ?? "Wegegeld",
          datum,
          menge: z.km,
          einheit: "km",
          einzelbetrag: regel.satz_je_km.toFixed(2),
          betrag: z.betrag.toFixed(2),
          zuschlag: false,
          formular: null,
          quittierungspflichtig: false,
          quelle: "wegegeld",
          txt,
        });
      }
      neueZeilen = neueZeilen.filter((z) => z.menge > 0);
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(leistung).where(and(eq(leistung.hebammeId, hebammeId), eq(leistung.datum, datum), eq(leistung.quelle, "wegegeld")));
    if (neueZeilen.length) await tx.insert(leistung).values(neueZeilen);
    const werte = { ausgangsOrtId: ausgang?.id ?? null, gesamtMeter: gesamtMeter == null ? null : Math.round(gesamtMeter), quelle, hinweise, berechnetAm: new Date() };
    await tx
      .insert(wegegeldTag)
      .values({ hebammeId, datum, ...werte })
      .onConflictDoUpdate({ target: [wegegeldTag.hebammeId, wegegeldTag.datum], set: werte });
  });
  return wegegeldStand(db, hebammeId, datum);
}

/** Berechnet alle Tage neu, an denen Besuche einer Klientin liegen (z. B. nach Korrektur der Position). */
export async function wegegeldFuerKlientin(db: Datenbank, klientinId: string) {
  const tage = await db
    .selectDistinct({ hebammeId: besuch.hebammeId, datum: besuch.datum })
    .from(besuch)
    .innerJoin(betreuung, eq(betreuung.id, besuch.betreuungId))
    .where(and(eq(betreuung.klientinId, klientinId), eq(besuch.status, "abgeschlossen"), eq(besuch.art, 1)));
  for (const t of tage) await wegegeldNeuBerechnen(db, t.hebammeId, t.datum);
}

/** Berechnet die Tage mit Besuchen neu, deren Wegegeld noch offen ist (z. B. nach Änderung eines Ortes). */
export async function wegegeldOffeneTage(db: Datenbank, hebammeId: string) {
  const tage = await db
    .selectDistinct({ datum: besuch.datum })
    .from(besuch)
    .where(and(eq(besuch.hebammeId, hebammeId), eq(besuch.status, "abgeschlossen"), eq(besuch.art, 1)));
  const versendet = await db
    .selectDistinct({ datum: leistung.datum })
    .from(leistung)
    .where(and(eq(leistung.hebammeId, hebammeId), isNotNull(leistung.versandId)));
  const zu = new Set(versendet.map((v) => v.datum));
  const offen = tage.map((t) => t.datum).filter((d) => !zu.has(d));
  for (const d of offen) await wegegeldNeuBerechnen(db, hebammeId, d);
  return offen.length;
}
