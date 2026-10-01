import {
  HEBSET_ANSCHRIFT,
  abrechnungseinstellungSchema,
  hebammeProfilSchema,
  ortSchema,
  positionSchema,
  tourvorlageSchema,
} from "@kindkesmoeoen/shared";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { nurHebamme } from "../auth";
import type { Datenbank } from "../db/client";
import { abrechnungseinstellung, benutzer, ort, tour, tourvorlage } from "../db/schema";
import { ortVerorten } from "../geo/positionen";
import { wegegeldOffeneTage } from "../wegegeld";
import { pruefen } from "../fehler";
import { protokollieren } from "../protokoll";

/** Profil, Orte, Tourvorlagen und Abrechnungseinstellungen der angemeldeten Hebamme. */
export async function ichRouten(app: FastifyInstance, db: Datenbank) {
  app.addHook("preHandler", async (request, reply) => {
    if (request.url.startsWith("/api/ich") && request.benutzer?.rolle !== "hebamme") {
      return reply.code(403).send({ fehler: "Nur für Hebammen" });
    }
  });

  // ------------------------------------------------------------ Profil
  app.get("/api/ich/profil", async (request) => {
    const [p] = await db
      .select({
        name: benutzer.name,
        kuerzel: benutzer.kuerzel,
        email: benutzer.email,
        telefon: benutzer.telefon,
        ik: benutzer.ik,
        status: benutzer.status,
        babypauseBis: benutzer.babypauseBis,
      })
      .from(benutzer)
      .where(eq(benutzer.id, request.benutzer!.id));
    return p;
  });

  app.put("/api/ich/profil", async (request, reply) => {
    const daten = pruefen(hebammeProfilSchema, request.body, reply);
    if (!daten) return;
    if (daten.status !== "babypause") daten.babypauseBis = null;
    const [alt] = await db.select({ ik: benutzer.ik }).from(benutzer).where(eq(benutzer.id, request.benutzer!.id));
    await db.update(benutzer).set({ ...daten, geaendertAm: new Date() }).where(eq(benutzer.id, request.benutzer!.id));
    await protokollieren(db, request.benutzer!.id, "geaendert", "profil", request.benutzer!.id, daten);
    return {
      ok: true,
      // Anlage 2 § 1: Änderungen der IK-Daten unverzüglich an SVI und Verband melden
      hinweis: alt && alt.ik !== daten.ik ? "IK geändert: Bitte Änderungen der IK-Daten unverzüglich der SVI und dem Berufsverband melden (Anlage 2 § 1)." : undefined,
    };
  });

  // ------------------------------------------------------------ Orte
  const meineOrte = (benutzerId: string) =>
    db
      .select()
      .from(ort)
      .where(or(eq(ort.benutzerId, benutzerId), and(isNull(ort.benutzerId), eq(ort.typ, "praxis"))))
      .orderBy(asc(ort.erstelltAm));

  app.get("/api/ich/orte", async (request) => meineOrte(request.benutzer!.id));

  app.post("/api/ich/orte", async (request, reply) => {
    const daten = pruefen(ortSchema, request.body, reply);
    if (!daten) return;
    if (daten.typ === "praxis") return reply.code(400).send({ fehler: "Der Praxisstandort wird in den Praxis-Einstellungen gepflegt." });
    const [neu] = await db.insert(ort).values({ ...daten, benutzerId: request.benutzer!.id }).returning();
    await ortVerorten(db, neu!.id);
    await protokollieren(db, request.benutzer!.id, "angelegt", "ort", neu!.id);
    const [o] = await db.select().from(ort).where(eq(ort.id, neu!.id));
    return o;
  });

  async function eigenerOrt(id: string, benutzerId: string, reply: FastifyReply) {
    const [o] = await db.select().from(ort).where(and(eq(ort.id, id), eq(ort.benutzerId, benutzerId)));
    if (!o) reply.code(404).send({ fehler: "Ort nicht gefunden" });
    return o;
  }

  app.put<{ Params: { id: string } }>("/api/ich/orte/:id", async (request, reply) => {
    const alt = await eigenerOrt(request.params.id, request.benutzer!.id, reply);
    if (!alt) return;
    const daten = pruefen(ortSchema, request.body, reply);
    if (!daten) return;
    if (daten.typ === "praxis") return reply.code(400).send({ fehler: "Typ „Praxis“ ist dem Praxisstandort vorbehalten." });
    const neueAnschrift = alt.anschrift !== daten.anschrift;
    await db
      .update(ort)
      .set({ ...daten, ...(neueAnschrift ? { lat: null, lon: null } : {}), geaendertAm: new Date() })
      .where(eq(ort.id, request.params.id));
    if (neueAnschrift) {
      await ortVerorten(db, request.params.id);
      await wegegeldOffeneTage(db, request.benutzer!.id);
    }
    await protokollieren(db, request.benutzer!.id, "geaendert", "ort", request.params.id);
    const [o] = await db.select().from(ort).where(eq(ort.id, request.params.id));
    return o;
  });

  /** Position von Hand setzen (Karte), falls die Anschrift nicht im Adressverzeichnis steht. */
  app.put<{ Params: { id: string } }>("/api/ich/orte/:id/position", async (request, reply) => {
    const p = pruefen(positionSchema, request.body, reply);
    if (!p) return;
    const [o] = await db.select().from(ort).where(eq(ort.id, request.params.id));
    if (!o || (o.benutzerId !== null && o.benutzerId !== request.benutzer!.id)) return reply.code(404).send({ fehler: "Ort nicht gefunden" });
    const [neu] = await db.update(ort).set({ lat: p.lat.toFixed(6), lon: p.lon.toFixed(6), geaendertAm: new Date() }).where(eq(ort.id, o.id)).returning();
    await protokollieren(db, request.benutzer!.id, "position", "ort", o.id);
    await wegegeldOffeneTage(db, request.benutzer!.id);
    return neu;
  });

  app.delete<{ Params: { id: string } }>("/api/ich/orte/:id", async (request, reply) => {
    if (!(await eigenerOrt(request.params.id, request.benutzer!.id, reply))) return;
    const verwendet = await db
      .select({ name: tourvorlage.name })
      .from(tourvorlage)
      .where(
        or(
          eq(tourvorlage.startOrtId, request.params.id),
          eq(tourvorlage.endeOrtId, request.params.id),
          eq(tourvorlage.wegegeldAusgangsOrtId, request.params.id),
        ),
      );
    if (verwendet.length) {
      return reply.code(409).send({ fehler: `Der Ort wird in der Tourvorlage „${verwendet.map((v) => v.name).join("“, „")}“ verwendet.` });
    }
    const inTouren = await db
      .select({ datum: tour.datum })
      .from(tour)
      .where(or(eq(tour.startOrtId, request.params.id), eq(tour.endeOrtId, request.params.id), eq(tour.wegegeldAusgangsOrtId, request.params.id)))
      .limit(1);
    if (inTouren.length) return reply.code(409).send({ fehler: "Der Ort wird in geplanten oder gefahrenen Touren verwendet und bleibt deshalb erhalten." });
    await db.delete(ort).where(eq(ort.id, request.params.id));
    await protokollieren(db, request.benutzer!.id, "geloescht", "ort", request.params.id);
    return { ok: true };
  });

  // ------------------------------------------------------------ Tourvorlagen
  async function orteErlaubt(ids: string[], benutzerId: string) {
    const erlaubt = new Set((await meineOrte(benutzerId)).map((o) => o.id));
    return ids.every((id) => erlaubt.has(id));
  }

  app.get("/api/ich/tourvorlagen", async (request) =>
    db.select().from(tourvorlage).where(eq(tourvorlage.benutzerId, request.benutzer!.id)).orderBy(asc(tourvorlage.erstelltAm)),
  );

  app.post("/api/ich/tourvorlagen", async (request, reply) => {
    const daten = pruefen(tourvorlageSchema, request.body, reply);
    if (!daten) return;
    if (!(await orteErlaubt([daten.startOrtId, daten.endeOrtId, daten.wegegeldAusgangsOrtId], request.benutzer!.id))) {
      return reply.code(400).send({ fehler: "Unbekannter Ort" });
    }
    const [neu] = await db.insert(tourvorlage).values({ ...daten, benutzerId: request.benutzer!.id }).returning();
    await protokollieren(db, request.benutzer!.id, "angelegt", "tourvorlage", neu!.id);
    return neu;
  });

  app.put<{ Params: { id: string } }>("/api/ich/tourvorlagen/:id", async (request, reply) => {
    const daten = pruefen(tourvorlageSchema, request.body, reply);
    if (!daten) return;
    if (!(await orteErlaubt([daten.startOrtId, daten.endeOrtId, daten.wegegeldAusgangsOrtId], request.benutzer!.id))) {
      return reply.code(400).send({ fehler: "Unbekannter Ort" });
    }
    const [t] = await db
      .update(tourvorlage)
      .set({ ...daten, geaendertAm: new Date() })
      .where(and(eq(tourvorlage.id, request.params.id), eq(tourvorlage.benutzerId, request.benutzer!.id)))
      .returning();
    if (!t) return reply.code(404).send({ fehler: "Tourvorlage nicht gefunden" });
    await protokollieren(db, request.benutzer!.id, "geaendert", "tourvorlage", t.id);
    return t;
  });

  app.delete<{ Params: { id: string } }>("/api/ich/tourvorlagen/:id", async (request, reply) => {
    const geloescht = await db
      .delete(tourvorlage)
      .where(and(eq(tourvorlage.id, request.params.id), eq(tourvorlage.benutzerId, request.benutzer!.id)))
      .returning({ id: tourvorlage.id });
    if (!geloescht.length) return reply.code(404).send({ fehler: "Tourvorlage nicht gefunden" });
    await protokollieren(db, request.benutzer!.id, "geloescht", "tourvorlage", request.params.id);
    return { ok: true };
  });

  // ------------------------------------------------------------ Abrechnungseinstellungen
  app.get("/api/ich/abrechnung", async (request) => {
    const [e] = await db.select().from(abrechnungseinstellung).where(eq(abrechnungseinstellung.benutzerId, request.benutzer!.id));
    return e ?? null;
  });

  app.put("/api/ich/abrechnung", { preHandler: nurHebamme }, async (request, reply) => {
    const daten = pruefen(abrechnungseinstellungSchema, request.body, reply);
    if (!daten) return;
    if (daten.weg === "hebset") {
      daten.abrechnungsstelleName = HEBSET_ANSCHRIFT.name;
      daten.abrechnungsstelleAnschrift = HEBSET_ANSCHRIFT.anschrift;
    }
    if (daten.weg === "selbst") {
      daten.abrechnungsstelleName = null;
      daten.abrechnungsstelleAnschrift = null;
    }
    const werte = { ...daten, benutzerId: request.benutzer!.id, geaendertAm: new Date() };
    const [e] = await db
      .insert(abrechnungseinstellung)
      .values(werte)
      .onConflictDoUpdate({ target: abrechnungseinstellung.benutzerId, set: werte })
      .returning();
    await protokollieren(db, request.benutzer!.id, "geaendert", "abrechnungseinstellung", request.benutzer!.id, daten);
    return e;
  });
}
