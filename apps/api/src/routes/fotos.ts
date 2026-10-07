/**
 * M17: Fotos in der Akte (Nabel, Naht, Haut …). Nur mit gültiger Einwilligung „Fotos zur Dokumentation“;
 * verschlüsselt in der Datenbank (nicht in der Galerie des Geräts). Nach einem Widerruf sind die Bilder
 * gesperrt und können gelöscht werden.
 */
import { dataUrlLesen, FOTO_MAX_BYTES, fotoSchema } from "@kindkesmoeoen/shared";
import { and, asc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Datenbank } from "../db/client";
import { benutzer, besuch, betreuung, einwilligung, foto, kind, klientin } from "../db/schema";
import { pruefen } from "../fehler";
import { fotoEntschluesseln, fotoSchluessel, fotoVerschluesseln } from "../foto-krypto";
import { protokollieren } from "../protokoll";

const UUID = /^[0-9a-f-]{36}$/i;

function nurHebammen(request: FastifyRequest, reply: FastifyReply) {
  if (request.benutzer?.rolle !== "hebamme") {
    reply.code(403).send({ fehler: "Nur für Hebammen" });
    return false;
  }
  return true;
}

/** Passt der Inhalt zum angegebenen Bildtyp? (verhindert z. B. HTML/Skripte als „Bild“) */
function bildTypStimmt(typ: string, b: Buffer) {
  if (typ === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (typ === "image/png") return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (typ === "image/webp") return b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP";
  return false;
}

export async function fotoRouten(app: FastifyInstance, db: Datenbank) {
  async function einwilligungLiegtVor(klientinId: string) {
    const [e] = await db.select({ erteilt: einwilligung.erteilt }).from(einwilligung).where(and(eq(einwilligung.klientinId, klientinId), eq(einwilligung.art, "foto")));
    return Boolean(e?.erteilt);
  }

  app.get<{ Params: { id: string } }>("/api/klientinnen/:id/fotos", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    if (!UUID.test(request.params.id)) return reply.code(404).send({ fehler: "Akte nicht gefunden" });
    const fotos = await db
      .select({ id: foto.id, bereich: foto.bereich, notiz: foto.notiz, kindId: foto.kindId, kindName: kind.vorname, besuchId: foto.besuchId, groesse: foto.groesse, aufgenommenAm: foto.aufgenommenAm, erstelltVonName: benutzer.name })
      .from(foto)
      .innerJoin(benutzer, eq(benutzer.id, foto.erstelltVon))
      .leftJoin(kind, eq(kind.id, foto.kindId))
      .where(eq(foto.klientinId, request.params.id))
      .orderBy(asc(foto.aufgenommenAm));
    return { einwilligung: await einwilligungLiegtVor(request.params.id), schluessel: Boolean(fotoSchluessel()), fotos };
  });

  app.post<{ Params: { id: string } }>("/api/klientinnen/:id/fotos", { bodyLimit: 7_000_000 }, async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    if (!UUID.test(request.params.id)) return reply.code(404).send({ fehler: "Akte nicht gefunden" });
    if (!fotoSchluessel()) return reply.code(503).send({ fehler: "Fotos sind nicht eingerichtet (FOTO_SCHLUESSEL fehlt auf dem Server)." });
    const daten = pruefen(fotoSchema, request.body, reply);
    if (!daten) return;
    const [k] = await db.select({ id: klientin.id }).from(klientin).where(eq(klientin.id, request.params.id));
    if (!k) return reply.code(404).send({ fehler: "Akte nicht gefunden" });
    if (!(await einwilligungLiegtVor(k.id))) return reply.code(409).send({ fehler: "Keine Einwilligung für Fotos – bitte zuerst in der Akte erfassen." });
    // Kind und Besuch müssen zur Akte gehören
    if (daten.kindId) {
      const [x] = await db.select({ id: kind.id }).from(kind).innerJoin(betreuung, eq(betreuung.id, kind.betreuungId)).where(and(eq(kind.id, daten.kindId), eq(betreuung.klientinId, k.id)));
      if (!x) return reply.code(400).send({ fehler: "Kind gehört nicht zu dieser Akte" });
    }
    if (daten.besuchId) {
      const [x] = await db.select({ id: besuch.id }).from(besuch).innerJoin(betreuung, eq(betreuung.id, besuch.betreuungId)).where(and(eq(besuch.id, daten.besuchId), eq(betreuung.klientinId, k.id)));
      if (!x) return reply.code(400).send({ fehler: "Besuch gehört nicht zu dieser Akte" });
    }
    const bild = dataUrlLesen(daten.bild)!;
    const bytes = Buffer.from(bild.base64, "base64");
    if (bytes.length > FOTO_MAX_BYTES) return reply.code(413).send({ fehler: "Das Foto ist zu groß (höchstens 4 MB)." });
    if (!bildTypStimmt(bild.typ, bytes)) return reply.code(400).send({ fehler: "Die Datei ist kein gültiges Foto." });
    const [neu] = await db
      .insert(foto)
      .values({ klientinId: k.id, kindId: daten.kindId, besuchId: daten.besuchId, bereich: daten.bereich, notiz: daten.notiz, mime: bild.typ, groesse: bytes.length, daten: fotoVerschluesseln(bytes), erstelltVon: request.benutzer!.id })
      .returning({ id: foto.id, bereich: foto.bereich, aufgenommenAm: foto.aufgenommenAm });
    await protokollieren(db, request.benutzer!.id, "angelegt", "foto", neu!.id);
    return neu;
  });

  /** Bild entschlüsselt ausliefern – nur mit gültiger Einwilligung, nie zwischenspeichern */
  app.get<{ Params: { id: string } }>("/api/fotos/:id/bild", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    if (!UUID.test(request.params.id)) return reply.code(404).send({ fehler: "Foto nicht gefunden" });
    const [f] = await db.select({ klientinId: foto.klientinId, mime: foto.mime, daten: foto.daten }).from(foto).where(eq(foto.id, request.params.id));
    if (!f) return reply.code(404).send({ fehler: "Foto nicht gefunden" });
    if (!(await einwilligungLiegtVor(f.klientinId))) return reply.code(403).send({ fehler: "Einwilligung widerrufen – Foto gesperrt." });
    if (!fotoSchluessel()) return reply.code(503).send({ fehler: "FOTO_SCHLUESSEL fehlt" });
    return reply.header("Content-Type", f.mime).header("Cache-Control", "no-store").header("Content-Disposition", "inline").send(fotoEntschluesseln(f.daten));
  });

  app.delete<{ Params: { id: string } }>("/api/fotos/:id", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    if (!UUID.test(request.params.id)) return reply.code(404).send({ fehler: "Foto nicht gefunden" });
    const weg = await db.delete(foto).where(eq(foto.id, request.params.id)).returning({ id: foto.id });
    if (!weg.length) return reply.code(404).send({ fehler: "Foto nicht gefunden" });
    await protokollieren(db, request.benutzer!.id, "geloescht", "foto", request.params.id);
    return { ok: true };
  });

  /** Alle Fotos einer Akte löschen (z. B. nach Widerruf der Einwilligung) */
  app.delete<{ Params: { id: string } }>("/api/klientinnen/:id/fotos", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    if (!UUID.test(request.params.id)) return reply.code(404).send({ fehler: "Akte nicht gefunden" });
    const weg = await db.delete(foto).where(eq(foto.klientinId, request.params.id)).returning({ id: foto.id });
    await protokollieren(db, request.benutzer!.id, "geloescht", "foto", undefined, { klientinId: request.params.id, anzahl: weg.length });
    return { ok: true, anzahl: weg.length };
  });
}
