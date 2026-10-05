import { RUECKRUF_AUFBEWAHRUNG_TAGE, oeffentlicherRueckrufSchema, rueckrufAktionSchema } from "@kindkesmoeoen/shared";
import { and, desc, eq, lt, ne } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config";
import type { Datenbank } from "../db/client";
import { benutzer, rueckruf } from "../db/schema";
import { pruefen } from "../fehler";
import { protokollieren } from "../protokoll";

function nurHebammen(request: FastifyRequest, reply: FastifyReply) {
  if (request.benutzer?.rolle !== "hebamme") {
    reply.code(403).send({ fehler: "Rückrufwünsche sind nur für Hebammen sichtbar." });
    return false;
  }
  return true;
}

/** Rückrufwunsch von der Website (öffentlich) und Bearbeitung in der App. */
export async function rueckrufRouten(app: FastifyInstance, db: Datenbank) {
  /** Datensparsamkeit: erledigte Rückrufwünsche nach der Aufbewahrungsfrist löschen */
  async function aufraeumen() {
    const grenze = new Date(Date.now() - RUECKRUF_AUFBEWAHRUNG_TAGE * 86_400_000);
    await db.delete(rueckruf).where(and(eq(rueckruf.status, "erledigt"), lt(rueckruf.geaendertAm, grenze)));
  }

  // ------------------------------------------------------------ Öffentlich (Website, CORS siehe oeffentlich.ts)
  app.post(
    "/api/oeffentlich/rueckruf",
    { config: { rateLimit: { max: config.produktion ? 5 : 1000, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const daten = pruefen(oeffentlicherRueckrufSchema, request.body, reply);
      if (!daten) return;
      // Wunsch-Hebamme nur übernehmen, wenn es eine aktive Hebamme dieses Namens gibt
      const [h] = daten.hebamme
        ? await db
            .select({ id: benutzer.id })
            .from(benutzer)
            .where(and(eq(benutzer.name, daten.hebamme), eq(benutzer.rolle, "hebamme"), eq(benutzer.aktiv, true), ne(benutzer.status, "ausgeschieden")))
        : [];
      await db.insert(rueckruf).values({
        name: daten.name,
        telefon: daten.telefon,
        anliegen: daten.anliegen,
        zeitfenster: daten.zeitfenster,
        hebammeId: h?.id ?? null,
        nachricht: daten.nachricht,
        einwilligungAm: new Date(),
      });
      return { ok: true };
    },
  );

  // ------------------------------------------------------------ App
  app.get("/api/rueckrufe", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    await aufraeumen();
    const liste = await db.select().from(rueckruf).orderBy(desc(rueckruf.erstelltAm));
    const namen = await db.select({ id: benutzer.id, name: benutzer.name, kuerzel: benutzer.kuerzel }).from(benutzer);
    const name = (id: string | null) => namen.find((n) => n.id === id) ?? null;
    return liste.map((r) => ({ ...r, hebamme: name(r.hebammeId), erledigtVonName: name(r.erledigtVon)?.name ?? null }));
  });

  app.post<{ Params: { id: string } }>("/api/rueckrufe/:id/aktion", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    const daten = pruefen(rueckrufAktionSchema, request.body, reply);
    if (!daten) return;
    const [r] = await db.select().from(rueckruf).where(eq(rueckruf.id, request.params.id));
    if (!r) return reply.code(404).send({ fehler: "Rückrufwunsch nicht gefunden" });
    const jetzt = new Date();
    const notiz = "notiz" in daten && daten.notiz ? (daten.aktion === "notiz" ? daten.notiz : [r.notiz, daten.notiz].filter(Boolean).join("\n")) : daten.aktion === "notiz" ? null : r.notiz;

    const werte =
      daten.aktion === "erreicht"
        ? { status: "erledigt" as const, erledigtVon: request.benutzer!.id, erledigtAm: jetzt, notiz }
        : daten.aktion === "nicht_erreicht"
          ? { versuche: r.versuche + 1, letzterVersuchAm: jetzt, notiz }
          : daten.aktion === "wieder_oeffnen"
            ? { status: "offen" as const, erledigtVon: null, erledigtAm: null }
            : { notiz };
    await db.update(rueckruf).set({ ...werte, geaendertAm: jetzt }).where(eq(rueckruf.id, r.id));
    await protokollieren(db, request.benutzer!.id, daten.aktion, "rueckruf", r.id);
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>("/api/rueckrufe/:id", async (request, reply) => {
    if (!nurHebammen(request, reply)) return;
    await db.delete(rueckruf).where(eq(rueckruf.id, request.params.id));
    await protokollieren(db, request.benutzer!.id, "geloescht", "rueckruf", request.params.id);
    return { ok: true };
  });
}
