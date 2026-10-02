/**
 * Regelwerk-Administration mit Vier-Augen-Freigabe (Meilenstein 5):
 * Änderungen vorschlagen, freigeben, ablehnen, zurückziehen; Testrechner.
 */
import {
  AenderungFehler,
  aenderungSchema,
  besuchAbrechnen,
  gleich,
  operationBeschreiben,
  operationenAnwenden,
  operationSchema,
  vorherWerte,
  type Leistungsart,
  type Leistungstyp,
  type Operation,
  type RegelwerkDaten,
} from "@kindkesmoeoen/shared";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Datenbank } from "../db/client";
import { aenderung, benutzer, gebuehrenposition, leistung, regelwerk, selbstzahlerLeistung } from "../db/schema";
import { pruefen } from "../fehler";
import { protokollieren } from "../protokoll";
import { positionZeile, type RegelwerkPosition } from "../seed/import";

type Daten = RegelwerkDaten & Record<string, unknown>;
type Tx = Parameters<Parameters<Datenbank["transaction"]>[0]>[0];

class Konflikt extends Error {}

async function selbstzahlerKarte(db: Datenbank | Tx) {
  const liste = await db.select().from(selbstzahlerLeistung);
  return Object.fromEntries(liste.map((s) => [s.id, { ...s, preis: Number(s.preis) } as Record<string, unknown>]));
}

/** Positionstabelle aus dem JSON neu aufbauen (für Suche und Anzeige). */
async function positionenSynchronisieren(tx: Tx, regelwerkId: string, daten: Daten) {
  await tx.delete(gebuehrenposition).where(eq(gebuehrenposition.regelwerkId, regelwerkId));
  await tx.insert(gebuehrenposition).values((daten.positionen as unknown as RegelwerkPosition[]).map((p) => positionZeile(regelwerkId, p)));
}

