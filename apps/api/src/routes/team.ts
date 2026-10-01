import { asc } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Datenbank } from "../db/client";
import { benutzer } from "../db/schema";

export async function teamRouten(app: FastifyInstance, db: Datenbank) {
  app.get("/api/team", async () =>
    db
      .select({
        id: benutzer.id,
        name: benutzer.name,
        kuerzel: benutzer.kuerzel,
        email: benutzer.email,
        telefon: benutzer.telefon,
        rolle: benutzer.rolle,
        status: benutzer.status,
        babypauseBis: benutzer.babypauseBis,
        ikHinterlegt: benutzer.ik,
      })
      .from(benutzer)
      .orderBy(asc(benutzer.name))
      .then((zeilen) => zeilen.map((z) => ({ ...z, ikHinterlegt: Boolean(z.ikHinterlegt) }))),
  );
}
