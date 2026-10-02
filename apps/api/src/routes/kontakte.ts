/** Akte (M2): Merkmale (Flaggen, Sprache, Allergien), Kontakte und Einwilligungen einer Klientin. */
import { EINWILLIGUNG_ARTEN, einwilligungSchema, kontaktSchema, merkmaleSchema, type EinwilligungArt } from "@kindkesmoeoen/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Datenbank } from "../db/client";
import { einwilligung, klientin, kontakt } from "../db/schema";
import { pruefen } from "../fehler";
import { protokollieren } from "../protokoll";

export async function kontaktRouten(app: FastifyInstance, db: Datenbank) {
  const vorhanden = async (id: string) => (await db.select({ id: klientin.id }).from(klientin).where(eq(klientin.id, id))).length > 0;

  app.put<{ Params: { id: string } }>("/api/klientinnen/:id/merkmale", async (request, reply) => {
    const daten = pruefen(merkmaleSchema, request.body, reply);
    if (!daten) return;
    const [k] = await db.update(klientin).set({ ...daten, geaendertAm: new Date() }).where(eq(klientin.id, request.params.id)).returning();
    if (!k) return reply.code(404).send({ fehler: "Klientin nicht gefunden" });
    await protokollieren(db, request.benutzer!.id, "geaendert", "klientin", k.id, { merkmale: daten.flaggen });
    return { flaggen: k.flaggen, sprache: k.sprache, allergien: k.allergien };
  });

  // ------------------------------------------------------------ Kontakte
  app.post<{ Params: { id: string } }>("/api/klientinnen/:id/kontakte", async (request, reply) => {
    const daten = pruefen(kontaktSchema, request.body, reply);
    if (!daten) return;
    if (!(await vorhanden(request.params.id))) return reply.code(404).send({ fehler: "Klientin nicht gefunden" });
    const [k] = await db.insert(kontakt).values({ ...daten, klientinId: request.params.id }).returning();
    await protokollieren(db, request.benutzer!.id, "angelegt", "kontakt", k!.id);
    return k;
  });

  app.put<{ Params: { id: string } }>("/api/kontakte/:id", async (request, reply) => {
    const daten = pruefen(kontaktSchema, request.body, reply);
    if (!daten) return;
    const [k] = await db.update(kontakt).set({ ...daten, geaendertAm: new Date() }).where(eq(kontakt.id, request.params.id)).returning();
    if (!k) return reply.code(404).send({ fehler: "Kontakt nicht gefunden" });
    await protokollieren(db, request.benutzer!.id, "geaendert", "kontakt", k.id);
    return k;
  });

  app.delete<{ Params: { id: string } }>("/api/kontakte/:id", async (request, reply) => {
    const [k] = await db.delete(kontakt).where(eq(kontakt.id, request.params.id)).returning();
    if (!k) return reply.code(404).send({ fehler: "Kontakt nicht gefunden" });
    await protokollieren(db, request.benutzer!.id, "geloescht", "kontakt", k.id);
    return { ok: true };
  });

  // ------------------------------------------------------------ Einwilligungen
  app.put<{ Params: { id: string; art: string } }>("/api/klientinnen/:id/einwilligungen/:art", async (request, reply) => {
    const art = request.params.art as EinwilligungArt;
    if (!(art in EINWILLIGUNG_ARTEN)) return reply.code(404).send({ fehler: "Unbekannte Einwilligung" });
    const daten = pruefen(einwilligungSchema, request.body, reply);
    if (!daten) return;
    if (!(await vorhanden(request.params.id))) return reply.code(404).send({ fehler: "Klientin nicht gefunden" });
    const [alt] = await db.select().from(einwilligung).where(and(eq(einwilligung.klientinId, request.params.id), eq(einwilligung.art, art)));
    // Widerruf: die frühere Erteilung (Form, Datum, Unterschrift) bleibt erhalten, das Widerrufsdatum kommt dazu
    const werte = daten.erteilt
      ? { erteilt: true, form: daten.form, datum: daten.datum, widerrufenAm: null, unterschrift: daten.unterschrift, notiz: daten.notiz }
      : alt
        ? { erteilt: false, form: alt.form, datum: alt.datum, widerrufenAm: daten.datum, unterschrift: alt.unterschrift, notiz: daten.notiz ?? alt.notiz }
        : { erteilt: false, form: daten.form, datum: daten.datum, widerrufenAm: daten.datum, unterschrift: null, notiz: daten.notiz };
    const [e] = await db
      .insert(einwilligung)
      .values({ ...werte, klientinId: request.params.id, art, erfasstVon: request.benutzer!.id })
      .onConflictDoUpdate({ target: [einwilligung.klientinId, einwilligung.art], set: { ...werte, erfasstVon: request.benutzer!.id, geaendertAm: new Date() } })
      .returning();
    await protokollieren(db, request.benutzer!.id, daten.erteilt ? "einwilligung-erteilt" : "einwilligung-widerrufen", "klientin", request.params.id, { art, form: werte.form, datum: daten.datum });
    return e;
  });
}