export async function aenderungRouten(app: FastifyInstance, db: Datenbank) {
  const nurHebamme = (request: FastifyRequest, reply: FastifyReply) => {
    if (request.benutzer?.rolle !== "hebamme") {
      reply.code(403).send({ fehler: "Änderungen am Regelwerk können nur Hebammen vorschlagen und freigeben." });
      return false;
    }
    return true;
  };

  const ersteller = alias(benutzer, "ersteller");
  const entscheider = alias(benutzer, "entscheider");

  app.get<{ Querystring: { status?: string; regelwerkId?: string } }>("/api/aenderungen", async (request) => {
    const bed = [];
    if (request.query.status) bed.push(eq(aenderung.status, request.query.status as "offen"));
    if (request.query.regelwerkId) bed.push(eq(aenderung.regelwerkId, request.query.regelwerkId));
    const zeilen = await db
      .select({ a: aenderung, von: ersteller.name, vonKuerzel: ersteller.kuerzel, entschiedenVonName: entscheider.name })
      .from(aenderung)
      .innerJoin(ersteller, eq(ersteller.id, aenderung.erstelltVon))
      .leftJoin(entscheider, eq(entscheider.id, aenderung.entschiedenVon))
      .where(bed.length ? and(...bed) : undefined)
      .orderBy(desc(aenderung.erstelltAm))
      .limit(200);
    const ich = request.benutzer!.id;
    return zeilen.map(({ a, von, vonKuerzel, entschiedenVonName }) => ({
      ...a,
      von,
      vonKuerzel,
      entschiedenVonName,
      zeilen: (a.operationen as Operation[]).flatMap((op, i) => operationBeschreiben(op, (a.vorher[i] ?? {}) as Record<string, unknown>)),
      darfFreigeben: a.status === "offen" && a.erstelltVon !== ich && request.benutzer!.rolle === "hebamme" && request.benutzer!.status === "aktiv",
      darfZurueckziehen: a.status === "offen" && a.erstelltVon === ich,
    }));
  });

  app.post("/api/aenderungen", async (request, reply) => {
    if (!nurHebamme(request, reply)) return;
    const daten = pruefen(aenderungSchema, request.body, reply);
    if (!daten) return;
    let rw: typeof regelwerk.$inferSelect | undefined;
    if (daten.regelwerkId) {
      [rw] = await db.select().from(regelwerk).where(eq(regelwerk.id, daten.regelwerkId));
      if (!rw) return reply.code(404).send({ fehler: "Regelwerk nicht gefunden" });
      if (rw.status === "archiviert") return reply.code(409).send({ fehler: "Archivierte Fassungen können nicht mehr geändert werden." });
      // Nach dieser Fassung wurden schon Belege versendet → Inhalte nur noch über eine neue Fassung ändern
      const inhalt = daten.operationen.some((o) => !["status", "neue_fassung", "selbstzahler", "selbstzahler_neu"].includes(o.art));
      if (inhalt) {
        const [versendet] = await db.select({ id: leistung.id }).from(leistung).where(and(eq(leistung.regelwerkId, rw.id), isNotNull(leistung.versandId))).limit(1);
        if (versendet) return reply.code(409).send({ fehler: "Nach dieser Fassung wurden bereits Abrechnungen versendet. Änderungen bitte über „Neue Fassung“ mit späterem Gültigkeitsbeginn vornehmen." });
      }
    }
    try {
      const sz = await selbstzahlerKarte(db);
      const vorher = daten.operationen.map((op) => vorherWerte((rw?.daten ?? null) as Daten | null, op, sz));
      if (rw) operationenAnwenden(rw.daten as Daten, daten.operationen); // prüft, ob sich alles anwenden lässt
      if (daten.operationen.some((o) => o.art === "status" && o.status === "aktiv") && rw?.status === "aktiv") {
        return reply.code(409).send({ fehler: "Diese Fassung ist bereits freigegeben." });
      }
      const [neu] = await db
        .insert(aenderung)
        .values({ regelwerkId: daten.regelwerkId, titel: daten.titel, begruendung: daten.begruendung, operationen: daten.operationen, vorher, erstelltVon: request.benutzer!.id })
        .returning();
      await protokollieren(db, request.benutzer!.id, "vorgeschlagen", "aenderung", neu!.id, { titel: daten.titel });
      return neu;
    } catch (e) {
      if (e instanceof AenderungFehler) return reply.code(400).send({ fehler: e.message });
      throw e;
    }
  });

  async function offeneAenderung(id: string, reply: FastifyReply) {
    const [a] = await db.select().from(aenderung).where(eq(aenderung.id, id));
    if (!a) {
      reply.code(404).send({ fehler: "Änderung nicht gefunden" });
      return undefined;
    }
    if (a.status !== "offen") {
      reply.code(409).send({ fehler: "Über diese Änderung wurde bereits entschieden." });
      return undefined;
    }
    return a;
  }

  app.post<{ Params: { id: string } }>("/api/aenderungen/:id/freigeben", async (request, reply) => {
    if (!nurHebamme(request, reply)) return;
    const a = await offeneAenderung(request.params.id, reply);
    if (!a) return;
    if (a.erstelltVon === request.benutzer!.id) return reply.code(403).send({ fehler: "Vier-Augen-Prinzip: Eine andere Hebamme muss die Änderung freigeben." });
    if (request.benutzer!.status !== "aktiv") return reply.code(403).send({ fehler: "Freigeben können nur aktive Hebammen (nicht während der Babypause)." });
    const ops = a.operationen as Operation[];
    try {
      await db.transaction(async (tx) => {
        const [rw] = a.regelwerkId ? await tx.select().from(regelwerk).where(eq(regelwerk.id, a.regelwerkId)).for("update") : [undefined];
        const sz = await selbstzahlerKarte(tx);
        // Konfliktprüfung: Werte seit dem Vorschlag unverändert?
        ops.forEach((op, i) => {
          if (!gleich(vorherWerte((rw?.daten ?? null) as Daten | null, op, sz), a.vorher[i])) {
            throw new Konflikt("Die betroffenen Werte wurden inzwischen geändert. Bitte die Änderung ablehnen und neu vorschlagen.");
          }
        });
        if (rw) {
          const daten = operationenAnwenden(rw.daten as Daten, ops);
          if (ops.some((o) => !["status", "neue_fassung", "selbstzahler", "selbstzahler_neu"].includes(o.art))) {
            await tx.update(regelwerk).set({ daten }).where(eq(regelwerk.id, rw.id));
            await positionenSynchronisieren(tx, rw.id, daten);
          }
          for (const op of ops) {
            if (op.art === "status") await tx.update(regelwerk).set({ status: op.status }).where(eq(regelwerk.id, rw.id));
            if (op.art === "neue_fassung") {
              const [gibt] = await tx.select({ id: regelwerk.id }).from(regelwerk).where(eq(regelwerk.id, op.neueId));
              if (gibt) throw new Konflikt(`Eine Fassung mit der Kennung ${op.neueId} gibt es schon.`);
              const kopie = { ...daten, id: op.neueId, name: op.name, gueltig_von: op.gueltigVon, gueltig_bis: null, status: "entwurf" } as Daten;
              await tx.insert(regelwerk).values({ id: op.neueId, name: op.name, gueltigVon: op.gueltigVon, gueltigBis: null, status: "entwurf", daten: kopie });
              await positionenSynchronisieren(tx, op.neueId, kopie);
            }
          }
        }
        for (const op of ops) {
          if (op.art === "selbstzahler") {
            const { preis, ...rest } = op.felder;
            await tx
              .update(selbstzahlerLeistung)
              .set({ ...rest, ...(preis !== undefined ? { preis: preis.toFixed(2) } : {}), geaendertAm: new Date() })
              .where(eq(selbstzahlerLeistung.id, op.id));
          }
          if (op.art === "selbstzahler_neu") {
            await tx.insert(selbstzahlerLeistung).values({ id: op.id, bezeichnung: op.bezeichnung, rechnungstext: op.rechnungstext, einheit: op.einheit, preis: op.preis.toFixed(2), umsatzsteuer: op.umsatzsteuer });
          }
        }
        await tx.update(aenderung).set({ status: "freigegeben", entschiedenVon: request.benutzer!.id, entschiedenAm: new Date() }).where(eq(aenderung.id, a.id));
      });
    } catch (e) {
      if (e instanceof Konflikt || e instanceof AenderungFehler) return reply.code(409).send({ fehler: e.message });
      throw e;
    }
    await protokollieren(db, request.benutzer!.id, "freigegeben", "aenderung", a.id, { titel: a.titel });
    const [neu] = await db.select().from(aenderung).where(eq(aenderung.id, a.id));
    return neu;
  });

  app.post<{ Params: { id: string } }>("/api/aenderungen/:id/ablehnen", async (request, reply) => {
    if (!nurHebamme(request, reply)) return;
    const daten = pruefen(z.object({ kommentar: z.string().trim().min(3, "Bitte kurz begründen, warum abgelehnt wird.").max(1000) }), request.body, reply);
    if (!daten) return;
    const a = await offeneAenderung(request.params.id, reply);
    if (!a) return;
    if (a.erstelltVon === request.benutzer!.id) return reply.code(403).send({ fehler: "Eigene Vorschläge bitte zurückziehen statt ablehnen." });
    const [neu] = await db
      .update(aenderung)
      .set({ status: "abgelehnt", entschiedenVon: request.benutzer!.id, entschiedenAm: new Date(), kommentar: daten.kommentar })
      .where(eq(aenderung.id, a.id))
      .returning();
    await protokollieren(db, request.benutzer!.id, "abgelehnt", "aenderung", a.id, { kommentar: daten.kommentar });
    return neu;
  });

  app.post<{ Params: { id: string } }>("/api/aenderungen/:id/zurueckziehen", async (request, reply) => {
    const a = await offeneAenderung(request.params.id, reply);
    if (!a) return;
    if (a.erstelltVon !== request.benutzer!.id) return reply.code(403).send({ fehler: "Nur wer die Änderung vorgeschlagen hat, kann sie zurückziehen." });
    const [neu] = await db.update(aenderung).set({ status: "zurueckgezogen", entschiedenAm: new Date() }).where(eq(aenderung.id, a.id)).returning();
    await protokollieren(db, request.benutzer!.id, "zurueckgezogen", "aenderung", a.id);
    return neu;
  });

  // ------------------------------------------------------------ Testrechner
  const testSchema = z.object({
    datum: z.iso.date(),
    von: z.string().regex(/^\d{2}:\d{2}$/),
    bis: z.string().regex(/^\d{2}:\d{2}$/),
    typ: z.enum(["schwangerschaft", "vorsorge", "aufklaerung", "stillvorbereitung", "wochenbett"]),
    art: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    material: z.array(z.string().regex(/^\d{5}$/)).max(10).default([]),
    /** Wochenbett: Lebenstag des Kindes am Besuchstag; Schwangerschaft: SSW (volle Wochen) */
    lebenstag: z.number().int().min(0).max(400).nullable().default(null),
    ssw: z.number().int().min(4).max(43).nullable().default(null),
    anzahlKinder: z.number().int().min(1).max(4).default(1),
    /** Vorschau mit einer offenen Änderung oder mit eigenen, noch nicht vorgeschlagenen Operationen */
    aenderungId: z.string().uuid().nullable().default(null),
    operationen: z.array(operationSchema).max(50).default([]),
  });

  app.post<{ Params: { id: string } }>("/api/regelwerke/:id/testrechnung", async (request, reply) => {
    const t = pruefen(testSchema, request.body, reply);
    if (!t) return;
    const [rw] = await db.select().from(regelwerk).where(eq(regelwerk.id, request.params.id));
    if (!rw) return reply.code(404).send({ fehler: "Regelwerk nicht gefunden" });
    const tag = (offset: number) => new Date(Date.parse(`${t.datum}T12:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
    const kontext = {
      geburtsdatum: t.lebenstag != null ? tag(-t.lebenstag) : null,
      et: t.ssw != null ? tag((40 - t.ssw) * 7 - 3) : null,
      anzahlKinder: t.anzahlKinder,
      fruehereBesuche: [],
    };
    const besuch = { datum: t.datum, von: t.von, bis: t.bis, typ: t.typ as Leistungstyp, art: t.art as Leistungsart, material: t.material };
    let ops = t.operationen;
    if (t.aenderungId) {
      const [a] = await db.select().from(aenderung).where(eq(aenderung.id, t.aenderungId));
      if (!a) return reply.code(404).send({ fehler: "Änderung nicht gefunden" });
      ops = a.operationen as Operation[];
    }
    try {
      const vorher = besuchAbrechnen(besuch, kontext, rw.daten as Daten);
      const nachher = ops.length ? besuchAbrechnen(besuch, kontext, operationenAnwenden(rw.daten as Daten, ops)) : null;
      return { vorher, nachher };
    } catch (e) {
      if (e instanceof AenderungFehler) return reply.code(400).send({ fehler: e.message });
      throw e;
    }
  });

  /** Anzahl offener Änderungen, die die angemeldete Hebamme freigeben könnte, und ob überhaupt eine zweite aktive Hebamme da ist */
  app.get("/api/aenderungen/offen/anzahl", async (request) => {
    const [aktive] = await db.select({ n: sql<number>`count(*)::int` }).from(benutzer).where(and(eq(benutzer.rolle, "hebamme"), eq(benutzer.status, "aktiv"), eq(benutzer.aktiv, true)));
    const [r] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(aenderung)
      .where(and(eq(aenderung.status, "offen"), sql`${aenderung.erstelltVon} <> ${request.benutzer!.id}`));
    return { anzahl: request.benutzer!.status === "aktiv" ? (r?.n ?? 0) : 0, aktiveHebammen: aktive?.n ?? 0 };
  });
}
