import { HEBSET_ANSCHRIFT, tageZwischen } from "@kindkesmoeoen/shared";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { einstellungLaden, faelleLaden, kopfFormularErzeugen, mappeErzeugen } from "../abrechnung";
import type { Datenbank } from "../db/client";
import { benutzer, besuch, leistung, versand } from "../db/schema";
import { pruefen } from "../fehler";
import { protokollieren } from "../protokoll";

const heuteIso = () => new Date().toISOString().slice(0, 10);
const fallKurz = (f: Awaited<ReturnType<typeof faelleLaden>>[number]) => ({
  betreuungId: f.betreuungId,
  klientinId: f.klientin.id,
  name: `${f.klientin.vorname} ${f.klientin.nachname}`,
  krankenkasse: f.klientin.krankenkasse,
  zeitraum: f.zeitraum,
  anzahlBesuche: f.besuche.length,
  anzahlLeistungen: f.besuche.reduce((s, b) => s + b.leistungen.length, 0),
  summe: f.summe,
  belege: {
    tablet: f.besuche.filter((b) => (b.unterschrift as { art: string }).art === "tablet").length,
    papier: f.besuche.filter((b) => (b.unterschrift as { art: string }).art === "papier").length,
  },
  pruefung: f.pruefung,
});

const vorbereitenSchema = z.object({
  bis: z.iso.date(),
  betreuungIds: z.array(z.string().uuid()).optional(),
  trotzdem: z.boolean().default(false),
});
const versendetSchema = z.object({ versendetAm: z.iso.date().optional(), einschreibenNr: z.preprocess((v) => (v === "" ? null : v), z.string().max(60).nullable().optional()) });
const bezahltSchema = z.object({
  bezahltAm: z.iso.date(),
  ausgezahlt: z.number().min(0).optional(),
  kuerzungen: z.array(z.object({ leistungId: z.string().uuid(), betrag: z.number().min(0), grund: z.string().trim().min(2).max(300) })).default([]),
});

