import {
  besuchAbrechnen,
  istKursBesuch,
  besuchSchema,
  betreuungSchema,
  kindSchema,
  klientinSchema,
  kontingentStand,
  lebenstag,
  neueKlientinSchema,
  positionSchema,
  sswAusEt,
  type FruehererBesuch,
  type Leistungsart,
  type Leistungstyp,
  type RegelwerkDaten,
} from "@kindkesmoeoen/shared";
import { and, asc, desc, eq, gte, inArray, isNull, lte, ne, notInArray, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Datenbank } from "../db/client";
import { benutzer, besuch, besuchHistorie, betreuung, einwilligung, kind, klientin, kontakt, leistung, termin } from "../db/schema";
import { pruefen } from "../fehler";
import { klientinVerorten } from "../geo/positionen";
import { protokollieren } from "../protokoll";
import { regelwerkFuer } from "../regelwerk-laden";
import { wegegeldFuerKlientin, wegegeldNeuBerechnen } from "../wegegeld";

type Besuch = typeof besuch.$inferSelect;
const heuteIso = () => new Date().toISOString().slice(0, 10);

/** Abrechnungskontext einer Betreuung: Geburtsdatum, ET, Kinderzahl und frühere Besuche (ohne den aktuellen). */
async function kontextLaden(db: Datenbank, betreuungId: string, ohneBesuchId?: string) {
  const [b] = await db.select().from(betreuung).where(eq(betreuung.id, betreuungId));
  if (!b) return undefined;
  const kinder = await db.select().from(kind).where(eq(kind.betreuungId, betreuungId)).orderBy(asc(kind.geburtsdatum));
  const besuche = await db
    .select()
    .from(besuch)
    .where(ohneBesuchId ? and(eq(besuch.betreuungId, betreuungId), ne(besuch.id, ohneBesuchId)) : eq(besuch.betreuungId, betreuungId))
    .orderBy(asc(besuch.datum), asc(besuch.von));
  const material = besuche.length
    ? await db
        .select({ besuchId: leistung.besuchId, gpos: leistung.gpos })
        .from(leistung)
        .where(and(inArray(leistung.besuchId, besuche.map((x) => x.id)), sql`${leistung.gpos} like '6%'`))
    : [];
  const fruehere: FruehererBesuch[] = besuche.map((x) => ({
    id: x.id,
    datum: x.datum,
    von: x.von,
    art: x.art as Leistungsart,
    stamm: x.stamm,
    einheiten: x.einheitenAbrechenbar,
    material: material.filter((m) => m.besuchId === x.id).map((m) => m.gpos),
  }));
  return { betreuung: b, kinder, besuche, fruehere, geburtsdatum: kinder[0]?.geburtsdatum ?? null };
}

function nurHebammen(request: FastifyRequest, reply: FastifyReply) {
  if (request.benutzer?.rolle !== "hebamme") {
    reply.code(403).send({ fehler: "Gesundheitsdaten sind nur für Hebammen sichtbar." });
    return false;
  }
  return true;
}

