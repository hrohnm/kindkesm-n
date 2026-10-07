/**
 * M20: Team-Nachrichten (statt WhatsApp) und Aufgaben mit Fälligkeit – jeweils optional mit Bezug zu einer Akte.
 * Nachrichten an das ganze Team sehen alle Hebammen, Direktnachrichten nur Absenderin und Empfängerin.
 */
import { aufgabeSchema, nachrichtSchema } from "@kindkesmoeoen/shared";
import { and, asc, desc, eq, isNull, notExists, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Datenbank } from "../db/client";
import { aufgabe, benutzer, klientin, nachricht, nachrichtGelesen } from "../db/schema";
import { pruefen } from "../fehler";
import { protokollieren } from "../protokoll";

const UUID = /^[0-9a-f-]{36}$/i;

function nurHebammen(request: FastifyRequest, reply: FastifyReply) {
  if (request.benutzer?.rolle !== "hebamme") {
    reply.code(403).send({ fehler: "Nur für Hebammen" });
    return false;
  }
  return true;
}

/** Nachrichten, die eine Hebamme sehen darf */
export const sichtbareNachricht = (ich: string) => or(isNull(nachricht.anId), eq(nachricht.anId, ich), eq(nachricht.vonId, ich));

/** Anzahl ungelesener Nachrichten (fremde, sichtbare, nicht als gelesen markierte) */
export async function ungeleseneNachrichten(db: Datenbank, ich: string) {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int`, direkt: sql<number>`count(*) filter (where ${nachricht.anId} = ${ich})::int` })
    .from(nachricht)
    .where(
      and(
        sichtbareNachricht(ich),
        sql`${nachricht.vonId} <> ${ich}`,
        notExists(db.select({ x: sql`1` }).from(nachrichtGelesen).where(and(eq(nachrichtGelesen.nachrichtId, nachricht.id), eq(nachrichtGelesen.benutzerId, ich)))),
      ),
    );
  return { anzahl: r?.n ?? 0, direkt: r?.direkt ?? 0 };
}

export async function nachrichtenRouten(app: FastifyInstance, db: Datenbank) {
  const von = alias(benutzer, "von");
  const an = alias(benutzer, "an");

  async function bezugPruefen(daten: { anId?: string | null; zustaendigId?: string | null; klientinId: string | null }, reply: FastifyReply) {
    const person = daten.anId ?? daten.zustaendigId;
    if (person) {
      const [b] = await db.select({ id: benutzer.id }).from(benutzer).where(and(eq(benutzer.id, person), eq(benutzer.rolle, "hebamme"), eq(benutzer.aktiv, true)));
      if (!b) return reply.code(400).send({ fehler: "Unbekannte Kollegin" }), false;
    }
    if (daten.klientinId) {
      const [k] = await db.select({ id: klientin.id }).from(klientin).where(eq(klientin.id, daten.klientinId));
      if (!k) return reply.code(400).send({ fehler: "Akte nicht gefunden" }), false;
    }
    return true;
  }

  // ------------------------------------------------------------ Nachrichten
  app.get<{ Querystring: { klientinId?: string } }>("/api/nachrichten", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const ich = request.benutzer!.id;
    const filter = request.query.klientinId && UUID.test(request.query.klientinId) ? eq(nachricht.klientinId, request.query.klientinId) : undefined;
    const zeilen = await db
      .select({
        id: nachricht.id,
        text: nachricht.text,
        erstelltAm: nachricht.erstelltAm,
        vonId: nachricht.vonId,
        vonName: von.name,
        anId: nachricht.anId,
        anName: an.name,
        klientinId: nachricht.klientinId,
        klientinName: sql<string | null>`case when ${klientin.id} is null then null else ${klientin.vorname} || ' ' || ${klientin.nachname} end`,
        gelesen: sql<boolean>`${nachricht.vonId} = ${ich} or exists (select 1 from ${nachrichtGelesen} g where g.nachricht_id = ${nachricht.id} and g.benutzer_id = ${ich})`,
      })
      .from(nachricht)
      .innerJoin(von, eq(von.id, nachricht.vonId))
      .leftJoin(an, eq(an.id, nachricht.anId))
      .leftJoin(klientin, eq(klientin.id, nachricht.klientinId))
      .where(and(sichtbareNachricht(ich), filter))
      .orderBy(desc(nachricht.erstelltAm))
      .limit(200);
    return zeilen;
  });

  app.post("/api/nachrichten", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const daten = pruefen(nachrichtSchema, request.body, reply);
    if (!daten || !(await bezugPruefen(daten, reply))) return;
    const [neu] = await db.insert(nachricht).values({ ...daten, vonId: request.benutzer!.id }).returning();
    await protokollieren(db, request.benutzer!.id, "angelegt", "nachricht", neu!.id);
    return neu;
  });

  /** Sichtbare Nachrichten als gelesen markieren (alle oder die einer Akte) */
  app.post<{ Body: { klientinId?: string } }>("/api/nachrichten/gelesen", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const ich = request.benutzer!.id;
    const k = request.body?.klientinId && UUID.test(request.body.klientinId) ? request.body.klientinId : null;
    const ids = await db
      .select({ id: nachricht.id })
      .from(nachricht)
      .where(and(sichtbareNachricht(ich), sql`${nachricht.vonId} <> ${ich}`, k ? eq(nachricht.klientinId, k) : undefined));
    if (ids.length) await db.insert(nachrichtGelesen).values(ids.map((x) => ({ nachrichtId: x.id, benutzerId: ich }))).onConflictDoNothing();
    return { ok: true };
  });

  /** Eigene Nachricht löschen */
  app.delete<{ Params: { id: string } }>("/api/nachrichten/:id", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    if (!UUID.test(request.params.id)) return reply.code(404).send({ fehler: "Nachricht nicht gefunden" });
    const weg = await db.delete(nachricht).where(and(eq(nachricht.id, request.params.id), eq(nachricht.vonId, request.benutzer!.id))).returning({ id: nachricht.id });
    if (!weg.length) return reply.code(404).send({ fehler: "Nachricht nicht gefunden" });
    await protokollieren(db, request.benutzer!.id, "geloescht", "nachricht", request.params.id);
    return { ok: true };
  });

  // ------------------------------------------------------------ Aufgaben
  const zustaendig = alias(benutzer, "zustaendig");
  const ersteller = alias(benutzer, "ersteller");
  const aufgabeSpalten = {
    id: aufgabe.id,
    titel: aufgabe.titel,
    notiz: aufgabe.notiz,
    faelligAm: aufgabe.faelligAm,
    erledigtAm: aufgabe.erledigtAm,
    zustaendigId: aufgabe.zustaendigId,
    zustaendigName: zustaendig.name,
    erstelltVon: aufgabe.erstelltVon,
    erstelltVonName: ersteller.name,
    klientinId: aufgabe.klientinId,
    klientinName: sql<string | null>`case when ${klientin.id} is null then null else ${klientin.vorname} || ' ' || ${klientin.nachname} end`,
    erstelltAm: aufgabe.erstelltAm,
  };

  app.get<{ Querystring: { klientinId?: string; erledigt?: string } }>("/api/aufgaben", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const k = request.query.klientinId && UUID.test(request.query.klientinId) ? request.query.klientinId : null;
    const mitErledigten = request.query.erledigt === "ja";
    return db
      .select(aufgabeSpalten)
      .from(aufgabe)
      .innerJoin(ersteller, eq(ersteller.id, aufgabe.erstelltVon))
      .leftJoin(zustaendig, eq(zustaendig.id, aufgabe.zustaendigId))
      .leftJoin(klientin, eq(klientin.id, aufgabe.klientinId))
      .where(and(k ? eq(aufgabe.klientinId, k) : undefined, mitErledigten ? sql`(${aufgabe.erledigtAm} is null or ${aufgabe.erledigtAm} > now() - interval '30 days')` : isNull(aufgabe.erledigtAm)))
      .orderBy(sql`${aufgabe.erledigtAm} is not null`, sql`${aufgabe.faelligAm} asc nulls last`, asc(aufgabe.erstelltAm));
  });

  app.post("/api/aufgaben", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const daten = pruefen(aufgabeSchema, request.body, reply);
    if (!daten || !(await bezugPruefen(daten, reply))) return;
    const [neu] = await db.insert(aufgabe).values({ ...daten, erstelltVon: request.benutzer!.id }).returning();
    await protokollieren(db, request.benutzer!.id, "angelegt", "aufgabe", neu!.id);
    return neu;
  });

  app.put<{ Params: { id: string } }>("/api/aufgaben/:id", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    if (!UUID.test(request.params.id)) return reply.code(404).send({ fehler: "Aufgabe nicht gefunden" });
    const daten = pruefen(aufgabeSchema, request.body, reply);
    if (!daten || !(await bezugPruefen(daten, reply))) return;
    const [a] = await db.update(aufgabe).set({ ...daten, geaendertAm: new Date() }).where(eq(aufgabe.id, request.params.id)).returning();
    if (!a) return reply.code(404).send({ fehler: "Aufgabe nicht gefunden" });
    await protokollieren(db, request.benutzer!.id, "geaendert", "aufgabe", a.id);
    return a;
  });

  /** Erledigt bzw. wieder offen – jede Hebamme darf (Teamaufgaben) */
  app.post<{ Params: { id: string }; Body: { erledigt?: boolean } }>("/api/aufgaben/:id/erledigt", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    if (!UUID.test(request.params.id)) return reply.code(404).send({ fehler: "Aufgabe nicht gefunden" });
    const erledigt = request.body?.erledigt !== false;
    const [a] = await db
      .update(aufgabe)
      .set(erledigt ? { erledigtAm: new Date(), erledigtVon: request.benutzer!.id } : { erledigtAm: null, erledigtVon: null })
      .where(eq(aufgabe.id, request.params.id))
      .returning();
    if (!a) return reply.code(404).send({ fehler: "Aufgabe nicht gefunden" });
    await protokollieren(db, request.benutzer!.id, erledigt ? "erledigt" : "wieder_offen", "aufgabe", a.id);
    return a;
  });

  /** Löschen nur durch die Erstellerin */
  app.delete<{ Params: { id: string } }>("/api/aufgaben/:id", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    if (!UUID.test(request.params.id)) return reply.code(404).send({ fehler: "Aufgabe nicht gefunden" });
    const weg = await db.delete(aufgabe).where(and(eq(aufgabe.id, request.params.id), eq(aufgabe.erstelltVon, request.benutzer!.id))).returning({ id: aufgabe.id });
    if (!weg.length) return reply.code(404).send({ fehler: "Nur die Erstellerin kann die Aufgabe löschen." });
    await protokollieren(db, request.benutzer!.id, "geloescht", "aufgabe", request.params.id);
    return { ok: true };
  });

}
