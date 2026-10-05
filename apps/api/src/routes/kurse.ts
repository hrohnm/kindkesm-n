/**
 * Kurse (M12): Kurse mit Terminen und Teilnehmerinnen, Anwesenheit per Tablet und – für Kassenkurse –
 * je anwesender Versicherter ein abrechenbarer Kontakt (Formular 3.4). Öffentliche Online-Anmeldung.
 */
import {
  KASSEN_KURSE,
  KURS_ARTEN,
  anwesenheitSchema,
  kursAbrechnen,
  kursSchema,
  kursterminSchema,
  onlineAnmeldungSchema,
  teilnahmeSchema,
  type Ergebnis,
  type KursBesuchTyp,
  type KursFormat,
} from "@kindkesmoeoen/shared";
import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { config } from "../config";
import type { Datenbank } from "../db/client";
import { benutzer, besuch, betreuung, kind, klientin, kurs, kursAnwesenheit, kursTeilnahme, kurstermin, leistung } from "../db/schema";
import { pruefen } from "../fehler";
import { protokollieren } from "../protokoll";
import { regelwerkFuer } from "../regelwerk-laden";

type Kurs = typeof kurs.$inferSelect;
type Termin = typeof kurstermin.$inferSelect;
type Teilnahme = typeof kursTeilnahme.$inferSelect;

const AKTIV = ["angemeldet", "bestaetigt"] as const;
/** Kurse nach der Geburt: statt des errechneten Termins wird das Geburtsdatum des Kindes erfragt */
const STICHTAG_GEBURT: string[] = ["rueckbildung", "babymassage", "eltern_kind"];
const istKasse = (k: Kurs) => k.abrechnung === "kasse" && (KASSEN_KURSE as string[]).includes(k.art);

