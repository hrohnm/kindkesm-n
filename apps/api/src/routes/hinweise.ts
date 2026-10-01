import { abrechnungsfristen, isoDatum, tageZwischen, type FristHinweis } from "@kindkesmoeoen/shared";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Datenbank } from "../db/client";
import { abrechnungseinstellung, benutzer, praxis, regelwerk } from "../db/schema";

/** Hinweise und Fristen für das Cockpit der angemeldeten Person. */
export async function hinweisRouten(app: FastifyInstance, db: Datenbank) {
  app.get<{ Querystring: { heute?: string } }>("/api/hinweise", async (request) => {
    const heute = request.query.heute ? new Date(`${request.query.heute}T12:00:00`) : new Date();
    const [einst] = await db.select().from(abrechnungseinstellung).where(eq(abrechnungseinstellung.benutzerId, request.benutzer!.id));
    const hinweise: FristHinweis[] = abrechnungsfristen(heute, einst ? { rhythmus: einst.versandRhythmus, versandTag: einst.versandTag, vorlaufTage: einst.erinnerungVorlaufTage } : undefined);

    if (!einst && request.benutzer!.rolle === "hebamme") {
      hinweise.unshift({ id: "einstellungen", titel: "Abrechnungseinstellungen sind noch nicht hinterlegt", datum: isoDatum(heute), tage: 0, stufe: "warnung", quelle: "Einstellungen" });
    }

    const [p] = await db.select().from(praxis).where(eq(praxis.id, 1));
    if (p?.aktivesRegelwerkId) {
      const [r] = await db.select({ status: regelwerk.status, name: regelwerk.name }).from(regelwerk).where(eq(regelwerk.id, p.aktivesRegelwerkId));
      if (r?.status === "entwurf") {
        hinweise.push({ id: "regelwerk-entwurf", titel: `${r.name}: Startbelegung noch nicht fachlich geprüft und freigegeben`, datum: isoDatum(heute), tage: 0, stufe: "info", quelle: "Regelwerk (Vier-Augen-Freigabe ab Meilenstein 5)" });
      }
    }

    // Rückkehr aus der Babypause
    const team = await db.select({ name: benutzer.name, status: benutzer.status, babypauseBis: benutzer.babypauseBis }).from(benutzer);
    for (const h of team) {
      if (h.status === "babypause" && h.babypauseBis) {
        const tage = tageZwischen(heute, new Date(`${h.babypauseBis}T12:00:00`));
        if (tage >= 0 && tage <= 90) {
          hinweise.push({ id: `babypause-${h.name}`, titel: `${h.name} kehrt aus der Babypause zurück`, datum: h.babypauseBis, tage, stufe: "info", quelle: "Team" });
        }
      }
    }
    return hinweise.sort((a, b) => a.tage - b.tage);
  });
}