export async function akteRouten(app: FastifyInstance, db: Datenbank) {
  app.addHook("preHandler", async (request, reply) => {
    if (/^\/api\/(klientinnen|betreuungen|besuche|kinder|heute|kontakte)/.test(request.url) && !nurHebammen(request, reply)) return reply;
  });

  // ------------------------------------------------------------ Klientinnen
  app.get<{ Querystring: { q?: string; nur?: "meine" | "alle"; archiv?: string } }>("/api/klientinnen", async (request) => {
    const { q, nur, archiv } = request.query;
    const bedingungen = [eq(klientin.archiviert, archiv === "1")];
    // „Meine“: zuständig für die Klientin oder für eine ihrer Betreuungen, oder als Vertretung eingetragen
    if (nur === "meine") {
      const ich = request.benutzer!.id;
      bedingungen.push(
        or(
          eq(klientin.zustaendigeHebammeId, ich),
          sql`exists (select 1 from ${betreuung} where ${betreuung.klientinId} = ${klientin.id} and ${betreuung.status} <> 'abgeschlossen' and (${betreuung.zustaendigeHebammeId} = ${ich} or ${betreuung.vertretungHebammeId} = ${ich}))`,
        )!,
      );
    }
    if (q) bedingungen.push(sql`(${klientin.vorname} || ' ' || ${klientin.nachname} || ' ' || coalesce(${klientin.ort}, '')) ilike ${`%${q}%`}`);
    const liste = await db
      .select({
        id: klientin.id,
        vorname: klientin.vorname,
        nachname: klientin.nachname,
        ort: klientin.ort,
        telefon: klientin.telefon,
        zustaendig: benutzer.kuerzel,
        zustaendigeHebammeId: klientin.zustaendigeHebammeId,
        flaggen: klientin.flaggen,
      })
      .from(klientin)
      .innerJoin(benutzer, eq(benutzer.id, klientin.zustaendigeHebammeId))
      .where(and(...bedingungen))
      .orderBy(asc(klientin.nachname), asc(klientin.vorname));
    if (!liste.length) return [];
    const betreuungen = await db
      .select()
      .from(betreuung)
      .where(inArray(betreuung.klientinId, liste.map((k) => k.id)))
      .orderBy(desc(betreuung.erstelltAm));
    const kinder = betreuungen.length ? await db.select().from(kind).where(inArray(kind.betreuungId, betreuungen.map((b) => b.id))) : [];
    const heute = heuteIso();
    return liste.map((k) => {
      const b = betreuungen.find((x) => x.klientinId === k.id && x.status !== "abgeschlossen") ?? betreuungen.find((x) => x.klientinId === k.id);
      const ks = b ? kinder.filter((x) => x.betreuungId === b.id) : [];
      const geburt = ks.map((x) => x.geburtsdatum).sort()[0] ?? null;
      return {
        ...k,
        betreuung: b ? { id: b.id, status: b.status, et: b.et, vertretungHebammeId: b.vertretungHebammeId, geburtsdatum: geburt, lebenstag: geburt ? lebenstag(geburt, heute) : null, ssw: !geburt && b.et ? sswAusEt(b.et, heute).text : null, kinder: ks.map((x) => x.vorname) } : null,
      };
    });
  });

  app.post("/api/klientinnen", async (request, reply) => {
    const daten = pruefen(neueKlientinSchema, request.body, reply);
    if (!daten) return;
    const { et, ...stamm } = daten;
    const neu = await db.transaction(async (tx) => {
      const [k] = await tx.insert(klientin).values(stamm).returning();
      await tx.insert(betreuung).values({ klientinId: k!.id, status: "schwangerschaft", et, zustaendigeHebammeId: stamm.zustaendigeHebammeId });
      return k!;
    });
    await klientinVerorten(db, neu.id);
    await protokollieren(db, request.benutzer!.id, "angelegt", "klientin", neu.id);
    return neu;
  });

  app.get<{ Params: { id: string } }>("/api/klientinnen/:id", async (request, reply) => {
    const [k] = await db.select().from(klientin).where(eq(klientin.id, request.params.id));
    if (!k) return reply.code(404).send({ fehler: "Klientin nicht gefunden" });
    const betreuungen = await db.select().from(betreuung).where(eq(betreuung.klientinId, k.id)).orderBy(desc(betreuung.erstelltAm));
    const kinder = betreuungen.length ? await db.select().from(kind).where(inArray(kind.betreuungId, betreuungen.map((b) => b.id))).orderBy(asc(kind.geburtsdatum)) : [];
    const kontakte = await db.select().from(kontakt).where(eq(kontakt.klientinId, k.id)).orderBy(asc(kontakt.art), asc(kontakt.name));
    const einwilligungen = await db.select().from(einwilligung).where(eq(einwilligung.klientinId, k.id));
    await protokollieren(db, request.benutzer!.id, "angesehen", "klientin", k.id);
    return { ...k, kontakte, einwilligungen, betreuungen: betreuungen.map((b) => ({ ...b, kinder: kinder.filter((x) => x.betreuungId === b.id) })) };
  });

  app.put<{ Params: { id: string } }>("/api/klientinnen/:id", async (request, reply) => {
    const daten = pruefen(klientinSchema, request.body, reply);
    if (!daten) return;
    const [alt] = await db.select().from(klientin).where(eq(klientin.id, request.params.id));
    if (!alt) return reply.code(404).send({ fehler: "Klientin nicht gefunden" });
    const neueAnschrift = alt.strasse !== daten.strasse || alt.plz !== daten.plz || alt.ort !== daten.ort;
    await db
      .update(klientin)
      .set({ ...daten, ...(neueAnschrift ? { lat: null, lon: null, geoQuelle: null } : {}), geaendertAm: new Date() })
      .where(eq(klientin.id, alt.id));
    if (neueAnschrift) {
      await klientinVerorten(db, alt.id);
      await wegegeldFuerKlientin(db, alt.id);
    }
    await protokollieren(db, request.benutzer!.id, "geaendert", "klientin", alt.id);
    const [k] = await db.select().from(klientin).where(eq(klientin.id, alt.id));
    return k;
  });

  /** Position der Wohnung neu aus der Anschrift bestimmen (auch nach einer Korrektur von Hand). */
  app.post<{ Params: { id: string } }>("/api/klientinnen/:id/verorten", async (request, reply) => {
    const [alt] = await db.update(klientin).set({ geoQuelle: null }).where(eq(klientin.id, request.params.id)).returning({ id: klientin.id, lat: klientin.lat, lon: klientin.lon });
    if (!alt) return reply.code(404).send({ fehler: "Klientin nicht gefunden" });
    await klientinVerorten(db, alt.id);
    const [k] = await db.select().from(klientin).where(eq(klientin.id, alt.id));
    if (k!.lat == null) {
      // nichts gefunden: bisherige Position behalten
      if (alt.lat != null) await db.update(klientin).set({ lat: alt.lat, lon: alt.lon, geoQuelle: "manuell" }).where(eq(klientin.id, alt.id));
      return reply.code(422).send({ fehler: "Die Anschrift wurde nicht gefunden. Bitte Straße, Hausnummer und PLZ prüfen oder die Position auf der Karte setzen." });
    }
    await wegegeldFuerKlientin(db, k!.id);
    await protokollieren(db, request.benutzer!.id, "position", "klientin", k!.id, { quelle: k!.geoQuelle });
    return k;
  });

  /** Position der Wohnung von Hand setzen (Karte), z. B. bei Neubauten, die noch nicht im Adressverzeichnis stehen. */
  app.put<{ Params: { id: string } }>("/api/klientinnen/:id/position", async (request, reply) => {
    const p = pruefen(positionSchema, request.body, reply);
    if (!p) return;
    const [k] = await db.update(klientin).set({ lat: p.lat, lon: p.lon, geoQuelle: "manuell", geaendertAm: new Date() }).where(eq(klientin.id, request.params.id)).returning();
    if (!k) return reply.code(404).send({ fehler: "Klientin nicht gefunden" });
    await protokollieren(db, request.benutzer!.id, "position", "klientin", k.id);
    await wegegeldFuerKlientin(db, k.id);
    return k;
  });

  // ------------------------------------------------------------ Betreuungen und Kinder
  app.post<{ Params: { id: string } }>("/api/klientinnen/:id/betreuungen", async (request, reply) => {
    const daten = pruefen(betreuungSchema, request.body, reply);
    if (!daten) return;
    const [b] = await db.insert(betreuung).values({ ...daten, klientinId: request.params.id }).returning();
    await protokollieren(db, request.benutzer!.id, "angelegt", "betreuung", b!.id);
    return b;
  });

  app.put<{ Params: { id: string } }>("/api/betreuungen/:id", async (request, reply) => {
    const daten = pruefen(betreuungSchema, request.body, reply);
    if (!daten) return;
    const [b] = await db.update(betreuung).set({ ...daten, geaendertAm: new Date() }).where(eq(betreuung.id, request.params.id)).returning();
    if (!b) return reply.code(404).send({ fehler: "Betreuung nicht gefunden" });
    await protokollieren(db, request.benutzer!.id, "geaendert", "betreuung", b.id);
    return b;
  });

  app.post<{ Params: { id: string } }>("/api/betreuungen/:id/kinder", async (request, reply) => {
    const eingabe = pruefen(kindSchema, request.body, reply);
    if (!eingabe) return;
    const { geburtsmodus, ...daten } = eingabe;
    const [b] = await db.select().from(betreuung).where(eq(betreuung.id, request.params.id));
    if (!b) return reply.code(404).send({ fehler: "Betreuung nicht gefunden" });
    const [k] = await db
      .insert(kind)
      .values({ ...daten, betreuungId: b.id, laenge: daten.laenge?.toString() ?? null, kopfumfang: daten.kopfumfang?.toString() ?? null })
      .returning();
    // Mit der Geburt beginnt das Wochenbett; die Art der Geburt gehört zur Betreuung
    if (b.status === "schwangerschaft" || b.status === "anfrage") await db.update(betreuung).set({ status: "wochenbett" }).where(eq(betreuung.id, b.id));
    if (geburtsmodus !== undefined) await db.update(betreuung).set({ geburtsmodus, geaendertAm: new Date() }).where(eq(betreuung.id, b.id));
    await protokollieren(db, request.benutzer!.id, "angelegt", "kind", k!.id);
    return k;
  });

  app.put<{ Params: { id: string } }>("/api/kinder/:id", async (request, reply) => {
    const eingabe = pruefen(kindSchema, request.body, reply);
    if (!eingabe) return;
    const { geburtsmodus, ...daten } = eingabe;
    const [k] = await db
      .update(kind)
      .set({ ...daten, laenge: daten.laenge?.toString() ?? null, kopfumfang: daten.kopfumfang?.toString() ?? null, geaendertAm: new Date() })
      .where(eq(kind.id, request.params.id))
      .returning();
    if (!k) return reply.code(404).send({ fehler: "Kind nicht gefunden" });
    if (geburtsmodus !== undefined) await db.update(betreuung).set({ geburtsmodus, geaendertAm: new Date() }).where(eq(betreuung.id, k.betreuungId));
    await protokollieren(db, request.benutzer!.id, "geaendert", "kind", k.id);
    return k;
  });

  /** Wachstum eines Kindes: alle dokumentierten Gewichte, Längen und Kopfumfänge (auch Entwürfe, gekennzeichnet). */
  app.get<{ Params: { id: string } }>("/api/kinder/:id/gewicht", async (request, reply) => {
    const [k] = await db.select().from(kind).where(eq(kind.id, request.params.id));
    if (!k) return reply.code(404).send({ fehler: "Kind nicht gefunden" });
    const [b] = await db.select().from(betreuung).where(eq(betreuung.id, k.betreuungId));
    const [kl] = await db.select({ id: klientin.id, vorname: klientin.vorname, nachname: klientin.nachname }).from(klientin).where(eq(klientin.id, b!.klientinId));
    const besuche = await db
      .select({ id: besuch.id, datum: besuch.datum, von: besuch.von, status: besuch.status, dokumentation: besuch.dokumentation, hebamme: benutzer.kuerzel })
      .from(besuch)
      .innerJoin(benutzer, eq(benutzer.id, besuch.hebammeId))
      .where(eq(besuch.betreuungId, k.betreuungId))
      .orderBy(asc(besuch.datum), asc(besuch.von));
    const messung = (feld: "gewicht" | "laenge" | "kopfumfang") =>
      besuche
        .map((x) => {
          const roh = (x.dokumentation as { kinder?: Record<string, Record<string, unknown>> }).kinder?.[k.id]?.[feld];
          const wert = Number(String(roh ?? "").replace(",", "."));
          return roh != null && roh !== "" && Number.isFinite(wert) && wert > 0 ? { datum: x.datum, von: x.von, wert, besuchId: x.id, status: x.status, hebamme: x.hebamme } : null;
        })
        .filter((x) => x !== null);
    const werte = messung("gewicht").map(({ wert, ...w }) => ({ ...w, gramm: wert }));
    return { kind: k, klientin: kl, betreuungId: k.betreuungId, werte, laenge: messung("laenge"), kopfumfang: messung("kopfumfang") };
  });

  app.get<{ Params: { id: string } }>("/api/betreuungen/:id", async (request, reply) => {
    const [b] = await db.select().from(betreuung).where(eq(betreuung.id, request.params.id));
    if (!b) return reply.code(404).send({ fehler: "Betreuung nicht gefunden" });
    const [k] = await db
      .select({ id: klientin.id, vorname: klientin.vorname, nachname: klientin.nachname, ort: klientin.ort, hinweise: klientin.hinweise, flaggen: klientin.flaggen, sprache: klientin.sprache, allergien: klientin.allergien })
      .from(klientin)
      .where(eq(klientin.id, b.klientinId));
    const kinder = await db.select().from(kind).where(eq(kind.betreuungId, b.id)).orderBy(asc(kind.geburtsdatum));
    return { ...b, klientin: k, kinder };
  });

  // ------------------------------------------------------------ Besuche
  app.get<{ Params: { id: string } }>("/api/betreuungen/:id/besuche", async (request) => {
    const liste = await db
      .select({ besuch, hebamme: benutzer.kuerzel })
      .from(besuch)
      .innerJoin(benutzer, eq(benutzer.id, besuch.hebammeId))
      .where(eq(besuch.betreuungId, request.params.id))
      .orderBy(desc(besuch.datum), desc(besuch.von));
    return liste.map(({ besuch: b, hebamme }) => ({ ...b, unterschrift: { art: (b.unterschrift as { art: string }).art }, hebamme }));
  });

  app.get<{ Params: { id: string } }>("/api/betreuungen/:id/kontingente", async (request, reply) => {
    const k = await kontextLaden(db, request.params.id);
    if (!k) return reply.code(404).send({ fehler: "Betreuung nicht gefunden" });
    const rw = await regelwerkFuer(db, heuteIso());
    if (!rw) return [];
    const relevant = k.geburtsdatum ? ["301", "303", "306", "403"] : ["101-tel", "103", "104", "401"];
    return kontingentStand(k.fruehere, rw).filter((s) => relevant.includes(s.id) && (!["401", "403"].includes(s.id) || s.genutzt > 0));
  });

  /** Abrechnungskontext (Geburtsdatum, ET, frühere Besuche) für die Vorschau auf dem Gerät, wenn keine Verbindung besteht. */
  app.get<{ Params: { id: string } }>("/api/betreuungen/:id/abrechnungskontext", async (request, reply) => {
    const k = await kontextLaden(db, request.params.id);
    if (!k) return reply.code(404).send({ fehler: "Betreuung nicht gefunden" });
    return { geburtsdatum: k.geburtsdatum, et: k.betreuung.et, anzahlKinder: Math.max(1, k.kinder.length), fruehereBesuche: k.fruehere };
  });

  /** Berechnet Leistungen und Hinweise, ohne zu speichern (Live-Vorschau beim Dokumentieren). */
  app.post<{ Params: { id: string }; Querystring: { besuchId?: string } }>("/api/betreuungen/:id/besuche/vorschau", async (request, reply) => {
    const daten = pruefen(besuchSchema, request.body, reply);
    if (!daten) return;
    const k = await kontextLaden(db, request.params.id, request.query.besuchId);
    if (!k) return reply.code(404).send({ fehler: "Betreuung nicht gefunden" });
    const rw = await regelwerkFuer(db, daten.datum);
    if (!rw) return reply.code(400).send({ fehler: `Kein Regelwerk für ${daten.datum} vorhanden.` });
    return besuchAbrechnen(
      { datum: daten.datum, von: daten.von, bis: daten.bis, typ: daten.typ as Leistungstyp, art: daten.art, material: daten.material },
      { geburtsdatum: k.geburtsdatum, et: k.betreuung.et, anzahlKinder: Math.max(1, k.kinder.length), fruehereBesuche: k.fruehere },
      rw,
    );
  });

  async function besuchSpeichern(request: FastifyRequest, reply: FastifyReply, betreuungId: string, vorhanden?: Besuch) {
    const daten = pruefen(besuchSchema, request.body, reply);
    if (!daten) return;
    // Offline-Abgleich: Besuch mit dieser Gerätekennung schon übertragen? Dann als Änderung behandeln (keine Dublette)
    if (!vorhanden && daten.id) {
      const [schon] = await db.select().from(besuch).where(eq(besuch.id, daten.id));
      if (schon) {
        if (schon.hebammeId !== request.benutzer!.id || schon.betreuungId !== betreuungId) return reply.code(409).send({ fehler: "Kennung bereits vergeben." });
        vorhanden = schon;
      }
    }
    // Konflikt: Der Besuch wurde seit dem Laden auf einem anderen Gerät geändert
    if (vorhanden && daten.stand && new Date(daten.stand).getTime() !== vorhanden.geaendertAm.getTime()) {
      return reply.code(409).send({
        fehler: "Dieser Besuch wurde inzwischen auf einem anderen Gerät geändert.",
        konflikt: true,
        aktuell: {
          geaendertAm: vorhanden.geaendertAm,
          status: vorhanden.status,
          datum: vorhanden.datum,
          von: vorhanden.von,
          bis: vorhanden.bis,
          typ: vorhanden.typ,
          art: vorhanden.art,
          material: vorhanden.material,
          dokumentation: vorhanden.dokumentation,
          unterschrift: vorhanden.unterschrift,
        },
      });
    }
    const k = await kontextLaden(db, betreuungId, vorhanden?.id);
    if (!k) return reply.code(404).send({ fehler: "Betreuung nicht gefunden" });
    const rw = await regelwerkFuer(db, daten.datum);
    if (!rw) return reply.code(400).send({ fehler: `Kein Regelwerk für ${daten.datum} vorhanden.` });
    const ergebnis = besuchAbrechnen(
      { datum: daten.datum, von: daten.von, bis: daten.bis, typ: daten.typ as Leistungstyp, art: daten.art, material: daten.material },
      { geburtsdatum: k.geburtsdatum, et: k.betreuung.et, anzahlKinder: Math.max(1, k.kinder.length), fruehereBesuche: k.fruehere },
      rw,
    );

    if (daten.abschliessen) {
      if (ergebnis.hinweise.some((h) => h.stufe === "fehler")) {
        return reply.code(400).send({ fehler: "Der Besuch enthält Fehler und kann nicht abgeschlossen werden.", hinweise: ergebnis.hinweise });
      }
      if ((daten.art === 1 || daten.art === 2) && daten.unterschrift.art === "keine") {
        return reply.code(400).send({ fehler: "Bitte zuerst die Unterschrift der Versicherten einholen (§ 12 Anlage 1.1).", felder: { unterschrift: "Unterschrift fehlt" } });
      }
    }

    const werte = {
      betreuungId,
      hebammeId: vorhanden?.hebammeId ?? request.benutzer!.id,
      datum: daten.datum,
      von: daten.von,
      bis: daten.bis,
      typ: daten.typ as Leistungstyp,
      art: daten.art,
      material: daten.material,
      dokumentation: daten.dokumentation as Record<string, unknown>,
      unterschrift: daten.unterschrift as Record<string, unknown>,
      status: daten.abschliessen || vorhanden?.status === "abgeschlossen" ? ("abgeschlossen" as const) : ("entwurf" as const),
      regelwerkId: rw.id,
      stamm: ergebnis.stamm,
      einheiten: ergebnis.einheiten,
      einheitenAbrechenbar: ergebnis.einheitenAbrechenbar,
      summe: ergebnis.summe.toFixed(2),
      hinweise: ergebnis.hinweise,
      geaendertAm: new Date(),
    };

    const gespeichert = await db.transaction(async (tx) => {
      let b: Besuch;
      if (vorhanden) {
        const gesperrt = await tx.select({ id: leistung.id }).from(leistung).where(and(eq(leistung.besuchId, vorhanden.id), or(ne(leistung.status, "erfasst"), sql`${leistung.versandId} is not null`)));
        if (gesperrt.length) throw new Error("GESPERRT");
        if (vorhanden.status === "abgeschlossen") {
          await tx.insert(besuchHistorie).values({ besuchId: vorhanden.id, geaendertVon: request.benutzer!.id, stand: vorhanden as unknown as Record<string, unknown> });
        }
        [b] = (await tx.update(besuch).set(werte).where(eq(besuch.id, vorhanden.id)).returning()) as [Besuch];
        await tx.delete(leistung).where(eq(leistung.besuchId, vorhanden.id));
      } else {
        [b] = (await tx.insert(besuch).values(daten.id ? { ...werte, id: daten.id } : werte).returning()) as [Besuch];
      }
      if (ergebnis.zeilen.length) {
        await tx.insert(leistung).values(
          ergebnis.zeilen.map((z) => ({
            besuchId: b.id,
            hebammeId: b.hebammeId,
            regelwerkId: rw.id,
            gpos: z.gpos,
            bezeichnung: z.bezeichnung,
            datum: b.datum,
            menge: z.menge,
            einheit: z.einheit,
            einzelbetrag: z.einzelbetrag.toFixed(2),
            betrag: z.betrag.toFixed(2),
            zuschlag: z.zuschlag,
            formular: z.formular,
            quittierungspflichtig: z.quittierungspflichtig,
          })),
        );
      }
      return b;
    }).catch((e: Error) => {
      if (e.message === "GESPERRT") return null;
      throw e;
    });
    if (!gespeichert) return reply.code(409).send({ fehler: "Die Leistungen dieses Besuchs sind einem Versand zugeordnet. Änderungen erst nach Auflösen des Versands bzw. über eine Korrektur." });

    await protokollieren(db, request.benutzer!.id, vorhanden ? "geaendert" : "angelegt", "besuch", gespeichert.id, { status: gespeichert.status });
    // Termin aus der Tour mit dem dokumentierten Besuch verknüpfen
    const terminId = (request.query as { termin?: string }).termin;
    if (terminId && /^[0-9a-f-]{36}$/i.test(terminId)) {
      await db
        .update(termin)
        .set({ besuchId: gespeichert.id, status: "erledigt", geaendertAm: new Date() })
        .where(and(eq(termin.id, terminId), eq(termin.hebammeId, gespeichert.hebammeId), eq(termin.betreuungId, betreuungId)));
    }
    // Wegegeld des Tages (und ggf. des alten Datums) neu berechnen
    await wegegeldNeuBerechnen(db, gespeichert.hebammeId, gespeichert.datum);
    if (vorhanden && vorhanden.datum !== gespeichert.datum) await wegegeldNeuBerechnen(db, vorhanden.hebammeId, vorhanden.datum);
    return { besuch: gespeichert, ergebnis };
  }

  app.post<{ Params: { id: string }; Querystring: { termin?: string } }>("/api/betreuungen/:id/besuche", async (request, reply) => besuchSpeichern(request, reply, request.params.id));

  async function eigenerBesuch(id: string, request: FastifyRequest, reply: FastifyReply) {
    const [b] = await db.select().from(besuch).where(eq(besuch.id, id));
    if (!b) {
      reply.code(404).send({ fehler: "Besuch nicht gefunden" });
      return undefined;
    }
    if (b.hebammeId !== request.benutzer!.id) {
      reply.code(403).send({ fehler: "Nur die Hebamme, die den Besuch erbracht hat, kann ihn ändern." });
      return undefined;
    }
    return b;
  }

  app.get<{ Params: { id: string } }>("/api/besuche/:id", async (request, reply) => {
    const [b] = await db.select().from(besuch).where(eq(besuch.id, request.params.id));
    if (!b) return reply.code(404).send({ fehler: "Besuch nicht gefunden" });
    const zeilen = await db.select().from(leistung).where(eq(leistung.besuchId, b.id)).orderBy(asc(leistung.gpos));
    const versionen = await db.select({ id: besuchHistorie.id, zeit: besuchHistorie.zeit }).from(besuchHistorie).where(eq(besuchHistorie.besuchId, b.id)).orderBy(desc(besuchHistorie.zeit));
    return { ...b, leistungen: zeilen, versionen };
  });

  app.put<{ Params: { id: string } }>("/api/besuche/:id", async (request, reply) => {
    const b = await eigenerBesuch(request.params.id, request, reply);
    if (!b) return;
    if (istKursBesuch(b.typ)) return reply.code(409).send({ fehler: "Kurseinheiten werden über die Anwesenheit im Kurs bearbeitet." });
    return besuchSpeichern(request, reply, b.betreuungId, b);
  });

  app.delete<{ Params: { id: string } }>("/api/besuche/:id", async (request, reply) => {
    const b = await eigenerBesuch(request.params.id, request, reply);
    if (!b) return;
    if (istKursBesuch(b.typ)) return reply.code(409).send({ fehler: "Kurseinheiten werden über die Anwesenheit im Kurs bearbeitet." });
    if (b.status !== "entwurf") return reply.code(409).send({ fehler: "Abgeschlossene Besuche können nicht gelöscht werden (Dokumentationspflicht)." });
    await db.delete(besuch).where(eq(besuch.id, b.id));
    await db.update(termin).set({ status: "geplant" }).where(eq(termin.besuchId, b.id));
    await protokollieren(db, request.benutzer!.id, "geloescht", "besuch", b.id);
    return { ok: true };
  });

  // ------------------------------------------------------------ Cockpit
  app.get("/api/heute", async (request) => {
    const ich = request.benutzer!.id;
    const felder = {
      id: besuch.id,
      datum: besuch.datum,
      von: besuch.von,
      bis: besuch.bis,
      typ: besuch.typ,
      art: besuch.art,
      status: besuch.status,
      unterschrift: sql<string>`${besuch.unterschrift}->>'art'`,
      betreuungId: besuch.betreuungId,
      klientinId: klientin.id,
      name: sql<string>`${klientin.vorname} || ' ' || ${klientin.nachname}`,
      ort: klientin.ort,
    };
    const basis = db.select(felder).from(besuch).innerJoin(betreuung, eq(betreuung.id, besuch.betreuungId)).innerJoin(klientin, eq(klientin.id, betreuung.klientinId));
    // Kurseinheiten erscheinen beim Kurs, nicht in der Besuchsliste des Tages
    const keinKurs = notInArray(besuch.typ, ["geburtsvorbereitung", "rueckbildung"]);
    const heute = await basis.where(and(eq(besuch.hebammeId, ich), eq(besuch.datum, heuteIso()), keinKurs)).orderBy(asc(besuch.von));
    const entwuerfe = await db
      .select(felder)
      .from(besuch)
      .innerJoin(betreuung, eq(betreuung.id, besuch.betreuungId))
      .innerJoin(klientin, eq(klientin.id, betreuung.klientinId))
      .where(and(eq(besuch.hebammeId, ich), eq(besuch.status, "entwurf"), keinKurs))
      .orderBy(desc(besuch.datum));
    // Geplante Besuche der heutigen Tour (die Kachel zählt Termine, nicht nur schon dokumentierte Besuche)
    const geplant = await db
      .select({ status: termin.status })
      .from(termin)
      .where(and(eq(termin.hebammeId, ich), eq(termin.datum, heuteIso()), ne(termin.status, "abgesagt")));
    return { heute, entwuerfe, geplant: geplant.length, erledigt: geplant.filter((t) => t.status === "erledigt").length };
  });
}
