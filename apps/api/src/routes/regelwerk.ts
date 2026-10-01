import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Datenbank } from "../db/client";
import { gebuehrenposition, regelwerk, selbstzahlerLeistung } from "../db/schema";

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
      return db.select().from(gebuehrenposition).where(and(...bedingungen)).orderBy(asc(gebuehrenposition.gpos));
    },
  );

  app.get("/api/selbstzahler", async () => db.select().from(selbstzahlerLeistung).orderBy(asc(selbstzahlerLeistung.bezeichnung)));
}