export async function abrechnungRouten(app: FastifyInstance, db: Datenbank) {
  app.addHook("preHandler", async (request, reply) => {
    if (request.url.startsWith("/api/abrechnung") && request.benutzer?.rolle !== "hebamme") return reply.code(403).send({ fehler: "Nur für Hebammen" });
  });

  async function eigenerVersand(id: string, request: FastifyRequest, reply: FastifyReply) {
    const [v] = await db.select().from(versand).where(eq(versand.id, id));
    if (!v || v.hebammeId !== request.benutzer!.id) {
      reply.code(404).send({ fehler: "Versand nicht gefunden" });
      return undefined;
    }
    return v;
  }

  async function versandImMonat(hebammeId: string, datum: string) {
    return db
      .select({ id: versand.id, nummer: versand.nummer })
      .from(versand)
      .where(and(eq(versand.hebammeId, hebammeId), sql`to_char(${versand.erstelltAm}, 'YYYY-MM') = ${datum.slice(0, 7)}`));
  }

  /** Offene (noch nicht versendete) Leistungen der angemeldeten Hebamme, gruppiert nach Fall, mit Vorabprüfung. */
  app.get<{ Querystring: { bis?: string } }>("/api/abrechnung/offen", async (request) => {
    const ich = request.benutzer!.id;
    const bis = request.query.bis ?? heuteIso();
    const [hb] = await db.select({ ik: benutzer.ik }).from(benutzer).where(eq(benutzer.id, ich));
    const faelle = await faelleLaden(db, ich, { bis });
    const entwuerfe = await db
      .select({ id: besuch.id })
      .from(besuch)
      .where(and(eq(besuch.hebammeId, ich), eq(besuch.status, "entwurf"), sql`${besuch.datum} <= ${bis}`));
    const einstellung = await einstellungLaden(db, ich);
    const imMonat = await versandImMonat(ich, heuteIso());
    const global: Array<{ stufe: "fehler" | "warnung" | "info"; text: string }> = [];
    if (!hb?.ik) global.push({ stufe: "fehler", text: "Dein IK fehlt (Einstellungen → Mein Profil). Ohne IK keine Abrechnung." });
    if (entwuerfe.length) global.push({ stufe: "warnung", text: `${entwuerfe.length} Besuch(e) noch im Entwurf; sie sind nicht enthalten.` });
    if (imMonat.length) {
      global.push(
        einstellung?.weg === "selbst"
          ? { stufe: "fehler", text: `In diesem Monat wurde bereits abgerechnet (${imMonat.map((v) => v.nummer).join(", ")}). Laut Anlage 2 § 2 höchstens eine Abrechnung je Monat.` }
          : { stufe: "info", text: `In diesem Monat gibt es schon einen Versand (${imMonat.map((v) => v.nummer).join(", ")}).` },
      );
    }
    return { bis, einstellung, faelle: faelle.map(fallKurz), hinweise: global, summe: Math.round(faelle.reduce((s, f) => s + f.summe, 0) * 100) / 100 };
  });

  /** Versand vorbereiten: übernimmt alle fehlerfreien Fälle und reserviert deren Leistungen. */
  app.post("/api/abrechnung/versaende", async (request, reply) => {
    const daten = pruefen(vorbereitenSchema, request.body, reply);
    if (!daten) return;
    const ich = request.benutzer!;
    const [hb] = await db.select().from(benutzer).where(eq(benutzer.id, ich.id));
    if (!hb?.ik) return reply.code(400).send({ fehler: "Dein IK fehlt (Einstellungen → Mein Profil)." });
    const einstellung = await einstellungLaden(db, ich.id);
    const imMonat = await versandImMonat(ich.id, heuteIso());
    if (imMonat.length && einstellung?.weg === "selbst" && !daten.trotzdem) {
      return reply.code(409).send({ fehler: "In diesem Monat wurde bereits abgerechnet (Anlage 2 § 2: höchstens einmal je Monat)." });
    }
    let faelle = await faelleLaden(db, ich.id, { bis: daten.bis });
    if (daten.betreuungIds) faelle = faelle.filter((f) => daten.betreuungIds!.includes(f.betreuungId));
    const ausgelassen = faelle.filter((f) => f.pruefung.some((p) => p.stufe === "fehler"));
    faelle = faelle.filter((f) => !ausgelassen.includes(f));
    if (!faelle.length) return reply.code(400).send({ fehler: "Keine abrechenbaren Fälle (fehlende Angaben zuerst ergänzen).", ausgelassen: ausgelassen.map(fallKurz) });

    const leistungIds = faelle.flatMap((f) => f.besuche.flatMap((b) => b.leistungen.map((l) => l.id)));
    const summe = faelle.reduce((s, f) => s + f.summe, 0);
    const monat = heuteIso().slice(0, 7);
    const weg = einstellung?.weg ?? "hebset";
    const neu = await db.transaction(async (tx) => {
      const [anzahl] = await tx.select({ n: sql<number>`count(*)::int` }).from(versand).where(and(eq(versand.hebammeId, ich.id), sql`to_char(${versand.erstelltAm}, 'YYYY-MM') = ${monat}`));
      const [v] = await tx
        .insert(versand)
        .values({
          nummer: `${monat}-${ich.kuerzel}-${(anzahl?.n ?? 0) + 1}`,
          hebammeId: ich.id,
          bis: daten.bis,
          weg,
          empfaengerName: weg === "hebset" ? HEBSET_ANSCHRIFT.name : (einstellung?.abrechnungsstelleName ?? null),
          empfaengerAnschrift: weg === "hebset" ? HEBSET_ANSCHRIFT.anschrift : (einstellung?.abrechnungsstelleAnschrift ?? null),
          anzahlFaelle: faelle.length,
          anzahlLeistungen: leistungIds.length,
          summe: summe.toFixed(2),
        })
        .returning();
      // Nur noch nicht vergebene Leistungen übernehmen (Schutz gegen gleichzeitiges Vorbereiten)
      const vergeben = await tx.update(leistung).set({ versandId: v!.id }).where(and(inArray(leistung.id, leistungIds), isNull(leistung.versandId))).returning({ id: leistung.id });
      if (vergeben.length !== leistungIds.length) throw new Error("KONFLIKT");
      return v!;
    }).catch((e: Error) => {
      if (e.message === "KONFLIKT") return null;
      throw e;
    });
    if (!neu) return reply.code(409).send({ fehler: "Einige Leistungen wurden inzwischen einem anderen Versand zugeordnet. Bitte neu laden." });
    await protokollieren(db, ich.id, "angelegt", "versand", neu.id, { faelle: faelle.length, summe });
    return { versand: neu, ausgelassen: ausgelassen.map(fallKurz) };
  });

  app.get("/api/abrechnung/versaende", async (request) => {
    const liste = await db.select().from(versand).where(eq(versand.hebammeId, request.benutzer!.id)).orderBy(desc(versand.erstelltAm));
    const heute = new Date();
    return liste.map((v) => ({
      ...v,
      offenSeitTagen: v.status === "versendet" && v.versendetAm ? tageZwischen(new Date(`${v.versendetAm}T12:00:00`), heute) : null,
    }));
  });

  app.get<{ Params: { id: string } }>("/api/abrechnung/versaende/:id", async (request, reply) => {
    const v = await eigenerVersand(request.params.id, request, reply);
    if (!v) return;
    const faelle = await faelleLaden(db, v.hebammeId, { versandId: v.id });
    return {
      ...v,
      faelle: faelle.map((f) => ({
        ...fallKurz(f),
        leistungen: f.besuche.flatMap((b) => b.leistungen.map((l) => ({ id: l.id, datum: l.datum, gpos: l.gpos, bezeichnung: l.bezeichnung, menge: l.menge, betrag: l.betrag, status: l.status, kuerzungBetrag: l.kuerzungBetrag, kuerzungGrund: l.kuerzungGrund }))),
      })),
    };
  });

  app.get<{ Params: { id: string } }>("/api/abrechnung/versaende/:id/mappe.pdf", async (request, reply) => {
    const v = await eigenerVersand(request.params.id, request, reply);
    if (!v) return;
    const { pdf } = await mappeErzeugen(db, v.id);
    await protokollieren(db, request.benutzer!.id, "gedruckt", "versand", v.id);
    return reply.header("Content-Type", "application/pdf").header("Content-Disposition", `inline; filename="Abrechnung-${v.nummer}.pdf"`).send(Buffer.from(pdf));
  });

  app.post<{ Params: { id: string } }>("/api/abrechnung/versaende/:id/aufloesen", async (request, reply) => {
    const v = await eigenerVersand(request.params.id, request, reply);
    if (!v) return;
    if (v.status !== "vorbereitet") return reply.code(409).send({ fehler: "Nur vorbereitete, noch nicht versendete Versände können aufgelöst werden." });
    await db.transaction(async (tx) => {
      await tx.update(leistung).set({ versandId: null }).where(eq(leistung.versandId, v.id));
      await tx.delete(versand).where(eq(versand.id, v.id));
    });
    await protokollieren(db, request.benutzer!.id, "aufgeloest", "versand", v.id);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>("/api/abrechnung/versaende/:id/versendet", async (request, reply) => {
    const v = await eigenerVersand(request.params.id, request, reply);
    if (!v) return;
    const daten = pruefen(versendetSchema, request.body ?? {}, reply);
    if (!daten) return;
    if (v.status !== "vorbereitet") return reply.code(409).send({ fehler: "Der Versand ist bereits als versendet markiert." });
    const [neu] = await db.transaction(async (tx) => {
      await tx.update(leistung).set({ status: "versendet" }).where(eq(leistung.versandId, v.id));
      return tx.update(versand).set({ status: "versendet", versendetAm: daten.versendetAm ?? heuteIso(), einschreibenNr: daten.einschreibenNr ?? null, geaendertAm: new Date() }).where(eq(versand.id, v.id)).returning();
    });
    await protokollieren(db, request.benutzer!.id, "versendet", "versand", v.id);
    return neu;
  });

  app.post<{ Params: { id: string } }>("/api/abrechnung/versaende/:id/bezahlt", async (request, reply) => {
    const v = await eigenerVersand(request.params.id, request, reply);
    if (!v) return;
    const daten = pruefen(bezahltSchema, request.body, reply);
    if (!daten) return;
    if (v.status === "vorbereitet") return reply.code(409).send({ fehler: "Bitte den Versand zuerst als versendet markieren." });
    const [neu] = await db.transaction(async (tx) => {
      await tx.update(leistung).set({ status: "bezahlt", kuerzungBetrag: null, kuerzungGrund: null }).where(eq(leistung.versandId, v.id));
      for (const k of daten.kuerzungen) {
        await tx.update(leistung).set({ status: "gekuerzt", kuerzungBetrag: k.betrag.toFixed(2), kuerzungGrund: k.grund }).where(and(eq(leistung.id, k.leistungId), eq(leistung.versandId, v.id)));
      }
      const gekuerzt = daten.kuerzungen.reduce((s, k) => s + k.betrag, 0);
      return tx
        .update(versand)
        .set({ status: "bezahlt", bezahltAm: daten.bezahltAm, ausgezahlt: (daten.ausgezahlt ?? Number(v.summe) - gekuerzt).toFixed(2), geaendertAm: new Date() })
        .where(eq(versand.id, v.id))
        .returning();
    });
    await protokollieren(db, request.benutzer!.id, "bezahlt", "versand", v.id, { kuerzungen: daten.kuerzungen.length });
    return neu;
  });

  /** Formular mit vorausgefülltem Kopf (für die Mappe der Familie, Unterschrift auf Papier). */
  app.get<{ Params: { id: string; formular: string } }>("/api/betreuungen/:id/formular/:formular", async (request, reply) => {
    if (request.benutzer?.rolle !== "hebamme") return reply.code(403).send({ fehler: "Nur für Hebammen" });
    const nr = request.params.formular.replace(/\.pdf$/, "");
    const pdf = await kopfFormularErzeugen(db, request.params.id, nr, request.benutzer.id);
    if (!pdf) return reply.code(404).send({ fehler: `Formular ${nr} ist nicht verfügbar.` });
    return reply.header("Content-Type", "application/pdf").header("Content-Disposition", `inline; filename="Formular-${nr}.pdf"`).send(Buffer.from(pdf));
  });

}
