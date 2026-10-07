/**
 * M19: Rufbereitschaftsplan des Teams (z. B. Wochenende, Feiertage). Jede Hebamme darf Einträge für das Team
 * anlegen und löschen; alles wird protokolliert.
 */
import { and, asc, eq, gte } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Datenbank } from "../db/client";
import { benutzer, rufbereitschaft } from "../db/schema";
import { pruefen } from "../fehler";
import { protokollieren } from "../protokoll";

const eintragSchema = z
  .object({
    hebammeId: z.string().uuid(),
    von: z.iso.date(),
    bis: z.iso.date(),
    notiz: z.preprocess((v) => (typeof v === "string" && !v.trim() ? null : v), z.string().trim().max(200).nullable().default(null)),
  })
  .refine((e) => e.bis >= e.von, { message: "Das Ende liegt vor dem Beginn.", path: ["bis"] });

function nurHebammen(request: FastifyRequest, reply: FastifyReply) {
  if (request.benutzer?.rolle !== "hebamme") {
    reply.code(403).send({ fehler: "Nur für Hebammen" });
    return false;
  }
  return true;
}

export async function rufbereitschaftRouten(app: FastifyInstance, db: Datenbank) {
  app.get<{ Querystring: { ab?: string } }>("/api/rufbereitschaft", async (request) => {
    const ab = /^\d{4}-\d{2}-\d{2}$/.test(request.query.ab ?? "") ? request.query.ab! : new Date().toISOString().slice(0, 10);
    return db
      .select({ id: rufbereitschaft.id, hebammeId: rufbereitschaft.hebammeId, name: benutzer.name, kuerzel: benutzer.kuerzel, telefon: benutzer.telefon, von: rufbereitschaft.von, bis: rufbereitschaft.bis, notiz: rufbereitschaft.notiz })
      .from(rufbereitschaft)
      .innerJoin(benutzer, eq(benutzer.id, rufbereitschaft.hebammeId))
      .where(gte(rufbereitschaft.bis, ab))
      .orderBy(asc(rufbereitschaft.von));
  });

  app.post("/api/rufbereitschaft", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const daten = pruefen(eintragSchema, request.body, reply);
    if (!daten) return;
    const [h] = await db.select({ status: benutzer.status, rolle: benutzer.rolle }).from(benutzer).where(eq(benutzer.id, daten.hebammeId));
    if (!h || h.rolle !== "hebamme") return reply.code(400).send({ fehler: "Eingaben prüfen", felder: { hebammeId: "Bitte eine Hebamme auswählen." } });
    if (h.status !== "aktiv") return reply.code(400).send({ fehler: "Eingaben prüfen", felder: { hebammeId: "Nur aktive Hebammen können Rufbereitschaft haben." } });
    const [neu] = await db.insert(rufbereitschaft).values({ ...daten, erstelltVon: request.benutzer!.id }).returning();
    await protokollieren(db, request.benutzer!.id, "angelegt", "rufbereitschaft", neu!.id);
    return neu;
  });

  app.delete<{ Params: { id: string } }>("/api/rufbereitschaft/:id", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const weg = await db.delete(rufbereitschaft).where(and(eq(rufbereitschaft.id, request.params.id))).returning({ id: rufbereitschaft.id });
    if (!weg.length) return reply.code(404).send({ fehler: "Eintrag nicht gefunden" });
    await protokollieren(db, request.benutzer!.id, "geloescht", "rufbereitschaft", request.params.id);
    return { ok: true };
  });
}
