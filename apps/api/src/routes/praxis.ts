import { praxisSchema } from "@kindkesmoeoen/shared";
import { and, eq, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { nurHebamme } from "../auth";
import type { Datenbank } from "../db/client";
import { ort, praxis } from "../db/schema";
import { pruefen } from "../fehler";
import { ortVerorten } from "../geo/positionen";
import { protokollieren } from "../protokoll";

export async function praxisRouten(app: FastifyInstance, db: Datenbank) {
  app.get("/api/praxis", async () => {
    const [p] = await db.select().from(praxis).where(eq(praxis.id, 1));
    return p;
  });

  app.put("/api/praxis", { preHandler: nurHebamme }, async (request, reply) => {
    const daten = pruefen(praxisSchema, request.body, reply);
    if (!daten) return;
    const [alt] = await db.select().from(praxis).where(eq(praxis.id, 1));
    const [p] = await db.update(praxis).set({ ...daten, geaendertAm: new Date() }).where(eq(praxis.id, 1)).returning();
    // Der Praxisstandort ist zugleich Ort für Touren aller Hebammen
    if (alt?.anschrift !== daten.anschrift) {
      const orte = await db
        .update(ort)
        .set({ anschrift: daten.anschrift, lat: null, lon: null, geaendertAm: new Date() })
        .where(and(isNull(ort.benutzerId), eq(ort.typ, "praxis")))
        .returning({ id: ort.id });
      for (const o of orte) await ortVerorten(db, o.id);
    }
    await protokollieren(db, request.benutzer?.id, "geaendert", "praxis", "1", daten);
    return p;
  });
}
