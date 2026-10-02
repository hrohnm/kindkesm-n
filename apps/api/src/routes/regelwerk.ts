import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Datenbank } from "../db/client";
import { LEISTUNGSTYPEN, materialFuer, type Leistungstyp } from "@kindkesmoeoen/shared";
import { benutzer, gebuehrenposition, regelwerk, selbstzahlerLeistung, selbstzahlerPreis } from "../db/schema";
import { regelwerkFuer } from "../regelwerk-laden";

export async function regelwerkRouten(app: FastifyInstance, db: Datenbank) {
  app.get("/api/regelwerke", async () =>
    db
      .select({
        id: regelwerk.id,
        name: regelwerk.name,
        gueltigVon: regelwerk.gueltigVon,
        gueltigBis: regelwerk.gueltigBis,
        status: regelwerk.status,
        importiertAm: regelwerk.importiertAm,
        anzahlPositionen: sql<number>`(select count(*)::int from ${gebuehrenposition} where ${gebuehrenposition.regelwerkId} = ${regelwerk.id})`,
      })
      .from(regelwerk)
      .orderBy(asc(regelwerk.gueltigVon)),
  );

  app.get<{ Params: { id: string } }>("/api/regelwerke/:id", async (request, reply) => {
    const [r] = await db.select().from(regelwerk).where(eq(regelwerk.id, request.params.id));
    if (!r) return reply.code(404).send({ fehler: "Regelwerk nicht gefunden" });
    const d = r.daten as Record<string, unknown>;
    // Positionen werden separat und filterbar geladen
    const { positionen: _positionen, ...rest } = d;
    return { ...r, daten: rest };
  });

  app.get<{ Params: { id: string }; Querystring: { q?: string; kategorie?: string } }>(
    "/api/regelwerke/:id/positionen",
    async (request) => {
      const { q, kategorie } = request.query;
      const bedingungen = [eq(gebuehrenposition.regelwerkId, request.params.id)];
      if (kategorie) bedingungen.push(eq(gebuehrenposition.kategorie, Number(kategorie)));
      if (q) {
        const muster = `%${q}%`;
        bedingungen.push(or(ilike(gebuehrenposition.gpos, muster), ilike(gebuehrenposition.bezeichnung, muster))!);
      }
      const zeilen = await db.select().from(gebuehrenposition).where(and(...bedingungen)).orderBy(asc(gebuehrenposition.gpos));
      // Materialangaben stehen nur im Regelwerk-JSON
      const [rw] = await db.select({ daten: regelwerk.daten }).from(regelwerk).where(eq(regelwerk.id, request.params.id));
      const json = ((rw?.daten as { positionen?: Array<{ gpos: string; material_fuer?: string[]; einmalig?: boolean }> })?.positionen ?? []);
      return zeilen.map((z) => {
        const j = json.find((p) => p.gpos === z.gpos);
        return { ...z, material_fuer: j?.material_fuer ?? [], einmalig: j?.einmalig ?? false };
      });
    },
  );

  app.get("/api/selbstzahler", async (request) => {
    const liste = await db.select().from(selbstzahlerLeistung).orderBy(asc(selbstzahlerLeistung.bezeichnung));
    const eigene = await db
      .select({ leistungId: selbstzahlerPreis.leistungId, benutzerId: selbstzahlerPreis.benutzerId, preis: selbstzahlerPreis.preis, kuerzel: benutzer.kuerzel, name: benutzer.name })
      .from(selbstzahlerPreis)
      .innerJoin(benutzer, eq(benutzer.id, selbstzahlerPreis.benutzerId));
    return liste.map((s) => ({
      ...s,
      eigenePreise: eigene.filter((e) => e.leistungId === s.id).map(({ leistungId: _l, ...e }) => e),
      meinPreis: eigene.find((e) => e.leistungId === s.id && e.benutzerId === request.benutzer!.id)?.preis ?? null,
    }));
  });

  /** Vollständiges Regelwerk, das an einem Datum gilt (für die Abrechnungsvorschau auf dem Gerät, auch offline). */
  app.get<{ Querystring: { datum?: string } }>("/api/regelwerk-fuer", async (request, reply) => {
    const datum = request.query.datum;
    if (!datum || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) return reply.code(400).send({ fehler: "datum angeben" });
    const rw = await regelwerkFuer(db, datum);
    if (!rw) return reply.code(404).send({ fehler: "Kein Regelwerk für dieses Datum" });
    return rw;
  });

  /** Auswählbares Material für eine Leistung an einem Datum (aus dem dann gültigen Regelwerk). */
  app.get<{ Querystring: { datum?: string; typ?: string } }>("/api/material", async (request, reply) => {
    const { datum, typ } = request.query;
    if (!datum || !/^\d{4}-\d{2}-\d{2}$/.test(datum) || !typ || !(LEISTUNGSTYPEN as string[]).includes(typ)) return reply.code(400).send({ fehler: "datum und typ angeben" });
    const rw = await regelwerkFuer(db, datum);
    if (!rw) return [];
    return materialFuer(rw, typ as Leistungstyp).map((gpos) => {
      const p = rw.positionen.find((x) => x.gpos === gpos);
      return { gpos, bezeichnung: p?.kurztext ?? gpos, lang: p?.bezeichnung ?? gpos };
    });
  });
}
