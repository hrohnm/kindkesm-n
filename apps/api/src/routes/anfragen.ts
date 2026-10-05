import {
  ANFRAGE_AUFBEWAHRUNG_TAGE,
  ANFRAGE_LEISTUNGEN,
  abwesenheitSchema,
  anfrageAktionSchema,
  anfrageSchema,
  belegungsplan,
  oeffentlicheAnfrageSchema,
  oeffentlicheKapazitaet,
  vorschlagen,
  type HebammeKapazitaet,
} from "@kindkesmoeoen/shared";
import { and, asc, desc, eq, inArray, lt, ne, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config";
import type { Datenbank } from "../db/client";
import { abwesenheit, anfrage, benutzer, betreuung, kind, klientin, ort } from "../db/schema";
import { pruefen } from "../fehler";
import { wohnortGeokodieren } from "../geo/adressen";
import { klientinVerorten } from "../geo/positionen";
import { protokollieren } from "../protokoll";

const OFFEN = ["neu", "in_pruefung", "warteliste"] as const;
const aktuellerMonat = () => new Date().toISOString().slice(0, 7);
const datumDe = (iso: string) => iso.split("-").reverse().join(".");

function nurHebammen(request: FastifyRequest, reply: FastifyReply) {
  if (request.benutzer?.rolle !== "hebamme") {
    reply.code(403).send({ fehler: "Anfragen enthalten Gesundheitsdaten und sind nur für Hebammen sichtbar." });
    return false;
  }
  return true;
}

/** M11: Betreuungsanfragen, Belegungsplan, Abwesenheiten und die öffentlichen Bausteine für die Website. */
export async function anfrageRouten(app: FastifyInstance, db: Datenbank) {
  // ------------------------------------------------------------ Daten für den Belegungsplan
  async function hebammenKapazitaet(): Promise<HebammeKapazitaet[]> {
    const hs = await db
      .select({ id: benutzer.id, name: benutzer.name, kuerzel: benutzer.kuerzel, status: benutzer.status, babypauseBis: benutzer.babypauseBis, wochenbettenProMonat: benutzer.wochenbettenProMonat })
      .from(benutzer)
      .where(and(eq(benutzer.rolle, "hebamme"), eq(benutzer.aktiv, true), ne(benutzer.status, "ausgeschieden")))
      .orderBy(asc(benutzer.name));
    const abw = hs.length ? await db.select().from(abwesenheit).where(inArray(abwesenheit.benutzerId, hs.map((h) => h.id))) : [];
    return hs.map((h) => ({ ...h, abwesenheiten: abw.filter((a) => a.benutzerId === h.id).map((a) => ({ von: a.von, bis: a.bis })) }));
  }

  /** Laufende Betreuungen mit Bezugsdatum (Geburt des ersten Kindes, sonst ET) und zuständiger Hebamme */
  async function laufendeBetreuungen() {
    const zeilen = await db
      .select({
        hebammeId: sql<string | null>`coalesce(${betreuung.zustaendigeHebammeId}, ${klientin.zustaendigeHebammeId})`,
        datum: sql<string | null>`coalesce((select min(${kind.geburtsdatum}) from ${kind} where ${kind.betreuungId} = ${betreuung.id}), ${betreuung.et})`,
      })
      .from(betreuung)
      .innerJoin(klientin, eq(klientin.id, betreuung.klientinId))
      .where(and(inArray(betreuung.status, ["schwangerschaft", "wochenbett"]), eq(klientin.archiviert, false)));
    return zeilen.map((z) => ({ hebammeId: z.hebammeId, datum: z.datum ? String(z.datum).slice(0, 10) : null }));
  }

  async function plan(start: string, anzahl: number) {
    const hebammen = await hebammenKapazitaet();
    const offen = await db.select({ et: anfrage.et }).from(anfrage).where(inArray(anfrage.status, [...OFFEN]));
    return { hebammen, plan: belegungsplan(hebammen, await laufendeBetreuungen(), offen, start, anzahl) };
  }

  /** Datensparsamkeit: abgeschlossene Anfragen nach der Aufbewahrungsfrist löschen */
  async function aufraeumen() {
    const grenze = new Date(Date.now() - ANFRAGE_AUFBEWAHRUNG_TAGE * 86_400_000);
    await db.delete(anfrage).where(and(inArray(anfrage.status, ["zugesagt", "abgesagt", "weitergeleitet"]), lt(anfrage.geaendertAm, grenze)));
  }

  async function verorten(id: string) {
    const [a] = await db.select().from(anfrage).where(eq(anfrage.id, id));
    if (!a) return;
    const t = await wohnortGeokodieren(db, { strasse: a.strasse, plz: a.plz, ort: a.ort });
    if (t) await db.update(anfrage).set({ lat: t.lat, lon: t.lon }).where(eq(anfrage.id, id));
  }

  // ------------------------------------------------------------ Öffentliche Bausteine für die Website
  app.post(
    "/api/oeffentlich/anfrage",
    { config: { rateLimit: { max: config.produktion ? 5 : 1000, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const daten = pruefen(oeffentlicheAnfrageSchema, request.body, reply);
      if (!daten) return;
      const { einwilligung: _e, webseite: _w, ...felder } = daten;
      const [neu] = await db.insert(anfrage).values({ ...felder, quelle: "website", einwilligungAm: new Date() }).returning({ id: anfrage.id });
      // Position nur für den Vorschlag (Entfernung) – im Hintergrund, die Familie wartet nicht darauf
      void verorten(neu!.id).catch(() => {});
      return { ok: true };
    },
  );

  /** Kapazitätsampel je ET-Monat und Team-Status – ohne Zahlen zur Belegung, ohne Klientinnen */
  app.get("/api/oeffentlich/praxis", async () => {
    const { hebammen, plan: p } = await plan(aktuellerMonat(), 12);
    return {
      kapazitaet: oeffentlicheKapazitaet(p),
      team: hebammen.map((h) => ({ name: h.name, status: h.status === "babypause" ? "babypause" : "aktiv", babypauseBis: h.status === "babypause" && h.babypauseBis ? h.babypauseBis.slice(0, 7) : null })),
    };
  });

  // ------------------------------------------------------------ Anfragen in der App
  app.get<{ Querystring: { status?: string } }>("/api/anfragen", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    await aufraeumen();
    const liste = await db.select().from(anfrage).orderBy(desc(anfrage.erstelltAm));
    const namen = await db.select({ id: benutzer.id, name: benutzer.name, kuerzel: benutzer.kuerzel }).from(benutzer);
    return liste.map((a) => ({ ...a, hebamme: namen.find((n) => n.id === a.hebammeId) ?? null }));
  });

  app.get<{ Params: { id: string } }>("/api/anfragen/:id", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const [a] = await db.select().from(anfrage).where(eq(anfrage.id, request.params.id));
    if (!a) return reply.code(404).send({ fehler: "Anfrage nicht gefunden" });
    const { hebammen, plan: p } = await plan(a.et.slice(0, 7), 1);
    // Wohnort der Hebamme: privater Ort, sonst Praxis
    const orte = await db.select({ benutzerId: ort.benutzerId, typ: ort.typ, lat: ort.lat, lon: ort.lon }).from(ort);
    const praxis = orte.find((o) => o.typ === "praxis" && o.lat);
    const wohnorte = Object.fromEntries(
      hebammen.map((h) => {
        const o = orte.find((x) => x.benutzerId === h.id && x.typ === "privat" && x.lat) ?? praxis;
        return [h.id, o?.lat && o.lon ? { lat: Number(o.lat), lon: Number(o.lon) } : null];
      }),
    );
    const vorschlag = vorschlagen({ et: a.et, position: a.lat != null && a.lon != null ? { lat: a.lat, lon: a.lon } : null }, hebammen, p, wohnorte);
    await protokollieren(db, request.benutzer!.id, "angesehen", "anfrage", a.id);
    return { ...a, vorschlag: vorschlag.map((v) => ({ ...v, name: hebammen.find((h) => h.id === v.hebammeId)!.name })) };
  });

  app.post("/api/anfragen", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const daten = pruefen(anfrageSchema, request.body, reply);
    if (!daten) return;
    const [neu] = await db.insert(anfrage).values({ ...daten, status: "in_pruefung", erfasstVon: request.benutzer!.id }).returning();
    await protokollieren(db, request.benutzer!.id, "angelegt", "anfrage", neu!.id);
    // Position für den Vorschlag: kurz darauf warten (Adressverzeichnis ist sofort da), langsame Online-Suche
    // bei schlechtem Netz läuft im Hintergrund weiter, damit das Speichern nicht hängt
    const suche = verorten(neu!.id).catch(() => {});
    await Promise.race([suche, new Promise((fertig) => setTimeout(fertig, 1500))]);
    return neu;
  });

  app.post<{ Params: { id: string } }>("/api/anfragen/:id/aktion", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const daten = pruefen(anfrageAktionSchema, request.body, reply);
    if (!daten) return;
    const [a] = await db.select().from(anfrage).where(eq(anfrage.id, request.params.id));
    if (!a) return reply.code(404).send({ fehler: "Anfrage nicht gefunden" });
    const jetzt = new Date();

    if (daten.aktion === "notiz") {
      await db.update(anfrage).set({ notiz: daten.notiz, geaendertAm: jetzt }).where(eq(anfrage.id, a.id));
      return { ok: true };
    }
    if (a.status === "zugesagt") return reply.code(409).send({ fehler: "Die Anfrage ist bereits zugesagt – Änderungen bitte in der Akte." });

    if (daten.aktion === "zusagen") {
      const [h] = await db.select({ id: benutzer.id, rolle: benutzer.rolle }).from(benutzer).where(eq(benutzer.id, daten.hebammeId));
      if (!h || h.rolle !== "hebamme") return reply.code(400).send({ fehler: "Bitte eine Hebamme auswählen." });
      const wuensche = a.leistungen.map((l) => ANFRAGE_LEISTUNGEN[l as keyof typeof ANFRAGE_LEISTUNGEN] ?? l).join(", ");
      const notizen = [`Aus Anfrage vom ${datumDe(a.erstelltAm.toISOString().slice(0, 10))} (${a.quelle})`, wuensche && `Wünsche: ${wuensche}`, a.nachricht && `Nachricht: ${a.nachricht}`].filter(Boolean).join("\n");
      const klientinId = await db.transaction(async (tx) => {
        const [k] = await tx
          .insert(klientin)
          .values({ vorname: a.vorname, nachname: a.nachname, email: a.email, telefon: a.telefon, strasse: a.strasse, plz: a.plz, ort: a.ort, zustaendigeHebammeId: h.id, flaggen: a.erstesKind ? ["erstgebaerend"] : [] })
          .returning({ id: klientin.id });
        await tx.insert(betreuung).values({ klientinId: k!.id, status: "schwangerschaft", et: a.et, zustaendigeHebammeId: h.id, para: a.erstesKind ? 0 : null, notizen });
        await tx.update(anfrage).set({ status: "zugesagt", hebammeId: h.id, klientinId: k!.id, bearbeitetAm: jetzt, geaendertAm: jetzt }).where(eq(anfrage.id, a.id));
        return k!.id;
      });
      await klientinVerorten(db, klientinId);
      await protokollieren(db, request.benutzer!.id, "zugesagt", "anfrage", a.id, { klientinId, hebammeId: h.id });
      return { ok: true, klientinId };
    }

    const status = { pruefen: "in_pruefung", warteliste: "warteliste", absagen: "abgesagt", weiterleiten: "weitergeleitet" } as const;
    const notiz = "notiz" in daten && daten.notiz ? [a.notiz, daten.notiz].filter(Boolean).join("\n") : a.notiz;
    await db.update(anfrage).set({ status: status[daten.aktion], notiz, bearbeitetAm: jetzt, geaendertAm: jetzt }).where(eq(anfrage.id, a.id));
    await protokollieren(db, request.benutzer!.id, status[daten.aktion], "anfrage", a.id);
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>("/api/anfragen/:id", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    await db.delete(anfrage).where(eq(anfrage.id, request.params.id));
    await protokollieren(db, request.benutzer!.id, "geloescht", "anfrage", request.params.id);
    return { ok: true };
  });

  // ------------------------------------------------------------ Belegungsplan und Abwesenheiten
  app.get<{ Querystring: { start?: string; monate?: string } }>("/api/belegung", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const start = /^\d{4}-\d{2}$/.test(request.query.start ?? "") ? request.query.start! : aktuellerMonat();
    const anzahl = Math.min(24, Math.max(1, Number(request.query.monate) || 12));
    const { hebammen, plan: p } = await plan(start, anzahl);
    const abw = await db.select().from(abwesenheit).where(sql`${abwesenheit.bis} >= ${`${start}-01`}`).orderBy(asc(abwesenheit.von));
    return {
      hebammen: hebammen.map(({ abwesenheiten: _a, ...h }) => h),
      plan: p,
      abwesenheiten: abw,
    };
  });

  app.post("/api/abwesenheiten", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const daten = pruefen(abwesenheitSchema, request.body, reply);
    if (!daten) return;
    const [neu] = await db.insert(abwesenheit).values({ ...daten, benutzerId: request.benutzer!.id }).returning();
    await protokollieren(db, request.benutzer!.id, "angelegt", "abwesenheit", neu!.id);
    return neu;
  });

  app.delete<{ Params: { id: string } }>("/api/abwesenheiten/:id", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const [a] = await db.select().from(abwesenheit).where(eq(abwesenheit.id, request.params.id));
    if (!a) return reply.code(404).send({ fehler: "Nicht gefunden" });
    if (a.benutzerId !== request.benutzer!.id) return reply.code(403).send({ fehler: "Nur eigene Abwesenheiten können gelöscht werden." });
    await db.delete(abwesenheit).where(eq(abwesenheit.id, a.id));
    return { ok: true };
  });
}
