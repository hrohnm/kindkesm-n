/**
 * M5: Teamkalender (Hausbesuche, Kurstermine, Abwesenheiten, Rufbereitschaft, Babypause je Hebamme) und
 * privates Kalender-Abo (ICS) für die eigene Kalender-App – im Abo nur Initialen, keine Gesundheitsdaten.
 * Der Abo-Link enthält ein zufälliges Token; gespeichert wird nur dessen SHA-256.
 */
import { ABWESENHEIT_ARTEN, icsErzeugen, initialen, terminZeitraum, type IcsEintrag } from "@kindkesmoeoen/shared";
import { randomBytes } from "node:crypto";
import { and, asc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { tokenHash } from "../auth";
import { config } from "../config";
import type { Datenbank } from "../db/client";
import { abwesenheit, benutzer, betreuung, klientin, kurs, kurstermin, rufbereitschaft, termin } from "../db/schema";
import { protokollieren } from "../protokoll";

export type KalenderEintrag = {
  id: string;
  art: "termin" | "kurs" | "abwesenheit" | "rufbereitschaft" | "babypause";
  hebammeId: string;
  datum: string;
  /** mehrtägig: letzter Tag (einschließlich) */
  bisDatum?: string;
  von?: string;
  bis?: string;
  titel: string;
  ort?: string | null;
  link?: string;
  status?: string;
};

const TYP_LABEL: Record<string, string> = {
  schwangerschaft: "Schwangerschaft",
  vorsorge: "Vorsorge",
  aufklaerung: "Aufklärung",
  stillvorbereitung: "Stillvorbereitung",
  wochenbett: "Wochenbett",
  geburtsvorbereitung: "Geburtsvorbereitung",
  rueckbildung: "Rückbildung",
};

const isoPlus = (iso: string, tage: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
};

function nurHebammen(request: FastifyRequest, reply: FastifyReply) {
  if (request.benutzer?.rolle !== "hebamme") {
    reply.code(403).send({ fehler: "Nur für Hebammen" });
    return false;
  }
  return true;
}

export async function kalenderEintraege(db: Datenbank, von: string, bis: string, nurHebamme?: string): Promise<KalenderEintrag[]> {
  const eintraege: KalenderEintrag[] = [];
  const termine = await db
    .select({ t: termin, vorname: klientin.vorname, nachname: klientin.nachname, klientinId: klientin.id })
    .from(termin)
    .innerJoin(betreuung, eq(betreuung.id, termin.betreuungId))
    .innerJoin(klientin, eq(klientin.id, betreuung.klientinId))
    .where(and(gte(termin.datum, von), lte(termin.datum, bis), ne(termin.status, "abgesagt"), nurHebamme ? eq(termin.hebammeId, nurHebamme) : undefined))
    .orderBy(asc(termin.datum), asc(termin.uhrzeit));
  for (const { t, vorname, nachname, klientinId } of termine) {
    const z = terminZeitraum(t);
    eintraege.push({ id: `termin-${t.id}`, art: "termin", hebammeId: t.hebammeId, datum: t.datum, von: z?.von, bis: z?.bis, titel: `${TYP_LABEL[t.typ] ?? "Besuch"}: ${vorname} ${nachname}`, link: `/klientinnen/${klientinId}`, status: t.status });
  }

  const kt = await db
    .select({ id: kurstermin.id, kursId: kurs.id, datum: kurstermin.datum, von: kurstermin.von, bis: kurstermin.bis, hebammeId: kurstermin.hebammeId, titel: kurs.titel, ort: kurs.ort, format: kurstermin.format })
    .from(kurstermin)
    .innerJoin(kurs, eq(kurs.id, kurstermin.kursId))
    .where(and(gte(kurstermin.datum, von), lte(kurstermin.datum, bis), ne(kurs.status, "abgesagt"), nurHebamme ? eq(kurstermin.hebammeId, nurHebamme) : undefined));
  for (const k of kt) eintraege.push({ id: `kurs-${k.id}`, art: "kurs", hebammeId: k.hebammeId, datum: k.datum, von: k.von, bis: k.bis, titel: k.titel, ort: k.format === 3 ? "online" : k.ort, link: `/kurse/${k.kursId}/termine/${k.id}` });

  const abw = await db.select().from(abwesenheit).where(and(lte(abwesenheit.von, bis), gte(abwesenheit.bis, von), nurHebamme ? eq(abwesenheit.benutzerId, nurHebamme) : undefined));
  for (const a of abw) eintraege.push({ id: `abwesenheit-${a.id}`, art: "abwesenheit", hebammeId: a.benutzerId, datum: a.von, bisDatum: a.bis, titel: ABWESENHEIT_ARTEN[a.art] });

  const ruf = await db.select().from(rufbereitschaft).where(and(lte(rufbereitschaft.von, bis), gte(rufbereitschaft.bis, von), nurHebamme ? eq(rufbereitschaft.hebammeId, nurHebamme) : undefined));
  for (const r of ruf) eintraege.push({ id: `ruf-${r.id}`, art: "rufbereitschaft", hebammeId: r.hebammeId, datum: r.von, bisDatum: r.bis, titel: `Rufbereitschaft${r.notiz ? ` (${r.notiz})` : ""}` });

  return eintraege.sort((a, b) => a.datum.localeCompare(b.datum) || (a.von ?? "").localeCompare(b.von ?? ""));
}

export async function kalenderRouten(app: FastifyInstance, db: Datenbank) {
  app.get<{ Querystring: { von?: string; tage?: string } }>("/api/kalender", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const von = /^\d{4}-\d{2}-\d{2}$/.test(request.query.von ?? "") ? request.query.von! : new Date().toISOString().slice(0, 10);
    const tage = Math.min(42, Math.max(1, Number(request.query.tage) || 7));
    const bis = isoPlus(von, tage - 1);
    const hebammen = await db
      .select({ id: benutzer.id, name: benutzer.name, kuerzel: benutzer.kuerzel, status: benutzer.status, babypauseBis: benutzer.babypauseBis })
      .from(benutzer)
      .where(and(eq(benutzer.rolle, "hebamme"), eq(benutzer.aktiv, true), ne(benutzer.status, "ausgeschieden")))
      .orderBy(asc(benutzer.name));
    return { von, bis, hebammen, eintraege: await kalenderEintraege(db, von, bis) };
  });

  /** Website-Baustein: Kurstermine der Kurse mit offener Anmeldung als Kalender-Abo – ohne Personendaten */
  app.get("/api/oeffentlich/kurse.ics", async (_request, reply) => {
    const ab = isoPlus(new Date().toISOString().slice(0, 10), -30);
    const rows = await db
      .select({ id: kurstermin.id, datum: kurstermin.datum, von: kurstermin.von, bis: kurstermin.bis, format: kurstermin.format, titel: kurs.titel, ort: kurs.ort })
      .from(kurstermin)
      .innerJoin(kurs, eq(kurs.id, kurstermin.kursId))
      .where(and(eq(kurs.anmeldungOffen, true), inArray(kurs.status, ["geplant", "laufend"]), gte(kurstermin.datum, ab)))
      .orderBy(asc(kurstermin.datum), asc(kurstermin.von));
    const eintraege: IcsEintrag[] = rows.map((r) => ({ uid: `kurs-${r.id}`, titel: r.titel, ort: r.format === 3 ? "online" : r.ort, datum: r.datum, von: r.von, bis: r.bis }));
    return reply.header("Content-Type", "text/calendar; charset=utf-8").header("Cache-Control", "public, max-age=900").send(icsErzeugen("Kurse Hebammenpraxis Kindkesmöön", eintraege));
  });

  // ------------------------------------------------------------ Kalender-Abo
  app.get("/api/ich/kalender-abo", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const [b] = await db.select({ token: benutzer.kalenderToken }).from(benutzer).where(eq(benutzer.id, request.benutzer!.id));
    return { aktiv: Boolean(b?.token) };
  });

  /** Neuen Abo-Link erzeugen (ein alter wird ungültig); der Link wird nur jetzt angezeigt */
  app.post("/api/ich/kalender-abo", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const token = randomBytes(24).toString("base64url");
    await db.update(benutzer).set({ kalenderToken: tokenHash(token) }).where(eq(benutzer.id, request.benutzer!.id));
    await protokollieren(db, request.benutzer!.id, "angelegt", "kalender_abo", request.benutzer!.id);
    return { pfad: `/api/abo/${token}.ics` };
  });

  app.delete("/api/ich/kalender-abo", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    await db.update(benutzer).set({ kalenderToken: null }).where(eq(benutzer.id, request.benutzer!.id));
    await protokollieren(db, request.benutzer!.id, "geloescht", "kalender_abo", request.benutzer!.id);
    return { ok: true };
  });

  /** Abruf durch die Kalender-App (ohne Anmeldung, nur mit Token): 30 Tage zurück bis 180 Tage voraus */
  app.get<{ Params: { datei: string } }>("/api/abo/:datei", { config: { rateLimit: { max: config.produktion ? 120 : 10000, timeWindow: "1 hour" } } }, async (request, reply) => {
    const m = /^([A-Za-z0-9_-]{32})\.ics$/.exec(request.params.datei);
    if (!m) return reply.code(404).send({ fehler: "Nicht gefunden" });
    const [b] = await db.select({ id: benutzer.id, name: benutzer.name, aktiv: benutzer.aktiv }).from(benutzer).where(eq(benutzer.kalenderToken, tokenHash(m[1]!)));
    if (!b || !b.aktiv) return reply.code(404).send({ fehler: "Nicht gefunden" });
    const heute = new Date().toISOString().slice(0, 10);
    const roh = await kalenderEintraege(db, isoPlus(heute, -30), isoPlus(heute, 180), b.id);
    // Datenschutz: Termine nur mit Initialen und ohne Art des Besuchs
    const namen = new Map<string, string>();
    const terminIds = roh.filter((e) => e.art === "termin").map((e) => e.id.slice("termin-".length));
    if (terminIds.length) {
      const rows = await db
        .select({ id: termin.id, vorname: klientin.vorname, nachname: klientin.nachname })
        .from(termin)
        .innerJoin(betreuung, eq(betreuung.id, termin.betreuungId))
        .innerJoin(klientin, eq(klientin.id, betreuung.klientinId))
        .where(inArray(termin.id, terminIds));
      for (const r of rows) namen.set(`termin-${r.id}`, initialen(r.vorname, r.nachname));
    }
    const eintraege: IcsEintrag[] = roh.map((e) => ({
      uid: e.id,
      titel: e.art === "termin" ? `Besuch ${namen.get(e.id) ?? ""}`.trim() : e.titel,
      ort: e.art === "kurs" ? e.ort : null,
      datum: e.datum,
      von: e.von,
      bis: e.bis,
      bisDatum: e.bisDatum,
    }));
    await db.update(benutzer).set({ kalenderAbgerufen: sql`now()` }).where(eq(benutzer.id, b.id));
    return reply
      .header("Content-Type", "text/calendar; charset=utf-8")
      .header("Cache-Control", "private, max-age=900")
      .header("Content-Disposition", 'inline; filename="kindkesmoeoen.ics"')
      .send(icsErzeugen(`Kindkesmöön – ${b.name.split(" ")[0]}`, eintraege));
  });
}
