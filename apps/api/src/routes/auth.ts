import { passwortAendernSchema } from "@kindkesmoeoen/shared";
import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config";
import { SITZUNG_COOKIE, cookieSetzen, passwortHashen, passwortPruefen, sitzungAnlegen, sitzungBeenden } from "../auth";
import { istWiederherstellungscode, totpPruefen, wiederherstellungEinloesen } from "../totp";
import type { Datenbank } from "../db/client";
import { benutzer, sitzung } from "../db/schema";
import { pruefen } from "../fehler";
import { protokollieren } from "../protokoll";

const anmeldenSchema = z.object({ email: z.string().trim().min(3), passwort: z.string().min(1), code: z.string().trim().max(20).optional() });

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
      // Zweiter Faktor: Code aus der Authenticator-App oder ein Wiederherstellungscode
      if (konto.totpAktiv && konto.totpGeheimnis) {
        if (!daten.code) return { zweiterFaktor: true };
        if (istWiederherstellungscode(daten.code)) {
          const rest = wiederherstellungEinloesen(konto.wiederherstellung, daten.code);
          if (!rest) {
            await protokollieren(db, konto.id, "zweiter_faktor_fehlgeschlagen", "benutzer", konto.id);
            return reply.code(401).send({ fehler: "Der Code ist falsch oder schon verwendet." });
          }
          await db.update(benutzer).set({ wiederherstellung: rest }).where(eq(benutzer.id, konto.id));
          await protokollieren(db, konto.id, "wiederherstellungscode_verwendet", "benutzer", konto.id, { verbleibend: rest.length });
        } else {
          const schritt = totpPruefen(konto.totpGeheimnis, daten.code, konto.totpLetzterSchritt);
          if (schritt === null) {
            await protokollieren(db, konto.id, "zweiter_faktor_fehlgeschlagen", "benutzer", konto.id);
            return reply.code(401).send({ fehler: "Der Code ist falsch oder abgelaufen." });
          }
          await db.update(benutzer).set({ totpLetzterSchritt: schritt }).where(eq(benutzer.id, konto.id));
        }
      }
      const { token, laeuftAbAm } = await sitzungAnlegen(db, konto.id, request.headers["user-agent"]);
      cookieSetzen(reply, token, laeuftAbAm);
      await protokollieren(db, konto.id, "anmeldung", "benutzer", konto.id);
      return ichAntwort(konto);
    },
  );

  app.post("/api/auth/abmelden", async (request, reply) => {
    const token = request.cookies[SITZUNG_COOKIE];
    if (token) await sitzungBeenden(db, token);
    reply.clearCookie(SITZUNG_COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/ich", async (request) => {
    const [konto] = await db.select().from(benutzer).where(eq(benutzer.id, request.benutzer!.id));
    return ichAntwort(konto!);
  });

  /** App-Sperre aufheben: Passwort erneut prüfen (ohne neue Sitzung) */
  app.post(
    "/api/auth/entsperren",
    { config: { rateLimit: { max: config.anmeldungMax, timeWindow: "15 minutes" } } },
    async (request, reply) => {
      const daten = pruefen(z.object({ passwort: z.string().min(1) }), request.body, reply);
      if (!daten) return;
      const [konto] = await db.select().from(benutzer).where(eq(benutzer.id, request.benutzer!.id));
      if (!konto || !(await passwortPruefen(konto.passwortHash, daten.passwort))) {
        await protokollieren(db, request.benutzer!.id, "entsperren_fehlgeschlagen", "benutzer", request.benutzer!.id);
        // 400 statt 401: die App würde 401 als „Sitzung beendet“ verstehen und abmelden
        return reply.code(400).send({ fehler: "Das Passwort ist falsch." });
      }
      return { ok: true };
    },
  );

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

/** Angemeldete Person für die App (ohne Geheimnisse) */
function ichAntwort(k: typeof benutzer.$inferSelect) {
  return {
    id: k.id,
    name: k.name,
    kuerzel: k.kuerzel,
    rolle: k.rolle,
    status: k.status,
    email: k.email,
    zweiFaktor: k.totpAktiv,
    zweiFaktorPflicht: config.zweiFaktorPflicht,
    sperreMinuten: k.sperreMinuten,
  };
}
