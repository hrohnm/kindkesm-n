/**
 * M22: Statistik für ein Jahr. Für das Team: Besuche, betreute Familien und Geburten je Monat und je Hebamme,
 * Wohnorte der Familien, Kursauslastung. Nur für die angemeldete Hebamme selbst (sie rechnet einzeln ab):
 * Umsatz Kasse, offene Beträge und dienstliche Kilometer. Selbstzahler-Umsatz folgt mit M13.
 */
import { and, asc, eq, gte, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Datenbank } from "../db/client";
import { benutzer, besuch, betreuung, fahrt, kind, klientin, kurs, kursTeilnahme, kurstermin, leistung, versand } from "../db/schema";

const MONATE = (jahr: number) => Array.from({ length: 12 }, (_, i) => `${jahr}-${String(i + 1).padStart(2, "0")}`);
const zahl = (v: unknown) => Number(v ?? 0);

export async function statistikRouten(app: FastifyInstance, db: Datenbank) {
  app.get<{ Querystring: { jahr?: string } }>("/api/statistik", async (request, reply) => {
    if (request.benutzer?.rolle !== "hebamme") return reply.code(403).send({ fehler: "Nur für Hebammen" });
    const ich = request.benutzer.id;
    const jetzt = new Date().getFullYear();
    const jahr = /^\d{4}$/.test(request.query.jahr ?? "") ? Math.min(jetzt + 1, Math.max(2000, Number(request.query.jahr))) : jetzt;
    const von = `${jahr}-01-01`;
    const bis = `${jahr}-12-31`;
    const monat = (spalte: unknown) => sql<string>`to_char(${spalte}, 'YYYY-MM')`;
    const imJahr = (spalte: Parameters<typeof gte>[0]) => and(gte(spalte, von), lte(spalte, bis));

    const hebammen = await db
      .select({ id: benutzer.id, name: benutzer.name, kuerzel: benutzer.kuerzel, status: benutzer.status })
      .from(benutzer)
      .where(and(eq(benutzer.rolle, "hebamme"), ne(benutzer.status, "ausgeschieden")))
      .orderBy(asc(benutzer.name));

    // Besuche (abgeschlossen) und betreute Familien je Monat und Hebamme
    const besuche = await db
      .select({ hebammeId: besuch.hebammeId, monat: monat(besuch.datum), besuche: sql<number>`count(*)::int`, familien: sql<number>`count(distinct ${besuch.betreuungId})::int` })
      .from(besuch)
      .where(and(eq(besuch.status, "abgeschlossen"), imJahr(besuch.datum)))
      .groupBy(besuch.hebammeId, monat(besuch.datum));
    const familienJahr = await db
      .select({ hebammeId: besuch.hebammeId, familien: sql<number>`count(distinct ${besuch.betreuungId})::int` })
      .from(besuch)
      .where(and(eq(besuch.status, "abgeschlossen"), imJahr(besuch.datum)))
      .groupBy(besuch.hebammeId);
    const [familienGesamt] = await db
      .select({ n: sql<number>`count(distinct ${besuch.betreuungId})::int` })
      .from(besuch)
      .where(and(eq(besuch.status, "abgeschlossen"), imJahr(besuch.datum)));

    // Geburten (Kinder) je Monat, zugeordnet der zuständigen Hebamme
    const zustaendig = sql<string>`coalesce(${betreuung.zustaendigeHebammeId}, ${klientin.zustaendigeHebammeId})`;
    const geburten = await db
      .select({ hebammeId: zustaendig, monat: monat(kind.geburtsdatum), n: sql<number>`count(*)::int` })
      .from(kind)
      .innerJoin(betreuung, eq(betreuung.id, kind.betreuungId))
      .innerJoin(klientin, eq(klientin.id, betreuung.klientinId))
      .where(imJahr(kind.geburtsdatum))
      .groupBy(zustaendig, monat(kind.geburtsdatum));

    const monate = MONATE(jahr).map((m) => ({
      monat: m,
      besuche: besuche.filter((b) => b.monat === m).reduce((s, b) => s + b.besuche, 0),
      geburten: geburten.filter((g) => g.monat === m).reduce((s, g) => s + g.n, 0),
      eigeneBesuche: besuche.filter((b) => b.monat === m && b.hebammeId === ich).reduce((s, b) => s + b.besuche, 0),
    }));
    const jeHebamme = hebammen.map((h) => ({
      ...h,
      besuche: besuche.filter((b) => b.hebammeId === h.id).reduce((s, b) => s + b.besuche, 0),
      familien: familienJahr.find((f) => f.hebammeId === h.id)?.familien ?? 0,
      geburten: geburten.filter((g) => g.hebammeId === h.id).reduce((s, g) => s + g.n, 0),
    }));

    // Wohnorte der im Jahr besuchten Familien
    const orte = await db
      .select({ ort: sql<string>`coalesce(nullif(${klientin.ort}, ''), 'ohne Angabe')`, familien: sql<number>`count(distinct ${klientin.id})::int` })
      .from(besuch)
      .innerJoin(betreuung, eq(betreuung.id, besuch.betreuungId))
      .innerJoin(klientin, eq(klientin.id, betreuung.klientinId))
      .where(and(eq(besuch.status, "abgeschlossen"), imJahr(besuch.datum)))
      .groupBy(sql`coalesce(nullif(${klientin.ort}, ''), 'ohne Angabe')`)
      .orderBy(sql`count(distinct ${klientin.id}) desc`)
      .limit(10);

    // Kurse mit Terminen im Jahr: Auslastung
    const kursTermine = await db
      .select({ kursId: kurstermin.kursId, n: sql<number>`count(*)::int`, erster: sql<string>`min(${kurstermin.datum})` })
      .from(kurstermin)
      .where(imJahr(kurstermin.datum))
      .groupBy(kurstermin.kursId);
    const kursIds = kursTermine.map((k) => k.kursId);
    const kursListe = kursIds.length ? await db.select({ id: kurs.id, titel: kurs.titel, art: kurs.art, max: kurs.maxTeilnehmer, status: kurs.status }).from(kurs).where(and(inArray(kurs.id, kursIds), ne(kurs.status, "abgesagt"))) : [];
    const belegung = kursIds.length
      ? await db
          .select({ kursId: kursTeilnahme.kursId, n: sql<number>`count(*) filter (where ${kursTeilnahme.status} in ('angemeldet', 'bestaetigt'))::int`, warteliste: sql<number>`count(*) filter (where ${kursTeilnahme.status} = 'warteliste')::int` })
          .from(kursTeilnahme)
          .where(inArray(kursTeilnahme.kursId, kursIds))
          .groupBy(kursTeilnahme.kursId)
      : [];
    const kurse = kursListe
      .map((k) => {
        const b = belegung.find((x) => x.kursId === k.id);
        const t = kursTermine.find((x) => x.kursId === k.id)!;
        return { id: k.id, titel: k.titel, art: k.art, termine: t.n, beginn: t.erster, teilnehmerinnen: b?.n ?? 0, warteliste: b?.warteliste ?? 0, plaetze: k.max, auslastung: k.max ? Math.round(((b?.n ?? 0) / k.max) * 100) : 0 };
      })
      .sort((a, b) => a.beginn.localeCompare(b.beginn));

    // Nur eigene Zahlen: Umsatz Kasse (Leistungen abgeschlossener Besuche), offene Beträge, Kilometer
    const umsatz = await db
      .select({ monat: monat(leistung.datum), summe: sql<string>`sum(${leistung.betrag})` })
      .from(leistung)
      .innerJoin(besuch, eq(besuch.id, leistung.besuchId))
      .where(and(eq(leistung.hebammeId, ich), eq(besuch.status, "abgeschlossen"), imJahr(leistung.datum)))
      .groupBy(monat(leistung.datum));
    const km = await db
      .select({ monat: monat(fahrt.datum), km: sql<string>`sum(${fahrt.kmDienstlich})` })
      .from(fahrt)
      .where(and(eq(fahrt.hebammeId, ich), imJahr(fahrt.datum)))
      .groupBy(monat(fahrt.datum));
    const [nichtVersendet] = await db
      .select({ summe: sql<string>`coalesce(sum(${leistung.betrag}), 0)` })
      .from(leistung)
      .innerJoin(besuch, eq(besuch.id, leistung.besuchId))
      .where(and(eq(leistung.hebammeId, ich), eq(besuch.status, "abgeschlossen"), isNull(leistung.versandId)));
    const [unbezahlt] = await db.select({ summe: sql<string>`coalesce(sum(${versand.summe}), 0)`, n: sql<number>`count(*)::int` }).from(versand).where(and(eq(versand.hebammeId, ich), eq(versand.status, "versendet")));

    const runden = (n: number) => Math.round(n * 100) / 100;
    return {
      jahr,
      summen: { besuche: monate.reduce((s, m) => s + m.besuche, 0), familien: familienGesamt?.n ?? 0, geburten: monate.reduce((s, m) => s + m.geburten, 0), kurse: kurse.length },
      monate,
      jeHebamme,
      orte,
      kurse,
      meins: {
        monate: MONATE(jahr).map((m) => ({ monat: m, umsatzKasse: runden(zahl(umsatz.find((u) => u.monat === m)?.summe)), km: zahl(km.find((k) => k.monat === m)?.km) })),
        umsatzKasse: runden(umsatz.reduce((s, u) => s + zahl(u.summe), 0)),
        km: Math.round(km.reduce((s, k) => s + zahl(k.km), 0) * 10) / 10,
        nichtVersendet: runden(zahl(nichtVersendet?.summe)),
        unbezahlt: runden(zahl(unbezahlt?.summe)),
        unbezahltAnzahl: unbezahlt?.n ?? 0,
      },
    };
  });
}