export async function kursRouten(app: FastifyInstance, db: Datenbank) {
  const nurHebamme = (request: FastifyRequest, reply: FastifyReply) => {
    if (request.benutzer?.rolle !== "hebamme") {
      reply.code(403).send({ fehler: "Kurse verwalten nur Hebammen." });
      return false;
    }
    return true;
  };

  async function kursLaden(id: string, reply: FastifyReply) {
    const [k] = await db.select().from(kurs).where(eq(kurs.id, id));
    if (!k) reply.code(404).send({ fehler: "Kurs nicht gefunden" });
    return k;
  }

  async function leitungPruefen(ids: string[]) {
    const h = await db.select({ id: benutzer.id }).from(benutzer).where(and(inArray(benutzer.id, ids), eq(benutzer.rolle, "hebamme")));
    return h.length === new Set(ids).size;
  }

  // ------------------------------------------------------------ Kurse
  app.get<{ Querystring: { alle?: string } }>("/api/kurse", async (request, reply) => {
    if (!nurHebamme(request, reply)) return;
    const kurse = await db
      .select()
      .from(kurs)
      .where(request.query.alle ? undefined : inArray(kurs.status, ["geplant", "laufend"]))
      .orderBy(desc(kurs.erstelltAm));
    if (!kurse.length) return [];
    const ids = kurse.map((k) => k.id);
    const termine = await db.select({ kursId: kurstermin.kursId, datum: kurstermin.datum, von: kurstermin.von }).from(kurstermin).where(inArray(kurstermin.kursId, ids)).orderBy(asc(kurstermin.datum), asc(kurstermin.von));
    const teilnahmen = await db.select({ kursId: kursTeilnahme.kursId, status: kursTeilnahme.status, quelle: kursTeilnahme.quelle }).from(kursTeilnahme).where(inArray(kursTeilnahme.kursId, ids));
    const heute = new Date().toISOString().slice(0, 10);
    return kurse
      .map((k) => {
        const t = termine.filter((x) => x.kursId === k.id);
        const tn = teilnahmen.filter((x) => x.kursId === k.id);
        return {
          ...k,
          anzahlTermine: t.length,
          erster: t[0]?.datum ?? null,
          letzter: t.at(-1)?.datum ?? null,
          naechster: t.find((x) => x.datum >= heute) ?? null,
          belegt: tn.filter((x) => (AKTIV as readonly string[]).includes(x.status)).length,
          warteliste: tn.filter((x) => x.status === "warteliste").length,
          neuOnline: tn.filter((x) => x.status === "angemeldet" && x.quelle === "online").length,
        };
      })
      .sort((a, b) => (a.naechster?.datum ?? "9999").localeCompare(b.naechster?.datum ?? "9999"));
  });

  app.post("/api/kurse", async (request, reply) => {
    if (!nurHebamme(request, reply)) return;
    const daten = pruefen(kursSchema, request.body, reply);
    if (!daten) return;
    if (!(await leitungPruefen(daten.leitung))) return reply.code(400).send({ fehler: "Unbekannte Kursleitung", felder: { leitung: "Bitte Hebammen auswählen" } });
    const [k] = await db.insert(kurs).values({ ...daten, erstelltVon: request.benutzer!.id }).returning();
    await protokollieren(db, request.benutzer!.id, "angelegt", "kurs", k!.id);
    return k;
  });

  app.get<{ Params: { id: string } }>("/api/kurse/:id", async (request, reply) => {
    if (!nurHebamme(request, reply)) return;
    const k = await kursLaden(request.params.id, reply);
    if (!k) return;
    const termine = await db.select().from(kurstermin).where(eq(kurstermin.kursId, k.id)).orderBy(asc(kurstermin.datum), asc(kurstermin.von));
    const teilnahmen = await db
      .select({ t: kursTeilnahme, klientin: { id: klientin.id, vorname: klientin.vorname, nachname: klientin.nachname, versichertennummer: klientin.versichertennummer } })
      .from(kursTeilnahme)
      .leftJoin(klientin, eq(klientin.id, kursTeilnahme.klientinId))
      .where(eq(kursTeilnahme.kursId, k.id))
      .orderBy(asc(kursTeilnahme.erstelltAm));
    const anwesend = termine.length
      ? await db.select({ terminId: kursAnwesenheit.terminId, n: sql<number>`count(*) filter (where ${kursAnwesenheit.anwesend})::int` }).from(kursAnwesenheit).where(inArray(kursAnwesenheit.terminId, termine.map((t) => t.id))).groupBy(kursAnwesenheit.terminId)
      : [];
    const hebammen = await db.select({ id: benutzer.id, name: benutzer.name, kuerzel: benutzer.kuerzel }).from(benutzer).where(eq(benutzer.rolle, "hebamme"));
    return {
      kurs: k,
      kasse: istKasse(k),
      termine: termine.map((t) => ({ ...t, anwesend: anwesend.find((a) => a.terminId === t.id)?.n ?? 0, hebamme: hebammen.find((h) => h.id === t.hebammeId)?.kuerzel ?? "" })),
      teilnahmen: teilnahmen.map(({ t, klientin: kl }) => ({ ...t, klientin: kl?.id ? kl : null })),
      leitung: hebammen.filter((h) => k.leitung.includes(h.id)),
      belegt: teilnahmen.filter(({ t }) => (AKTIV as readonly string[]).includes(t.status)).length,
    };
  });

  app.put<{ Params: { id: string } }>("/api/kurse/:id", async (request, reply) => {
    if (!nurHebamme(request, reply)) return;
    const daten = pruefen(kursSchema, request.body, reply);
    if (!daten) return;
    const k = await kursLaden(request.params.id, reply);
    if (!k) return;
    if (!(await leitungPruefen(daten.leitung))) return reply.code(400).send({ fehler: "Unbekannte Kursleitung" });
    const [neu] = await db.update(kurs).set({ ...daten, geaendertAm: new Date() }).where(eq(kurs.id, k.id)).returning();
    await protokollieren(db, request.benutzer!.id, "geaendert", "kurs", k.id);
    return neu;
  });

  app.delete<{ Params: { id: string } }>("/api/kurse/:id", async (request, reply) => {
    if (!nurHebamme(request, reply)) return;
    const k = await kursLaden(request.params.id, reply);
    if (!k) return;
    const abgerechnet = await db
      .select({ id: kursAnwesenheit.besuchId })
      .from(kursAnwesenheit)
      .innerJoin(kurstermin, eq(kurstermin.id, kursAnwesenheit.terminId))
      .where(and(eq(kurstermin.kursId, k.id), sql`${kursAnwesenheit.besuchId} is not null`));
    if (abgerechnet.length) return reply.code(409).send({ fehler: "Für diesen Kurs gibt es bereits abrechenbare Kurseinheiten. Kurs stattdessen auf „abgeschlossen“ oder „abgesagt“ setzen." });
    await db.delete(kurs).where(eq(kurs.id, k.id));
    await protokollieren(db, request.benutzer!.id, "geloescht", "kurs", k.id);
    return { ok: true };
  });

  // ------------------------------------------------------------ Termine
  app.post<{ Params: { id: string } }>("/api/kurse/:id/termine", async (request, reply) => {
    if (!nurHebamme(request, reply)) return;
    const daten = pruefen(kursterminSchema.extend({ wiederholungen: z.number().int().min(1).max(20).default(1), abstandTage: z.number().int().min(1).max(31).default(7) }), request.body, reply);
    if (!daten) return;
    const k = await kursLaden(request.params.id, reply);
    if (!k) return;
    const { wiederholungen, abstandTage, ...t } = daten;
    const werte = Array.from({ length: wiederholungen }, (_, i) => {
      const d = new Date(`${t.datum}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + i * abstandTage);
      return { ...t, kursId: k.id, datum: d.toISOString().slice(0, 10) };
    });
    const neu = await db.insert(kurstermin).values(werte).returning();
    return neu;
  });

  async function terminLaden(id: string, reply: FastifyReply) {
    const [t] = await db.select().from(kurstermin).where(eq(kurstermin.id, id));
    if (!t) {
      reply.code(404).send({ fehler: "Termin nicht gefunden" });
      return undefined;
    }
    const [k] = await db.select().from(kurs).where(eq(kurs.id, t.kursId));
    return { t, k: k! };
  }

  async function abgerechneteBesuche(terminId: string) {
    return db
      .select({ besuchId: kursAnwesenheit.besuchId, versandId: leistung.versandId })
      .from(kursAnwesenheit)
      .leftJoin(leistung, eq(leistung.besuchId, kursAnwesenheit.besuchId))
      .where(and(eq(kursAnwesenheit.terminId, terminId), sql`${kursAnwesenheit.besuchId} is not null`));
  }

  app.put<{ Params: { id: string } }>("/api/kurstermine/:id", async (request, reply) => {
    if (!nurHebamme(request, reply)) return;
    const daten = pruefen(kursterminSchema, request.body, reply);
    if (!daten) return;
    const x = await terminLaden(request.params.id, reply);
    if (!x) return;
    if ((await abgerechneteBesuche(x.t.id)).length) return reply.code(409).send({ fehler: "Zu diesem Termin gibt es schon abrechenbare Kurseinheiten. Bitte zuerst die Anwesenheit wieder öffnen." });
    const [neu] = await db.update(kurstermin).set({ ...daten, geaendertAm: new Date() }).where(eq(kurstermin.id, x.t.id)).returning();
    return neu;
  });

  app.delete<{ Params: { id: string } }>("/api/kurstermine/:id", async (request, reply) => {
    if (!nurHebamme(request, reply)) return;
    const x = await terminLaden(request.params.id, reply);
    if (!x) return;
    if ((await abgerechneteBesuche(x.t.id)).length) return reply.code(409).send({ fehler: "Zu diesem Termin gibt es schon abrechenbare Kurseinheiten." });
    await db.delete(kurstermin).where(eq(kurstermin.id, x.t.id));
    return { ok: true };
  });

  // ------------------------------------------------------------ Teilnehmerinnen
  async function aktiveAnzahl(kursId: string, ohne?: string) {
    const [r] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(kursTeilnahme)
      .where(and(eq(kursTeilnahme.kursId, kursId), inArray(kursTeilnahme.status, [...AKTIV]), ohne ? ne(kursTeilnahme.id, ohne) : undefined));
    return r?.n ?? 0;
  }

  app.post<{ Params: { id: string } }>("/api/kurse/:id/teilnahmen", async (request, reply) => {
    if (!nurHebamme(request, reply)) return;
    const daten = pruefen(teilnahmeSchema, request.body, reply);
    if (!daten) return;
    const k = await kursLaden(request.params.id, reply);
    if (!k) return;
    let status = daten.status;
    // Voll: automatisch auf die Warteliste
    if ((AKTIV as readonly string[]).includes(status) && (await aktiveAnzahl(k.id)) >= k.maxTeilnehmer) status = "warteliste";
    const [t] = await db.insert(kursTeilnahme).values({ ...daten, status, kursId: k.id }).returning();
    return t;
  });

  async function teilnahmeLaden(id: string, reply: FastifyReply) {
    const [t] = await db.select().from(kursTeilnahme).where(eq(kursTeilnahme.id, id));
    if (!t) reply.code(404).send({ fehler: "Teilnahme nicht gefunden" });
    return t;
  }

  app.put<{ Params: { id: string } }>("/api/kursteilnahmen/:id", async (request, reply) => {
    if (!nurHebamme(request, reply)) return;
    const daten = pruefen(teilnahmeSchema, request.body, reply);
    if (!daten) return;
    const t = await teilnahmeLaden(request.params.id, reply);
    if (!t) return;
    const [k] = await db.select().from(kurs).where(eq(kurs.id, t.kursId));
    if ((AKTIV as readonly string[]).includes(daten.status) && !(AKTIV as readonly string[]).includes(t.status) && (await aktiveAnzahl(t.kursId, t.id)) >= k!.maxTeilnehmer) {
      return reply.code(409).send({ fehler: `Der Kurs ist voll (${k!.maxTeilnehmer} Plätze). Zuerst eine Teilnahme stornieren oder die Platzzahl erhöhen.` });
    }
    const [neu] = await db.update(kursTeilnahme).set({ ...daten, geaendertAm: new Date() }).where(eq(kursTeilnahme.id, t.id)).returning();
    return neu;
  });

  app.delete<{ Params: { id: string } }>("/api/kursteilnahmen/:id", async (request, reply) => {
    if (!nurHebamme(request, reply)) return;
    const t = await teilnahmeLaden(request.params.id, reply);
    if (!t) return;
    const [abgerechnet] = await db.select({ id: kursAnwesenheit.besuchId }).from(kursAnwesenheit).where(and(eq(kursAnwesenheit.teilnahmeId, t.id), sql`${kursAnwesenheit.besuchId} is not null`));
    if (abgerechnet) return reply.code(409).send({ fehler: "Für diese Teilnehmerin gibt es abrechenbare Kurseinheiten – bitte stornieren statt löschen." });
    await db.delete(kursTeilnahme).where(eq(kursTeilnahme.id, t.id));
    return { ok: true };
  });

  // ------------------------------------------------------------ Anwesenheit und Abrechnung
  /** Betreuung der Versicherten für die Kursabrechnung (bei Rückbildung die mit Kind, sonst die neueste offene). */
  async function betreuungFuer(klientinId: string, art: KursBesuchTyp) {
    const liste = await db.select().from(betreuung).where(eq(betreuung.klientinId, klientinId)).orderBy(desc(betreuung.erstelltAm));
    let erste: { b: (typeof liste)[number]; geburtsdatum: string | null } | undefined;
    for (const b of liste) {
      const kinder = await db.select({ geburtsdatum: kind.geburtsdatum }).from(kind).where(eq(kind.betreuungId, b.id)).orderBy(asc(kind.geburtsdatum));
      const eintrag = { b, geburtsdatum: kinder[0]?.geburtsdatum ?? null };
      erste ??= eintrag;
      if (art === "rueckbildung" ? kinder.length : !kinder.length) return eintrag;
    }
    return erste;
  }

  async function vorschauFuer(k: Kurs, t: Termin, tn: Teilnahme, besuchId: string | null): Promise<{ betreuungId: string | null; ergebnis: Ergebnis | null; fehler?: string }> {
    if (!istKasse(k)) return { betreuungId: null, ergebnis: null };
    if (!tn.klientinId) return { betreuungId: null, ergebnis: null, fehler: "Nicht mit einer Akte verknüpft – für die Kassenabrechnung bitte Klientin zuordnen." };
    const art = k.art as KursBesuchTyp;
    const bt = await betreuungFuer(tn.klientinId, art);
    if (!bt) return { betreuungId: null, ergebnis: null, fehler: "Keine Betreuung in der Akte." };
    const rw = await regelwerkFuer(db, t.datum);
    if (!rw) return { betreuungId: bt.b.id, ergebnis: null, fehler: `Kein Regelwerk für ${t.datum}.` };
    const frueher = await db
      .select({ stamm: besuch.stamm, art: besuch.art, einheiten: besuch.einheitenAbrechenbar })
      .from(besuch)
      .where(and(eq(besuch.betreuungId, bt.b.id), inArray(besuch.typ, ["geburtsvorbereitung", "rueckbildung"]), besuchId ? ne(besuch.id, besuchId) : undefined));
    const von = t.format === 6 ? "00:00" : t.von;
    const bis = t.format === 6 ? dauerAlsZeit(t.von, t.bis) : t.bis;
    return { betreuungId: bt.b.id, ergebnis: kursAbrechnen({ datum: t.datum, von, bis, art, einzel: k.einzel, format: t.format as KursFormat }, { geburtsdatum: bt.geburtsdatum, frueher }, rw) };
  }

  app.get<{ Params: { id: string } }>("/api/kurstermine/:id", async (request, reply) => {
    if (!nurHebamme(request, reply)) return;
    const x = await terminLaden(request.params.id, reply);
    if (!x) return;
    const teilnahmen = await db
      .select()
      .from(kursTeilnahme)
      .where(and(eq(kursTeilnahme.kursId, x.k.id), inArray(kursTeilnahme.status, [...AKTIV])))
      .orderBy(asc(kursTeilnahme.name));
    const anwesenheit = await db.select().from(kursAnwesenheit).where(eq(kursAnwesenheit.terminId, x.t.id));
    const [h] = await db.select({ name: benutzer.name }).from(benutzer).where(eq(benutzer.id, x.t.hebammeId));
    const liste = [];
    for (const tn of teilnahmen) {
      const a = anwesenheit.find((y) => y.teilnahmeId === tn.id);
      const v = await vorschauFuer(x.k, x.t, tn, a?.besuchId ?? null);
      const versendet = a?.besuchId ? (await db.select({ id: leistung.id }).from(leistung).where(and(eq(leistung.besuchId, a.besuchId), sql`${leistung.versandId} is not null`))).length > 0 : false;
      liste.push({ teilnahme: tn, anwesend: a?.anwesend ?? false, unterschrift: a?.unterschrift ?? { art: "keine" }, besuchId: a?.besuchId ?? null, versendet, ...v });
    }
    return { termin: { ...x.t, hebamme: h?.name ?? "" }, kurs: x.k, kasse: istKasse(x.k), teilnehmerinnen: liste };
  });

  app.put<{ Params: { id: string } }>("/api/kurstermine/:id/anwesenheit", async (request, reply) => {
    if (!nurHebamme(request, reply)) return;
    const daten = pruefen(anwesenheitSchema, request.body, reply);
    if (!daten) return;
    const x = await terminLaden(request.params.id, reply);
    if (!x) return;
    const teilnahmen = await db.select().from(kursTeilnahme).where(eq(kursTeilnahme.kursId, x.k.id));
    const fehler: string[] = [];
    for (const e of daten.eintraege) {
      const tn = teilnahmen.find((y) => y.id === e.teilnahmeId);
      if (!tn) continue;
      const [alt] = await db.select().from(kursAnwesenheit).where(and(eq(kursAnwesenheit.terminId, x.t.id), eq(kursAnwesenheit.teilnahmeId, tn.id)));
      let besuchId = alt?.besuchId ?? null;

      if (daten.abschliessen && istKasse(x.k)) {
        const gesperrt = besuchId ? (await db.select({ id: leistung.id }).from(leistung).where(and(eq(leistung.besuchId, besuchId), or(ne(leistung.status, "erfasst"), sql`${leistung.versandId} is not null`)))).length > 0 : false;
        if (gesperrt) {
          fehler.push(`${tn.name}: bereits versendet – unverändert.`);
          continue;
        }
        if (!e.anwesend || !tn.klientinId) {
          if (besuchId) await db.delete(besuch).where(eq(besuch.id, besuchId));
          besuchId = null;
          if (e.anwesend && !tn.klientinId) fehler.push(`${tn.name}: nicht mit einer Akte verknüpft – keine Abrechnung.`);
        } else {
          const v = await vorschauFuer(x.k, x.t, tn, besuchId);
          if (!v.ergebnis || !v.betreuungId) {
            fehler.push(`${tn.name}: ${v.fehler ?? "nicht abrechenbar"}`);
          } else if (v.ergebnis.hinweise.some((h) => h.stufe === "fehler") && !v.ergebnis.zeilen.length) {
            fehler.push(`${tn.name}: ${v.ergebnis.hinweise.find((h) => h.stufe === "fehler")!.text}`);
            if (besuchId) await db.delete(besuch).where(eq(besuch.id, besuchId));
            besuchId = null;
          } else {
            besuchId = await kurseinheitSpeichern(x.k, x.t, v.betreuungId, v.ergebnis, e.unterschrift, besuchId, request.benutzer!.id);
            if (e.unterschrift.art === "keine") fehler.push(`${tn.name}: Unterschrift fehlt – als Entwurf gespeichert.`);
          }
        }
      }
      await db
        .insert(kursAnwesenheit)
        .values({ terminId: x.t.id, teilnahmeId: tn.id, anwesend: e.anwesend, unterschrift: e.unterschrift, besuchId })
        .onConflictDoUpdate({ target: [kursAnwesenheit.terminId, kursAnwesenheit.teilnahmeId], set: { anwesend: e.anwesend, unterschrift: e.unterschrift, besuchId, geaendertAm: new Date() } });
    }
    if (daten.abschliessen) await db.update(kurstermin).set({ abgeschlossen: true, geaendertAm: new Date() }).where(eq(kurstermin.id, x.t.id));
    await protokollieren(db, request.benutzer!.id, daten.abschliessen ? "abgeschlossen" : "geaendert", "kurstermin", x.t.id);
    return { ok: true, hinweise: fehler };
  });

  /** Kurseinheit einer Versicherten als abrechenbaren Kontakt speichern (Typ geburtsvorbereitung/rueckbildung). */
  async function kurseinheitSpeichern(k: Kurs, t: Termin, betreuungId: string, ergebnis: Ergebnis, unterschrift: Record<string, unknown>, besuchId: string | null, benutzerId: string) {
    const rw = await regelwerkFuer(db, t.datum);
    const werte = {
      betreuungId,
      hebammeId: t.hebammeId,
      datum: t.datum,
      von: t.format === 6 ? "00:00" : t.von,
      bis: t.format === 6 ? dauerAlsZeit(t.von, t.bis) : t.bis,
      typ: k.art as KursBesuchTyp,
      art: t.format,
      material: [],
      dokumentation: { kurs: { kursId: k.id, terminId: t.id, titel: k.titel, thema: t.thema } },
      unterschrift,
      status: (unterschrift.art === "keine" ? "entwurf" : "abgeschlossen") as "entwurf" | "abgeschlossen",
      regelwerkId: rw!.id,
      stamm: ergebnis.stamm,
      einheiten: ergebnis.einheiten,
      einheitenAbrechenbar: ergebnis.einheitenAbrechenbar,
      summe: ergebnis.summe.toFixed(2),
      hinweise: ergebnis.hinweise.filter((h) => h.stufe !== "info"),
      geaendertAm: new Date(),
    };
    return db.transaction(async (tx) => {
      let id = besuchId;
      if (id) {
        await tx.update(besuch).set(werte).where(eq(besuch.id, id));
        await tx.delete(leistung).where(eq(leistung.besuchId, id));
      } else {
        id = (await tx.insert(besuch).values(werte).returning({ id: besuch.id }))[0]!.id;
        await protokollieren(db, benutzerId, "angelegt", "besuch", id, { kurs: k.id });
      }
      if (ergebnis.zeilen.length) {
        await tx.insert(leistung).values(
          ergebnis.zeilen.map((z) => ({
            besuchId: id!,
            hebammeId: t.hebammeId,
            regelwerkId: rw!.id,
            gpos: z.gpos,
            bezeichnung: z.bezeichnung,
            datum: t.datum,
            menge: z.menge,
            einheit: z.einheit,
            einzelbetrag: z.einzelbetrag.toFixed(2),
            betrag: z.betrag.toFixed(2),
            zuschlag: false,
            formular: z.formular,
            quittierungspflichtig: z.quittierungspflichtig,
          })),
        );
      }
      return id!;
    });
  }

  // ------------------------------------------------------------ Öffentliche Online-Anmeldung
  // Die Praxis-Website lädt die Termine im Browser (CORS: siehe oeffentlich.ts)
  app.get("/api/oeffentlich/kurse", async () => {
    const kurse = await db.select().from(kurs).where(and(eq(kurs.anmeldungOffen, true), inArray(kurs.status, ["geplant", "laufend"])));
    const heute = new Date().toISOString().slice(0, 10);
    const ergebnis = [];
    for (const k of kurse) {
      const termine = await db.select({ datum: kurstermin.datum, von: kurstermin.von, bis: kurstermin.bis, format: kurstermin.format }).from(kurstermin).where(eq(kurstermin.kursId, k.id)).orderBy(asc(kurstermin.datum), asc(kurstermin.von));
      if (termine.length && termine.at(-1)!.datum < heute) continue;
      const belegt = await aktiveAnzahl(k.id);
      // Nur, was auf eine Kursseite gehört: keine Namen von Teilnehmerinnen oder Hebammen-Konten
      ergebnis.push({ id: k.id, titel: k.titel, art: KURS_ARTEN[k.art], artId: k.art, stichtag: STICHTAG_GEBURT.includes(k.art) ? "geburt" : "et", beschreibung: k.beschreibung, ort: k.ort, preis: k.abrechnung === "selbstzahler" ? k.preis : null, partnerPreis: k.partnerPreis, kasse: istKasse(k), termine, freiePlaetze: Math.max(0, k.maxTeilnehmer - belegt) });
    }
    return ergebnis.sort((a, b) => (a.termine[0]?.datum ?? "").localeCompare(b.termine[0]?.datum ?? ""));
  });

  app.post<{ Params: { id: string } }>(
    "/api/oeffentlich/kurse/:id/anmeldung",
    { config: { rateLimit: { max: config.produktion ? 10 : 1000, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const daten = pruefen(onlineAnmeldungSchema, request.body, reply);
      if (!daten) return;
      if (!/^[0-9a-f-]{36}$/i.test(request.params.id)) return reply.code(404).send({ fehler: "Kurs nicht gefunden" });
      const [k] = await db.select().from(kurs).where(and(eq(kurs.id, request.params.id), eq(kurs.anmeldungOffen, true)));
      if (!k || !["geplant", "laufend"].includes(k.status)) return reply.code(404).send({ fehler: "Für diesen Kurs ist keine Anmeldung möglich." });
      // Doppelte Anmeldung (z. B. zweimal abgeschickt): nichts neu anlegen, nur den Stand melden
      const [schon] = await db
        .select({ status: kursTeilnahme.status })
        .from(kursTeilnahme)
        .where(and(eq(kursTeilnahme.kursId, k.id), sql`lower(${kursTeilnahme.email}) = ${daten.email.toLowerCase()}`, inArray(kursTeilnahme.status, [...AKTIV, "warteliste"])));
      if (schon) return { ok: true, warteliste: schon.status === "warteliste", bereits: true };
      const voll = (await aktiveAnzahl(k.id)) >= k.maxTeilnehmer;
      await db.insert(kursTeilnahme).values({
        kursId: k.id,
        name: daten.name,
        email: daten.email,
        telefon: daten.telefon,
        stichtag: daten.stichtag,
        krankenkasse: daten.krankenkasse,
        partner: daten.partner,
        nachricht: daten.nachricht,
        status: voll ? "warteliste" : "angemeldet",
        quelle: "online",
      });
      return { ok: true, warteliste: voll };
    },
  );
}

/** Dauer zwischen zwei Uhrzeiten als HH:MM (Selbstlerneinheit: Dauer des Videos steht bei „Uhrzeit bis“). */
function dauerAlsZeit(von: string, bis: string) {
  const m = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const d = (m(bis) - m(von) + 1440) % 1440;
  return `${String(Math.floor(d / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`;
}

