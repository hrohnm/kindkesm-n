/**
 * Tourenplanung, Wegegeld und Fahrtenbuch (Meilenstein 4).
 * Jede Hebamme plant ihre eigenen Tage; Start, Ende und Wegegeld-Ausgangspunkt kommen aus den Tourvorlagen.
 */
import {
  FAHRT_ART_LABEL,
  abschnittArt,
  fahrtSchema,
  lebenstag,
  minZuUhrzeit,
  terminFenster,
  terminSchema,
  tourEinstellungSchema,
  tourOptimieren,
  tourZeiten,
  uhrzeitZuMin,
  wegegeldTagSchema,
  type FahrtArt,
  type Stopp,
  type TourZeiten,
} from "@kindkesmoeoen/shared";
import { and, asc, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { config } from "../config";
import type { Datenbank } from "../db/client";
import { besuch, betreuung, fahrt, kind, klientin, ort, termin, tour, tourvorlage, wegegeldTag } from "../db/schema";
import { pruefen } from "../fehler";
import { anzahlAdressen } from "../geo/adressen";
import { Schreiber, datumDe, schriftenLaden } from "../pdf/werkzeug";
import { protokollieren } from "../protokoll";
import { ortPunkt, routing, wegegeldNeuBerechnen, wegegeldStand, wochentag } from "../wegegeld";

const datumSchema = z.iso.date();
type Ort = typeof ort.$inferSelect;
type Tour = typeof tour.$inferSelect;

/** Aktuelle Uhrzeit in Deutschland (der Server läuft ggf. in UTC). */
function jetztMin(): number {
  const t = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  return uhrzeitZuMin(t);
}

const km = (meter: number | null | undefined) => (meter == null ? 0 : Math.round(meter / 100) / 10);

export async function tourenRouten(app: FastifyInstance, db: Datenbank) {
  app.addHook("preHandler", async (request, reply) => {
    if (/^\/api\/(touren|termine|fahrtenbuch|wegegeld)/.test(request.url) && request.benutzer?.rolle !== "hebamme") {
      return reply.code(403).send({ fehler: "Nur für Hebammen" });
    }
  });

  const meineOrte = (benutzerId: string) =>
    db
      .select()
      .from(ort)
      .where(or(eq(ort.benutzerId, benutzerId), and(isNull(ort.benutzerId), eq(ort.typ, "praxis"))))
      .orderBy(asc(ort.erstelltAm));

  function datumPruefen(request: FastifyRequest<{ Params: { datum: string } }>, reply: FastifyReply): string | null {
    const r = datumSchema.safeParse(request.params.datum);
    if (!r.success) {
      reply.code(400).send({ fehler: "Ungültiges Datum" });
      return null;
    }
    return r.data;
  }

  /** Gespeicherte Tour oder Vorschlag aus der Tourvorlage des Wochentags. */
  async function tourOderVorschlag(hebammeId: string, datum: string): Promise<{ tour: Tour | null; einstellung: Omit<Tour, "id" | "erstelltAm" | "geaendertAm"> | null; vorlage: string | null }> {
    const [t] = await db.select().from(tour).where(and(eq(tour.hebammeId, hebammeId), eq(tour.datum, datum)));
    if (t) return { tour: t, einstellung: t, vorlage: null };
    const orte = await meineOrte(hebammeId);
    const vorlagen = await db.select().from(tourvorlage).where(eq(tourvorlage.benutzerId, hebammeId)).orderBy(asc(tourvorlage.erstelltAm));
    const v = vorlagen.find((x) => x.wochentage.includes(wochentag(datum)));
    const privat = orte.find((o) => o.typ === "privat") ?? orte[0];
    if (!v && !privat) return { tour: null, einstellung: null, vorlage: null };
    return {
      tour: null,
      vorlage: v?.name ?? null,
      einstellung: {
        hebammeId,
        datum,
        startOrtId: v?.startOrtId ?? privat!.id,
        endeOrtId: v?.endeOrtId ?? privat!.id,
        wegegeldAusgangsOrtId: v?.wegegeldAusgangsOrtId ?? privat!.id,
        startZeit: v?.startZeit ?? "08:00",
        endeSpaetestens: v?.endeSpaetestens ?? null,
        pufferMin: 5,
        status: "entwurf",
        meter: null,
        fahrSek: null,
        ankunftEnde: null,
        geometrie: null,
        quelle: null,
        hinweise: [],
      },
    };
  }

  async function tourSichern(hebammeId: string, datum: string): Promise<Tour | null> {
    const { tour: t, einstellung } = await tourOderVorschlag(hebammeId, datum);
    if (t) return t;
    if (!einstellung) return null;
    const [neu] = await db.insert(tour).values(einstellung).onConflictDoNothing().returning();
    if (neu) return neu;
    const [vorhanden] = await db.select().from(tour).where(and(eq(tour.hebammeId, hebammeId), eq(tour.datum, datum)));
    return vorhanden ?? null;
  }

  async function termineLaden(hebammeId: string, datum: string) {
    const zeilen = await db
      .select({
        t: termin,
        klientinId: klientin.id,
        name: sql<string>`${klientin.vorname} || ' ' || ${klientin.nachname}`,
        strasse: klientin.strasse,
        plz: klientin.plz,
        ort: klientin.ort,
        telefon: klientin.telefon,
        lat: klientin.lat,
        lon: klientin.lon,
        geoQuelle: klientin.geoQuelle,
        hinweise: klientin.hinweise,
        besuchStatus: besuch.status,
      })
      .from(termin)
      .innerJoin(betreuung, eq(betreuung.id, termin.betreuungId))
      .innerJoin(klientin, eq(klientin.id, betreuung.klientinId))
      .leftJoin(besuch, eq(besuch.id, termin.besuchId))
      .where(and(eq(termin.hebammeId, hebammeId), eq(termin.datum, datum)))
      .orderBy(sql`${termin.reihenfolge} nulls last`, asc(termin.erstelltAm));
    const betreuungIds = [...new Set(zeilen.map((z) => z.t.betreuungId))];
    const kinder = betreuungIds.length ? await db.select().from(kind).where(inArray(kind.betreuungId, betreuungIds)).orderBy(asc(kind.geburtsdatum)) : [];
    return zeilen.map(({ t, ...k }) => {
      const geburt = kinder.find((x) => x.betreuungId === t.betreuungId)?.geburtsdatum;
      return { ...t, klientin: { ...k, lebenstag: geburt ? lebenstag(geburt, datum) : null } };
    });
  }

  /** Wochenbett-Familien der Hebamme, die an diesem Tag noch nicht eingeplant sind (Vorschläge). */
  async function vorschlaege(hebammeId: string, datum: string, geplant: Set<string>) {
    const offen = await db
      .select({ betreuungId: betreuung.id, name: sql<string>`${klientin.vorname} || ' ' || ${klientin.nachname}`, ort: klientin.ort, status: betreuung.status })
      .from(betreuung)
      .innerJoin(klientin, eq(klientin.id, betreuung.klientinId))
      .where(
        and(
          eq(klientin.archiviert, false),
          inArray(betreuung.status, ["schwangerschaft", "wochenbett"]),
          or(eq(betreuung.zustaendigeHebammeId, hebammeId), and(isNull(betreuung.zustaendigeHebammeId), eq(klientin.zustaendigeHebammeId, hebammeId))),
        ),
      );
    const ids = offen.map((o) => o.betreuungId);
    const kinder = ids.length ? await db.select().from(kind).where(inArray(kind.betreuungId, ids)).orderBy(asc(kind.geburtsdatum)) : [];
    const letzte = ids.length
      ? await db.select({ betreuungId: besuch.betreuungId, datum: sql<string>`max(${besuch.datum})` }).from(besuch).where(and(inArray(besuch.betreuungId, ids), lte(besuch.datum, datum))).groupBy(besuch.betreuungId)
      : [];
    return offen
      .filter((o) => !geplant.has(o.betreuungId))
      .map((o) => {
        const geburt = kinder.find((k) => k.betreuungId === o.betreuungId)?.geburtsdatum;
        const lt = geburt ? lebenstag(geburt, datum) : null;
        return { ...o, lebenstag: lt, letzterBesuch: letzte.find((l) => l.betreuungId === o.betreuungId)?.datum ?? null, wichtig: lt != null && lt >= 1 && lt <= 3 };
      })
      .filter((o) => o.status === "wochenbett" && o.lebenstag != null && o.lebenstag >= 0 && o.lebenstag <= 84)
      .sort((a, b) => (a.lebenstag ?? 99) - (b.lebenstag ?? 99));
  }

  app.get("/api/geo/status", async () => ({
    routing: config.osrmUrl ? "osrm" : "luftlinie",
    adressen: await anzahlAdressen(db),
    kacheln: config.kartenKacheln || null,
    kartenHinweis: config.kartenHinweis,
  }));

  // ------------------------------------------------------------ Tag
  app.get<{ Params: { datum: string } }>("/api/touren/:datum", async (request, reply) => {
    const datum = datumPruefen(request, reply);
    if (!datum) return;
    const ich = request.benutzer!.id;
    const { tour: t, einstellung, vorlage } = await tourOderVorschlag(ich, datum);
    const termine = await termineLaden(ich, datum);
    return {
      datum,
      tour: t,
      einstellung,
      vorlage,
      orte: await meineOrte(ich),
      termine,
      vorschlaege: await vorschlaege(ich, datum, new Set(termine.filter((x) => x.status !== "abgesagt").map((x) => x.betreuungId))),
      wegegeld: await wegegeldStand(db, ich, datum),
    };
  });

  app.put<{ Params: { datum: string } }>("/api/touren/:datum", async (request, reply) => {
    const datum = datumPruefen(request, reply);
    if (!datum) return;
    const daten = pruefen(tourEinstellungSchema, request.body, reply);
    if (!daten) return;
    const ich = request.benutzer!.id;
    const erlaubt = new Set((await meineOrte(ich)).map((o) => o.id));
    if (![daten.startOrtId, daten.endeOrtId, daten.wegegeldAusgangsOrtId].every((id) => erlaubt.has(id))) return reply.code(400).send({ fehler: "Unbekannter Ort" });
    const [t] = await db
      .insert(tour)
      .values({ ...daten, hebammeId: ich, datum })
      .onConflictDoUpdate({ target: [tour.hebammeId, tour.datum], set: { ...daten, status: "entwurf", geaendertAm: new Date() } })
      .returning();
    await wegegeldNeuBerechnen(db, ich, datum);
    return t;
  });

  // ------------------------------------------------------------ Termine
  async function betreuungErlaubt(betreuungId: string) {
    const [b] = await db.select({ id: betreuung.id }).from(betreuung).where(eq(betreuung.id, betreuungId));
    return !!b;
  }

  app.post<{ Params: { datum: string } }>("/api/touren/:datum/termine", async (request, reply) => {
    const datum = datumPruefen(request, reply);
    if (!datum) return;
    const daten = pruefen(terminSchema, request.body, reply);
    if (!daten) return;
    if (!(await betreuungErlaubt(daten.betreuungId))) return reply.code(404).send({ fehler: "Betreuung nicht gefunden" });
    const ich = request.benutzer!.id;
    await tourSichern(ich, datum);
    const [neu] = await db.insert(termin).values({ ...daten, hebammeId: ich, datum }).returning();
    await db.update(tour).set({ status: "entwurf" }).where(and(eq(tour.hebammeId, ich), eq(tour.datum, datum)));
    await protokollieren(db, ich, "angelegt", "termin", neu!.id);
    return neu;
  });

  async function eigenerTermin(id: string, request: FastifyRequest, reply: FastifyReply) {
    const [t] = await db.select().from(termin).where(and(eq(termin.id, id), eq(termin.hebammeId, request.benutzer!.id)));
    if (!t) reply.code(404).send({ fehler: "Termin nicht gefunden" });
    return t;
  }

  app.put<{ Params: { id: string } }>("/api/termine/:id", async (request, reply) => {
    const t = await eigenerTermin(request.params.id, request, reply);
    if (!t) return;
    const daten = pruefen(terminSchema, request.body, reply);
    if (!daten) return;
    const [neu] = await db.update(termin).set({ ...daten, geaendertAm: new Date() }).where(eq(termin.id, t.id)).returning();
    await db.update(tour).set({ status: "entwurf" }).where(and(eq(tour.hebammeId, t.hebammeId), eq(tour.datum, t.datum)));
    return neu;
  });

  app.post<{ Params: { id: string } }>("/api/termine/:id/status", async (request, reply) => {
    const t = await eigenerTermin(request.params.id, request, reply);
    if (!t) return;
    const daten = pruefen(z.object({ status: z.enum(["geplant", "erledigt", "abgesagt"]) }), request.body, reply);
    if (!daten) return;
    const [neu] = await db.update(termin).set({ status: daten.status, geaendertAm: new Date() }).where(eq(termin.id, t.id)).returning();
    return neu;
  });

  /** Termin auf einen anderen Tag verschieben */
  app.post<{ Params: { id: string } }>("/api/termine/:id/verschieben", async (request, reply) => {
    const t = await eigenerTermin(request.params.id, request, reply);
    if (!t) return;
    const daten = pruefen(z.object({ datum: datumSchema }), request.body, reply);
    if (!daten) return;
    if (t.besuchId) return reply.code(409).send({ fehler: "Der Termin ist bereits dokumentiert." });
    await tourSichern(t.hebammeId, daten.datum);
    const [neu] = await db.update(termin).set({ datum: daten.datum, reihenfolge: null, ankunft: null, status: "geplant", geaendertAm: new Date() }).where(eq(termin.id, t.id)).returning();
    await db.update(tour).set({ status: "entwurf" }).where(and(eq(tour.hebammeId, t.hebammeId), inArray(tour.datum, [t.datum, daten.datum])));
    return neu;
  });

  app.delete<{ Params: { id: string } }>("/api/termine/:id", async (request, reply) => {
    const t = await eigenerTermin(request.params.id, request, reply);
    if (!t) return;
    if (t.besuchId) return reply.code(409).send({ fehler: "Der Termin ist bereits dokumentiert und bleibt erhalten. Stattdessen absagen." });
    await db.delete(termin).where(eq(termin.id, t.id));
    await db.update(tour).set({ status: "entwurf" }).where(and(eq(tour.hebammeId, t.hebammeId), eq(tour.datum, t.datum)));
    await protokollieren(db, t.hebammeId, "geloescht", "termin", t.id);
    return { ok: true };
  });

  // ------------------------------------------------------------ Planen
  const planenSchema = z.object({
    modus: z.enum(["optimieren", "reihenfolge", "ab_jetzt"]).default("optimieren"),
    reihenfolge: z.array(z.string().uuid()).optional(),
  });

  app.post<{ Params: { datum: string } }>("/api/touren/:datum/planen", async (request, reply) => {
    const datum = datumPruefen(request, reply);
    if (!datum) return;
    const daten = pruefen(planenSchema, request.body ?? {}, reply);
    if (!daten) return;
    const ich = request.benutzer!.id;
    const t = await tourSichern(ich, datum);
    if (!t) return reply.code(400).send({ fehler: "Bitte zuerst unter Einstellungen → Orte & Touren die Wohnanschrift anlegen." });
    const orte = await meineOrte(ich);
    const startOrt = orte.find((o) => o.id === t.startOrtId);
    const endeOrt = orte.find((o) => o.id === t.endeOrtId);
    const alle = (await termineLaden(ich, datum)).filter((x) => x.status !== "abgesagt");

    // Bei "ab jetzt" bleiben erledigte Besuche, wo sie sind; geplant wird ab dem letzten erledigten Besuch
    let erledigt: typeof alle = [];
    let offen = alle;
    if (daten.modus === "ab_jetzt") {
      erledigt = alle.filter((x) => x.status === "erledigt");
      offen = alle.filter((x) => x.status !== "erledigt");
    }
    if (!offen.length) return reply.code(400).send({ fehler: "Keine offenen Besuche zu planen." });

    const ohnePosition = offen.filter((x) => x.klientin.lat == null || x.klientin.lon == null);
    const fehlend = [
      ...(!ortPunkt(startOrt) ? [`Start „${startOrt?.bezeichnung ?? "?"}“`] : []),
      ...(!ortPunkt(endeOrt) ? [`Ende „${endeOrt?.bezeichnung ?? "?"}“`] : []),
      ...ohnePosition.map((x) => x.klientin.name),
    ];
    if (fehlend.length) return reply.code(400).send({ fehler: `Position unbekannt: ${fehlend.join(", ")}. Bitte auf der Karte setzen.` });

    const letzter = erledigt.at(-1);
    const start = letzter ? { lat: letzter.klientin.lat!, lon: letzter.klientin.lon! } : ortPunkt(startOrt)!;
    const punkte = [start, ...offen.map((x) => ({ lat: x.klientin.lat!, lon: x.klientin.lon! })), ortPunkt(endeOrt)!];
    const matrix = await routing.matrix(punkte);
    const stopps: Stopp[] = offen.map((x) => ({ dauerMin: x.dauerMin, ...terminFenster(x), wichtig: x.wichtig }));
    const parameter = {
      startMin: daten.modus === "ab_jetzt" ? Math.max(jetztMin(), uhrzeitZuMin(t.startZeit)) : uhrzeitZuMin(t.startZeit),
      endeSpaetestens: t.endeSpaetestens ? uhrzeitZuMin(t.endeSpaetestens) : null,
      pufferMin: t.pufferMin,
    };

    let z: TourZeiten;
    if (daten.modus === "optimieren") z = tourOptimieren(matrix, stopps, parameter);
    else {
      const wunsch = daten.reihenfolge ?? offen.map((x) => x.id);
      const folge = wunsch.map((id) => offen.findIndex((x) => x.id === id) + 1).filter((i) => i > 0);
      for (let i = 1; i <= offen.length; i++) if (!folge.includes(i)) folge.push(i);
      z = tourZeiten(folge, matrix, stopps, parameter);
    }

    // Verlauf für die Karte: gesamte Tour einschließlich erledigter Besuche
    const reihe = [...erledigt, ...z.reihenfolge.map((i) => offen[i - 1]!)];
    const strecke = await routing.strecke([ortPunkt(startOrt)!, ...reihe.map((x) => ({ lat: x.klientin.lat!, lon: x.klientin.lon! })), ortPunkt(endeOrt)!]);
    const lesbar: string[] = [];
    z.reihenfolge.forEach((i, k) => {
      const x = offen[i - 1]!;
      if (z.verspaetung[k]! >= 1) lesbar.push(`${x.klientin.name}: Ankunft ${Math.round(z.verspaetung[k]!)} Min. nach dem vereinbarten Zeitpunkt${x.wichtig ? " (muss heute sein)" : ""}.`);
    });
    if (z.endeVerspaetung >= 1 && t.endeSpaetestens) {
      lesbar.push(`Ziel „${endeOrt!.bezeichnung}“ erst um ${minZuUhrzeit(z.ankunftEnde)} erreicht (spätestens ${t.endeSpaetestens}). Einen Besuch verschieben oder früher starten.`);
    }

    await db.transaction(async (tx) => {
      for (const [k, x] of erledigt.entries()) await tx.update(termin).set({ reihenfolge: k + 1 }).where(eq(termin.id, x.id));
      for (const [k, i] of z.reihenfolge.entries()) {
        await tx
          .update(termin)
          .set({ reihenfolge: erledigt.length + k + 1, ankunft: minZuUhrzeit(z.beginn[k]!) })
          .where(eq(termin.id, offen[i - 1]!.id));
      }
      await tx
        .update(tour)
        .set({
          meter: strecke.meter,
          fahrSek: strecke.sek,
          ankunftEnde: minZuUhrzeit(z.ankunftEnde),
          geometrie: strecke.geometrie,
          quelle: strecke.quelle,
          hinweise: lesbar,
          status: "entwurf",
          geaendertAm: new Date(),
        })
        .where(eq(tour.id, t.id));
    });
    await wegegeldNeuBerechnen(db, ich, datum);
    return { ok: true, hinweise: lesbar, quelle: strecke.quelle };
  });

  app.post<{ Params: { datum: string } }>("/api/touren/:datum/bestaetigen", async (request, reply) => {
    const datum = datumPruefen(request, reply);
    if (!datum) return;
    const [t] = await db
      .update(tour)
      .set({ status: "bestaetigt", geaendertAm: new Date() })
      .where(and(eq(tour.hebammeId, request.benutzer!.id), eq(tour.datum, datum)))
      .returning();
    if (!t) return reply.code(404).send({ fehler: "Für diesen Tag gibt es noch keine Tour." });
    await protokollieren(db, request.benutzer!.id, "bestaetigt", "tour", t.id);
    return t;
  });

  // ------------------------------------------------------------ Wegegeld
  app.get<{ Params: { datum: string } }>("/api/wegegeld/:datum", async (request, reply) => {
    const datum = datumPruefen(request, reply);
    if (!datum) return;
    return (await wegegeldStand(db, request.benutzer!.id, datum)) ?? (await wegegeldNeuBerechnen(db, request.benutzer!.id, datum));
  });

  app.put<{ Params: { datum: string } }>("/api/wegegeld/:datum", async (request, reply) => {
    const datum = datumPruefen(request, reply);
    if (!datum) return;
    const daten = pruefen(wegegeldTagSchema, request.body, reply);
    if (!daten) return;
    const ich = request.benutzer!.id;
    const stand = await wegegeldStand(db, ich, datum);
    if (stand?.gesperrt) return reply.code(409).send({ fehler: "Das Wegegeld dieses Tages ist schon einem Versand zugeordnet." });
    await db
      .insert(wegegeldTag)
      .values({ hebammeId: ich, datum, ...daten })
      .onConflictDoUpdate({ target: [wegegeldTag.hebammeId, wegegeldTag.datum], set: daten });
    await protokollieren(db, ich, "geaendert", "wegegeld", datum, daten);
    return wegegeldNeuBerechnen(db, ich, datum);
  });

  // ------------------------------------------------------------ Fahrtenbuch
  const zeitraumSchema = z.object({ von: datumSchema, bis: datumSchema });

  async function fahrtenLaden(hebammeId: string, von: string, bis: string) {
    const liste = await db
      .select()
      .from(fahrt)
      .where(and(eq(fahrt.hebammeId, hebammeId), gte(fahrt.datum, von), lte(fahrt.datum, bis)))
      .orderBy(asc(fahrt.datum), asc(fahrt.kmStandBeginn), asc(fahrt.erstelltAm));
    // Lücken im Kilometerstand sind Privatfahrten zwischen zwei Einträgen
    const [vorher] = await db
      .select()
      .from(fahrt)
      .where(and(eq(fahrt.hebammeId, hebammeId), sql`${fahrt.datum} < ${von}`, sql`${fahrt.kmStandEnde} is not null`))
      .orderBy(desc(fahrt.datum), desc(fahrt.kmStandEnde))
      .limit(1);
    let letzterStand = vorher?.kmStandEnde ?? null;
    const eintraege = liste.map((f) => {
      const luecke = letzterStand != null && f.kmStandBeginn != null && f.kmStandBeginn > letzterStand ? f.kmStandBeginn - letzterStand : 0;
      const hinweise: string[] = [];
      if (letzterStand != null && f.kmStandBeginn != null && f.kmStandBeginn < letzterStand) hinweise.push(`Kilometerstand kleiner als am Ende der vorigen Fahrt (${letzterStand}).`);
      if (f.kmStandBeginn != null && f.kmStandEnde != null) {
        const gefahren = f.kmStandEnde - f.kmStandBeginn;
        const summe = f.kmDienstlich + f.kmWohnungBetrieb + f.kmPrivat;
        if (Math.abs(gefahren - summe) > Math.max(2, gefahren * 0.1)) hinweise.push(`Laut Kilometerstand ${gefahren} km, aufgeteilt sind ${summe.toFixed(1)} km.`);
      }
      if (f.kmStandEnde != null) letzterStand = f.kmStandEnde;
      return { ...f, privatLuecke: luecke, hinweise };
    });
    const summen = eintraege.reduce(
      (s, f) => ({ dienstlich: s.dienstlich + f.kmDienstlich, wohnungBetrieb: s.wohnungBetrieb + f.kmWohnungBetrieb, privat: s.privat + f.kmPrivat + f.privatLuecke }),
      { dienstlich: 0, wohnungBetrieb: 0, privat: 0 },
    );
    return { eintraege, summen };
  }

  app.get<{ Querystring: { von?: string; bis?: string } }>("/api/fahrtenbuch", async (request, reply) => {
    const q = pruefen(zeitraumSchema, request.query, reply);
    if (!q) return;
    return fahrtenLaden(request.benutzer!.id, q.von, q.bis);
  });

  app.post("/api/fahrtenbuch", async (request, reply) => {
    const daten = pruefen(fahrtSchema, request.body, reply);
    if (!daten) return;
    const [neu] = await db.insert(fahrt).values({ ...daten, hebammeId: request.benutzer!.id }).returning();
    await protokollieren(db, request.benutzer!.id, "angelegt", "fahrt", neu!.id);
    return neu;
  });

  async function eigeneFahrt(id: string, request: FastifyRequest, reply: FastifyReply) {
    const [f] = await db.select().from(fahrt).where(and(eq(fahrt.id, id), eq(fahrt.hebammeId, request.benutzer!.id)));
    if (!f) reply.code(404).send({ fehler: "Fahrt nicht gefunden" });
    return f;
  }

  app.put<{ Params: { id: string } }>("/api/fahrtenbuch/:id", async (request, reply) => {
    const f = await eigeneFahrt(request.params.id, request, reply);
    if (!f) return;
    const daten = pruefen(fahrtSchema, request.body, reply);
    if (!daten) return;
    const [neu] = await db.update(fahrt).set({ ...daten, geaendertAm: new Date() }).where(eq(fahrt.id, f.id)).returning();
    // Änderungen bleiben nachvollziehbar (Anforderung an ein ordnungsgemäßes Fahrtenbuch)
    await protokollieren(db, request.benutzer!.id, "geaendert", "fahrt", f.id, { vorher: f, nachher: daten });
    return neu;
  });

  app.delete<{ Params: { id: string } }>("/api/fahrtenbuch/:id", async (request, reply) => {
    const f = await eigeneFahrt(request.params.id, request, reply);
    if (!f) return;
    await db.delete(fahrt).where(eq(fahrt.id, f.id));
    await protokollieren(db, request.benutzer!.id, "geloescht", "fahrt", f.id, { vorher: f });
    return { ok: true };
  });

  /** Erzeugt (oder aktualisiert) den Fahrtenbuch-Eintrag eines Tages aus der Tour bzw. den Besuchen. */
  app.post<{ Params: { datum: string } }>("/api/fahrtenbuch/aus-tag/:datum", async (request, reply) => {
    const datum = datumPruefen(request, reply);
    if (!datum) return;
    const ich = request.benutzer!.id;
    const t = await tourSichern(ich, datum);
    if (!t) return reply.code(400).send({ fehler: "Bitte zuerst die Wohnanschrift unter Einstellungen → Orte & Touren anlegen." });
    const orte = await meineOrte(ich);
    const startOrt = orte.find((o) => o.id === t.startOrtId)!;
    const endeOrt = orte.find((o) => o.id === t.endeOrtId)!;

    // Stopps: Termine der Tour; ohne Termine die abgeschlossenen Hausbesuche des Tages
    let stopps = (await termineLaden(ich, datum)).filter((x) => x.status !== "abgesagt").map((x) => ({ ort: x.klientin.ort, plz: x.klientin.plz, lat: x.klientin.lat, lon: x.klientin.lon }));
    if (!stopps.length) {
      stopps = (
        await db
          .select({ ort: klientin.ort, plz: klientin.plz, lat: klientin.lat, lon: klientin.lon })
          .from(besuch)
          .innerJoin(betreuung, eq(betreuung.id, besuch.betreuungId))
          .innerJoin(klientin, eq(klientin.id, betreuung.klientinId))
          .where(and(eq(besuch.hebammeId, ich), eq(besuch.datum, datum), eq(besuch.art, 1), ne(besuch.status, "entwurf")))
          .orderBy(asc(besuch.von))
      ).map((x) => x);
    }
    if (!stopps.length) return reply.code(400).send({ fehler: "An diesem Tag gibt es keine Hausbesuche." });
    const punkte = [ortPunkt(startOrt), ...stopps.map((s) => (s.lat != null && s.lon != null ? { lat: s.lat, lon: s.lon } : null)), ortPunkt(endeOrt)];
    if (punkte.some((p) => !p)) return reply.code(400).send({ fehler: "Für einen Ort oder eine Familie ist keine Position bekannt. Bitte auf der Karte setzen." });
    const strecke = await routing.strecke(punkte as Array<{ lat: number; lon: number }>);

    // Abschnitte zuordnen: Hausbesuche dienstlich, Fahrt zur Schule/Kita privat
    const typen: Array<{ typ: string }> = [{ typ: startOrt.typ }, ...stopps.map(() => ({ typ: "besuch" })), { typ: endeOrt.typ }];
    const kmJe: Record<FahrtArt, number> = { dienstlich: 0, wohnung_betrieb: 0, privat: 0 };
    strecke.abschnitte.forEach((a, i) => (kmJe[abschnittArt(typen[i]!, typen[i + 1]!)] += a.meter / 1000));
    const ortName = (o: Ort) => o.bezeichnung;
    const werte = {
      strecke: [ortName(startOrt), ...stopps.map((s) => [s.plz, s.ort].filter(Boolean).join(" ") || "Hausbesuch"), ortName(endeOrt)].join(" – "),
      zweck: `Hausbesuche (${stopps.length})`,
      kmDienstlich: Math.round(kmJe.dienstlich * 10) / 10,
      kmWohnungBetrieb: Math.round(kmJe.wohnung_betrieb * 10) / 10,
      kmPrivat: Math.round(kmJe.privat * 10) / 10,
    };
    const [vorhanden] = await db.select().from(fahrt).where(and(eq(fahrt.hebammeId, ich), eq(fahrt.tourId, t.id)));
    let f;
    if (vorhanden) {
      [f] = await db.update(fahrt).set({ ...werte, geaendertAm: new Date() }).where(eq(fahrt.id, vorhanden.id)).returning();
      await protokollieren(db, ich, "geaendert", "fahrt", vorhanden.id, { vorher: vorhanden, nachher: werte });
    } else {
      // Kilometerstand am Beginn: Ende der letzten Fahrt (Vorschlag, bitte prüfen)
      const [letzte] = await db.select({ kmStandEnde: fahrt.kmStandEnde }).from(fahrt).where(and(eq(fahrt.hebammeId, ich), sql`${fahrt.kmStandEnde} is not null`, lte(fahrt.datum, datum))).orderBy(desc(fahrt.datum), desc(fahrt.kmStandEnde)).limit(1);
      [f] = await db.insert(fahrt).values({ ...werte, datum, hebammeId: ich, tourId: t.id, kmStandBeginn: letzte?.kmStandEnde ?? null }).returning();
      await protokollieren(db, ich, "angelegt", "fahrt", f!.id);
    }
    return { ...f, quelle: strecke.quelle };
  });

  function csvFeld(v: unknown): string {
    const s = v == null ? "" : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  const zahl = (x: number) => x.toFixed(1).replace(".", ",");

  app.get<{ Querystring: { von?: string; bis?: string } }>("/api/fahrtenbuch/export.csv", async (request, reply) => {
    const q = pruefen(zeitraumSchema, request.query, reply);
    if (!q) return;
    const { eintraege } = await fahrtenLaden(request.benutzer!.id, q.von, q.bis);
    const kopf = ["Datum", "km-Stand Beginn", "km-Stand Ende", "Strecke", "Zweck", "km dienstlich", "km Wohnung-Praxis", "km privat", "Privatfahrten davor (Lücke)"];
    const zeilen = eintraege.map((f) => [datumDe(f.datum), f.kmStandBeginn, f.kmStandEnde, f.strecke, f.zweck, zahl(f.kmDienstlich), zahl(f.kmWohnungBetrieb), zahl(f.kmPrivat), f.privatLuecke || ""]);
    const text = "﻿" + [kopf, ...zeilen].map((z) => z.map(csvFeld).join(";")).join("\r\n") + "\r\n";
    return reply
      .header("content-type", "text/csv; charset=utf-8")
      .header("content-disposition", `attachment; filename="fahrtenbuch-${q.von}-bis-${q.bis}.csv"`)
      .send(text);
  });

  app.get<{ Querystring: { von?: string; bis?: string } }>("/api/fahrtenbuch/export.pdf", async (request, reply) => {
    const q = pruefen(zeitraumSchema, request.query, reply);
    if (!q) return;
    const { eintraege, summen } = await fahrtenLaden(request.benutzer!.id, q.von, q.bis);
    const doc = await PDFDocument.create();
    doc.setTitle(`Fahrtenbuch ${q.von} bis ${q.bis}`);
    const s = await schriftenLaden(doc);
    const w = new Schreiber(doc, s, `Fahrtenbuch · ${request.benutzer!.name} · ${datumDe(q.von)} bis ${datumDe(q.bis)}`);
    w.text("Fahrtenbuch", { groesse: 16, fett: true, abstand: 4 });
    w.felder([
      ["Hebamme", request.benutzer!.name],
      ["Zeitraum", `${datumDe(q.von)} bis ${datumDe(q.bis)}`],
      ["Summe dienstlich", `${zahl(summen.dienstlich)} km`],
      [FAHRT_ART_LABEL.wohnung_betrieb, `${zahl(summen.wohnungBetrieb)} km`],
      ["Summe privat (inkl. Lücken)", `${zahl(summen.privat)} km`],
    ]);
    w.tabelle(
      ["Datum", "km-Stand", "Strecke / Zweck", "dienstl.", "Wohn.–Praxis", "privat"],
      eintraege.flatMap((f) => [
        ...(f.privatLuecke ? [["", "", `Privatfahrten (Lücke im Kilometerstand)`, "", "", String(f.privatLuecke)]] : []),
        [datumDe(f.datum), `${f.kmStandBeginn ?? "–"}\n${f.kmStandEnde ?? "–"}`, `${f.strecke}\n${f.zweck}`, zahl(f.kmDienstlich), zahl(f.kmWohnungBetrieb), zahl(f.kmPrivat)],
      ]),
      [52, 55, 250, 52, 62, 52.28],
      { rechts: [3, 4, 5], groesse: 8 },
    );
    w.text("Namen der Familien werden wegen der Schweigepflicht nicht aufgeführt; die Zuordnung ergibt sich aus der Besuchsdokumentation der App.", { groesse: 8, farbe: [0.35, 0.37, 0.3] });
    return reply
      .header("content-type", "application/pdf")
      .header("content-disposition", `inline; filename="fahrtenbuch-${q.von}-bis-${q.bis}.pdf"`)
      .send(Buffer.from(await doc.save()));
  });
}
