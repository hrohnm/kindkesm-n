import { passwortAendernSchema } from "@kindkesmoeoen/shared";
import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config";
import { SITZUNG_COOKIE, cookieSetzen, passwortHashen, passwortPruefen, sitzungAnlegen, sitzungBeenden } from "../auth";
import type { Datenbank } from "../db/client";
import { benutzer, sitzung } from "../db/schema";
import { pruefen } from "../fehler";
import { protokollieren } from "../protokoll";

const anmeldenSchema = z.object({ email: z.string().trim().min(3), passwort: z.string().min(1) });

export async function authRouten(app: FastifyInstance, db: Datenbank) {
  app.post(
    "/api/auth/anmelden",
    { config: { rateLimit: { max: config.anmeldungMax, timeWindow: "15 minutes" } } },
    async (request, reply) => {
      const daten = pruefen(anmeldenSchema, request.body, reply);
      if (!daten) return;
      const [konto] = await db
        .select()
        .from(benutzer)
        .where(sql`lower(${benutzer.email}) = lower(${daten.email})`);
      const ok = konto?.aktiv && (await passwortPruefen(konto.passwortHash, daten.passwort));
      if (!konto || !ok) {
        await protokollieren(db, konto?.id, "anmeldung_fehlgeschlagen", "benutzer", konto?.id);
        return reply.code(401).send({ fehler: "E-Mail oder Passwort ist falsch." });
      }
      const { token, laeuftAbAm } = await sitzungAnlegen(db, konto.id, request.headers["user-agent"]);
      cookieSetzen(reply, token, laeuftAbAm);
      await protokollieren(db, konto.id, "anmeldung", "benutzer", konto.id);
      return { id: konto.id, name: konto.name, kuerzel: konto.kuerzel, rolle: konto.rolle, status: konto.status, email: konto.email };
    },
  );

  app.post("/api/auth/abmelden", async (request, reply) => {
    const token = request.cookies[SITZUNG_COOKIE];
    if (token) await sitzungBeenden(db, token);
    reply.clearCookie(SITZUNG_COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/ich", async (request) => request.benutzer);

  app.post("/api/auth/passwort", async (request, reply) => {
    const daten = pruefen(passwortAendernSchema, request.body, reply);
    if (!daten) return;
    const ich = request.benutzer!;
    const [konto] = await db.select().from(benutzer).where(eq(benutzer.id, ich.id));
    if (!konto || !(await passwortPruefen(konto.passwortHash, daten.altesPasswort))) {
      return reply.code(400).send({ fehler: "Eingaben prüfen", felder: { altesPasswort: "Das bisherige Passwort stimmt nicht." } });
    }
    await db.update(benutzer).set({ passwortHash: await passwortHashen(daten.neuesPasswort), geaendertAm: new Date() }).where(eq(benutzer.id, ich.id));
    // Alle anderen Sitzungen beenden
    await db.delete(sitzung).where(eq(sitzung.benutzerId, ich.id));
    const { token, laeuftAbAm } = await sitzungAnlegen(db, ich.id, request.headers["user-agent"]);
    cookieSetzen(reply, token, laeuftAbAm);
    await protokollieren(db, ich.id, "passwort_geaendert", "benutzer", ich.id);
    return { ok: true };
  });
}
