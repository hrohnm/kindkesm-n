import { abrechnungsfristen, isoDatum, tageZwischen, type FristHinweis } from "@kindkesmoeoen/shared";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Datenbank } from "../db/client";
import { abrechnungseinstellung, aenderung, benutzer, besuch, betreuung, kind, klientin, leistung, praxis, regelwerk, urkunde, versand } from "../db/schema";

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
        hinweise.push({ id: "regelwerk-entwurf", titel: `${r.name}: Startbelegung noch nicht fachlich geprüft und freigegeben`, datum: isoDatum(heute), tage: 0, stufe: "info", quelle: "Regelwerk → „Fassung freigeben“ (Vier-Augen-Prinzip)" });
      }
    }

    if (request.benutzer!.rolle === "hebamme") {
      // Vier-Augen-Freigabe: Vorschläge der Kolleginnen, die auf mich warten
      const offen = await db
        .select({ id: aenderung.id, titel: aenderung.titel, erstelltAm: aenderung.erstelltAm })
        .from(aenderung)
        .where(and(eq(aenderung.status, "offen"), ne(aenderung.erstelltVon, request.benutzer!.id)));
      for (const a of offen) {
        hinweise.unshift({ id: `aenderung-${a.id}`, titel: `Regelwerk: „${a.titel}“ wartet auf deine Freigabe`, datum: isoDatum(a.erstelltAm), tage: 0, stufe: "warnung", quelle: "Regelwerk → Änderungen" });
      }
    }

    if (request.benutzer!.rolle === "hebamme") {
      // Offene Leistungen aus dem Vorjahr (Ausschlussfrist 30.06., Anlage 2 § 2)
      const jahr = heute.getFullYear();
      const [offen] = await db
        .select({ n: sql<number>`count(distinct ${leistung.besuchId})::int` })
        .from(leistung)
        .innerJoin(besuch, eq(besuch.id, leistung.besuchId))
        .where(and(eq(leistung.hebammeId, request.benutzer!.id), isNull(leistung.versandId), sql`${leistung.datum} < ${`${jahr}-01-01`}`));
      if (offen?.n && heute <= new Date(`${jahr}-06-30T23:59:59`)) {
        const tage = tageZwischen(heute, new Date(`${jahr}-06-30T12:00:00`));
        hinweise.push({ id: "vorjahr-offen", titel: `${offen.n} Besuch(e) aus ${jahr - 1} noch nicht abgerechnet – Ausschlussfrist 30.06.`, datum: `${jahr}-06-30`, tage, stufe: tage <= 30 ? "dringend" : "warnung", quelle: "Anlage 2 § 2" });
      }
      // Versendete, aber nach 6 Wochen noch nicht als bezahlt markierte Versände
      const unbezahlt = await db
        .select({ nummer: versand.nummer, versendetAm: versand.versendetAm })
        .from(versand)
        .where(and(eq(versand.hebammeId, request.benutzer!.id), eq(versand.status, "versendet")));
      for (const v of unbezahlt) {
        const seit = v.versendetAm ? tageZwischen(new Date(`${v.versendetAm}T12:00:00`), heute) : 0;
        if (seit > 42) hinweise.push({ id: `unbezahlt-${v.nummer}`, titel: `Versand ${v.nummer} seit ${seit} Tagen ohne Zahlungseingang`, datum: v.versendetAm!, tage: 0, stufe: "warnung", quelle: "Abrechnung (Zahlungsfrist der Kassen 21/28 Tage, Anlage 2 § 4)" });
      }
    }

    if (request.benutzer!.rolle === "hebamme") {
      // Kinderurkunde: 7 Tage vor Ende des späten Wochenbetts (Ablauf der 12. Lebenswoche) vorbereiten
      const kinder = await db
        .select({ id: kind.id, vorname: kind.vorname, geburtsdatum: kind.geburtsdatum, urkunde: urkunde.status })
        .from(kind)
        .innerJoin(betreuung, eq(betreuung.id, kind.betreuungId))
        .innerJoin(klientin, eq(klientin.id, betreuung.klientinId))
        .leftJoin(urkunde, eq(urkunde.kindId, kind.id))
        .where(and(sql`coalesce(${betreuung.zustaendigeHebammeId}, ${klientin.zustaendigeHebammeId}) = ${request.benutzer!.id}`, ne(betreuung.status, "abgeschlossen"), eq(klientin.archiviert, false)));
      for (const k of kinder) {
        if (k.urkunde === "fertig") continue;
        const ende = new Date(`${k.geburtsdatum}T12:00:00`);
        ende.setDate(ende.getDate() + 83); // letzter Tag der 12. Lebenswoche
        const tage = tageZwischen(heute, ende);
        if (tage >= 0 && tage <= 7) {
          hinweise.push({ id: `urkunde-${k.id}`, titel: `Kinderurkunde für ${k.vorname} vorbereiten – Betreuungszeit endet am ${isoDatum(ende).split("-").reverse().join(".")}`, datum: isoDatum(ende), tage, stufe: "info", quelle: "Kinderurkunde (beim letzten Besuch überreichen)", link: `/kinder/${k.id}/urkunde` });
        }
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
