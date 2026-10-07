/**
 * M3: Textbausteine für die Besuchsnotiz. Eigene Bausteine sieht nur die Hebamme selbst, Praxis-Bausteine alle;
 * Praxis-Bausteine darf jede Hebamme anlegen und ändern (protokolliert).
 */
import { and, asc, eq, isNull, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Datenbank } from "../db/client";
import { textbaustein } from "../db/schema";
import { pruefen } from "../fehler";
import { protokollieren } from "../protokoll";

const bausteinSchema = z.object({
  titel: z.string().trim().min(1, "Bitte einen kurzen Titel angeben.").max(60),
  text: z.string().trim().min(1, "Bitte den Text eingeben.").max(2000),
  praxis: z.boolean().default(false),
});

function nurHebammen(request: FastifyRequest, reply: FastifyReply) {
  if (request.benutzer?.rolle !== "hebamme") {
    reply.code(403).send({ fehler: "Nur für Hebammen" });
    return false;
  }
  return true;
}

export async function textbausteinRouten(app: FastifyInstance, db: Datenbank) {
  const sichtbar = (benutzerId: string) => or(eq(textbaustein.benutzerId, benutzerId), isNull(textbaustein.benutzerId));

  app.get("/api/textbausteine", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const liste = await db.select().from(textbaustein).where(sichtbar(request.benutzer!.id)).orderBy(asc(textbaustein.titel));
    return liste.map((b) => ({ id: b.id, titel: b.titel, text: b.text, praxis: b.benutzerId === null }));
  });

  app.post("/api/textbausteine", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const daten = pruefen(bausteinSchema, request.body, reply);
    if (!daten) return;
    const [neu] = await db.insert(textbaustein).values({ titel: daten.titel, text: daten.text, benutzerId: daten.praxis ? null : request.benutzer!.id, erstelltVon: request.benutzer!.id }).returning();
    await protokollieren(db, request.benutzer!.id, "angelegt", "textbaustein", neu!.id);
    return { id: neu!.id, titel: neu!.titel, text: neu!.text, praxis: neu!.benutzerId === null };
  });

  app.put<{ Params: { id: string } }>("/api/textbausteine/:id", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const daten = pruefen(bausteinSchema, request.body, reply);
    if (!daten) return;
    const [b] = await db
      .update(textbaustein)
      .set({ titel: daten.titel, text: daten.text, benutzerId: daten.praxis ? null : request.benutzer!.id, geaendertAm: new Date() })
      .where(and(eq(textbaustein.id, request.params.id), sichtbar(request.benutzer!.id)))
      .returning();
    if (!b) return reply.code(404).send({ fehler: "Textbaustein nicht gefunden" });
    await protokollieren(db, request.benutzer!.id, "geaendert", "textbaustein", b.id);
    return { id: b.id, titel: b.titel, text: b.text, praxis: b.benutzerId === null };
  });

  app.delete<{ Params: { id: string } }>("/api/textbausteine/:id", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const weg = await db.delete(textbaustein).where(and(eq(textbaustein.id, request.params.id), sichtbar(request.benutzer!.id))).returning({ id: textbaustein.id });
    if (!weg.length) return reply.code(404).send({ fehler: "Textbaustein nicht gefunden" });
    await protokollieren(db, request.benutzer!.id, "geloescht", "textbaustein", request.params.id);
    return { ok: true };
  });
}
