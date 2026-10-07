/**
 * M25 Sicherheit: Zwei-Faktor-Anmeldung einrichten, App-Sperre, angemeldete Geräte, Export aller Daten.
 */
import { SPERRE_MINUTEN } from "@kindkesmoeoen/shared";
import { and, desc, eq, getTableName, gt, is, like, ne, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { passwortPruefen } from "../auth";
import { config } from "../config";
import type { Datenbank } from "../db/client";
import * as schema from "../db/schema";
import { benutzer, sitzung } from "../db/schema";
import { pruefen } from "../fehler";
import { protokollieren } from "../protokoll";
import { totpGeheimnis, totpPruefen, totpUri, wiederherstellungscodes } from "../totp";

const passwortSchema = z.object({ passwort: z.string().min(1) });
/** Kennung eines Geräts in der Liste: Anfang des Token-Hashes (der Token selbst ist daraus nicht ableitbar) */
const kennung = (id: string) => id.slice(0, 16);

export async function sicherheitRouten(app: FastifyInstance, db: Datenbank) {
  async function konto(id: string) {
    const [k] = await db.select().from(benutzer).where(eq(benutzer.id, id));
    return k!;
  }
  async function passwortOk(id: string, passwort: string) {
    return passwortPruefen((await konto(id)).passwortHash, passwort);
  }
  const falschesPasswort = { fehler: "Eingaben prüfen", felder: { passwort: "Das Passwort ist falsch." } };

  app.get("/api/ich/sicherheit", async (request) => {
    const k = await konto(request.benutzer!.id);
    return { zweiFaktor: k.totpAktiv, pflicht: config.zweiFaktorPflicht, wiederherstellungscodes: k.wiederherstellung.length, sperreMinuten: k.sperreMinuten };
  });

  // ------------------------------------------------------------ Zwei-Faktor-Anmeldung
  app.post("/api/ich/2fa/start", async (request, reply) => {
    const daten = pruefen(passwortSchema, request.body, reply);
    if (!daten) return;
    if (!(await passwortOk(request.benutzer!.id, daten.passwort))) return reply.code(400).send(falschesPasswort);
    const geheimnis = totpGeheimnis();
    await db.update(benutzer).set({ totpNeu: geheimnis }).where(eq(benutzer.id, request.benutzer!.id));
    return { geheimnis, uri: totpUri(geheimnis, request.benutzer!.email) };
  });

  app.post("/api/ich/2fa/bestaetigen", async (request, reply) => {
    const daten = pruefen(z.object({ code: z.string().trim().min(6).max(8) }), request.body, reply);
    if (!daten) return;
    const k = await konto(request.benutzer!.id);
    if (!k.totpNeu) return reply.code(400).send({ fehler: "Bitte die Einrichtung neu starten." });
    const schritt = totpPruefen(k.totpNeu, daten.code, null);
    if (schritt === null) return reply.code(400).send({ fehler: "Eingaben prüfen", felder: { code: "Der Code passt nicht – bitte den aktuellen Code aus der App eingeben (Uhrzeit des Handys prüfen)." } });
    const { codes, hashes } = wiederherstellungscodes();
    await db.update(benutzer).set({ totpGeheimnis: k.totpNeu, totpNeu: null, totpAktiv: true, totpLetzterSchritt: schritt, wiederherstellung: hashes, geaendertAm: new Date() }).where(eq(benutzer.id, k.id));
    await protokollieren(db, k.id, "zwei_faktor_eingerichtet", "benutzer", k.id);
    return { ok: true, wiederherstellungscodes: codes };
  });

  app.post("/api/ich/2fa/neue-codes", async (request, reply) => {
    const daten = pruefen(passwortSchema, request.body, reply);
    if (!daten) return;
    const k = await konto(request.benutzer!.id);
    if (!k.totpAktiv) return reply.code(400).send({ fehler: "Die Zwei-Faktor-Anmeldung ist nicht eingerichtet." });
    if (!(await passwortPruefen(k.passwortHash, daten.passwort))) return reply.code(400).send(falschesPasswort);
    const { codes, hashes } = wiederherstellungscodes();
    await db.update(benutzer).set({ wiederherstellung: hashes }).where(eq(benutzer.id, k.id));
    await protokollieren(db, k.id, "wiederherstellungscodes_erneuert", "benutzer", k.id);
    return { wiederherstellungscodes: codes };
  });

  app.post("/api/ich/2fa/aus", async (request, reply) => {
    const daten = pruefen(passwortSchema, request.body, reply);
    if (!daten) return;
    if (config.zweiFaktorPflicht) return reply.code(403).send({ fehler: "Die Zwei-Faktor-Anmeldung ist in dieser Praxis Pflicht." });
    if (!(await passwortOk(request.benutzer!.id, daten.passwort))) return reply.code(400).send(falschesPasswort);
    await db.update(benutzer).set({ totpAktiv: false, totpGeheimnis: null, totpNeu: null, totpLetzterSchritt: null, wiederherstellung: [] }).where(eq(benutzer.id, request.benutzer!.id));
    await protokollieren(db, request.benutzer!.id, "zwei_faktor_ausgeschaltet", "benutzer", request.benutzer!.id);
    return { ok: true };
  });

  // ------------------------------------------------------------ App-Sperre
  app.put("/api/ich/sperre", async (request, reply) => {
    const daten = pruefen(z.object({ minuten: z.number().int().refine((m) => (SPERRE_MINUTEN as readonly number[]).includes(m), "Bitte einen der Werte wählen.") }), request.body, reply);
    if (!daten) return;
    await db.update(benutzer).set({ sperreMinuten: daten.minuten }).where(eq(benutzer.id, request.benutzer!.id));
    return { ok: true };
  });

  // ------------------------------------------------------------ Angemeldete Geräte
  app.get("/api/ich/sitzungen", async (request) => {
    const liste = await db
      .select({ id: sitzung.id, userAgent: sitzung.userAgent, erstelltAm: sitzung.erstelltAm, letzteAktivitaet: sitzung.letzteAktivitaet, laeuftAbAm: sitzung.laeuftAbAm })
      .from(sitzung)
      .where(and(eq(sitzung.benutzerId, request.benutzer!.id), gt(sitzung.laeuftAbAm, sql`now()`)))
      .orderBy(desc(sitzung.erstelltAm));
    return liste.map(({ id, ...s }) => ({ ...s, kennung: kennung(id), aktuell: id === request.sitzungId }));
  });

  app.delete<{ Params: { kennung: string } }>("/api/ich/sitzungen/:kennung", async (request, reply) => {
    if (!/^[0-9a-f]{16}$/.test(request.params.kennung)) return reply.code(404).send({ fehler: "Nicht gefunden" });
    const weg = await db
      .delete(sitzung)
      .where(and(eq(sitzung.benutzerId, request.benutzer!.id), like(sitzung.id, `${request.params.kennung}%`)))
      .returning({ id: sitzung.id });
    if (!weg.length) return reply.code(404).send({ fehler: "Gerät nicht gefunden" });
    await protokollieren(db, request.benutzer!.id, "geraet_abgemeldet", "benutzer", request.benutzer!.id);
    return { ok: true, diesesGeraet: weg.some((w) => w.id === request.sitzungId) };
  });

  app.post("/api/ich/sitzungen/andere-beenden", async (request) => {
    const weg = await db
      .delete(sitzung)
      .where(and(eq(sitzung.benutzerId, request.benutzer!.id), ne(sitzung.id, request.sitzungId ?? "")))
      .returning({ id: sitzung.id });
    await protokollieren(db, request.benutzer!.id, "andere_geraete_abgemeldet", "benutzer", request.benutzer!.id, { anzahl: weg.length });
    return { ok: true, anzahl: weg.length };
  });

  // ------------------------------------------------------------ Export aller Daten
  /** Alle Tabellen als JSON (keine Abhängigkeit vom Anbieter). Ohne Sitzungen, Passwort-Hashes und Zwei-Faktor-Geheimnisse. */
  app.get("/api/export", async (request, reply) => {
    if (request.benutzer?.rolle !== "hebamme") return reply.code(403).send({ fehler: "Den Datenexport dürfen nur Hebammen erstellen." });
    const tabellen: Record<string, unknown[]> = {};
    for (const wert of Object.values(schema)) {
      if (!is(wert, PgTable) || wert === sitzung) continue;
      const zeilen = (await db.select().from(wert)) as Record<string, unknown>[];
      tabellen[getTableName(wert)] =
        wert === benutzer
          ? zeilen.map(({ passwortHash: _p, totpGeheimnis: _g, totpNeu: _n, wiederherstellung: _w, kalenderToken: _k, ...rest }) => rest)
          : // Fotos: nur Angaben, die verschlüsselten Bilddaten sichert das Datenbank-Backup
            wert === schema.foto
            ? zeilen.map(({ daten: _d, ...rest }) => rest)
            : zeilen;
    }
    await protokollieren(db, request.benutzer.id, "datenexport", "praxis", undefined, { tabellen: Object.keys(tabellen).length });
    const datum = new Date().toISOString().slice(0, 10);
    return reply
      .header("content-type", "application/json; charset=utf-8")
      .header("content-disposition", `attachment; filename="kindkesmoeoen-export-${datum}.json"`)
      .send(JSON.stringify({ erstellt: new Date().toISOString(), erstelltVon: request.benutzer.name, hinweis: "Vollständiger Export der Praxis-App Kindkesmöön. Enthält Gesundheitsdaten – sicher aufbewahren.", tabellen }, null, 1));
  });
}
