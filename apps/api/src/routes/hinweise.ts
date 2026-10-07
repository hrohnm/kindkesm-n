import { abrechnungsfristen, aufgabeStufe, isoDatum, tageZwischen, type FristHinweis } from "@kindkesmoeoen/shared";
import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Datenbank } from "../db/client";
import { cockpitWarnungen } from "../warnungen";
import { erinnerungen } from "../automatisierungen";
import { ungeleseneNachrichten } from "./nachrichten";
import { abrechnungseinstellung, aenderung, anfrage, aufgabe, benutzer, besuch, betreuung, kind, klientin, kurs, kursTeilnahme, leistung, hinweisErledigt, praxis, regelwerk, rueckruf, urkunde, versand } from "../db/schema";

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
      // Neue Betreuungsanfragen (Website, M11)
      const [neu] = await db.select({ n: sql<number>`count(*)::int` }).from(anfrage).where(eq(anfrage.status, "neu"));
      if (neu && neu.n > 0) {
        hinweise.push({ id: "anfragen-neu", titel: neu.n === 1 ? "1 neue Betreuungsanfrage" : `${neu.n} neue Betreuungsanfragen`, datum: isoDatum(heute), tage: 0, stufe: "warnung", quelle: "Anfragen – bitte prüfen und antworten", link: "/anfragen" });
      }
      // Gewicht, Kontingente, fehlende ärztliche Anordnungen (M1/M7)
      hinweise.push(...(await cockpitWarnungen(db, request.benutzer!.id, heute)));
      // Erinnerungen aus ET und Geburtsdatum (M23)
      hinweise.push(...(await erinnerungen(db, request.benutzer!.id, heute)));
      // Team-Nachrichten und Aufgaben (M20)
      const ungelesen = await ungeleseneNachrichten(db, request.benutzer!.id);
      if (ungelesen.anzahl) {
        hinweise.unshift({ id: "nachrichten", titel: `${ungelesen.anzahl === 1 ? "1 neue Team-Nachricht" : `${ungelesen.anzahl} neue Team-Nachrichten`}${ungelesen.direkt ? ` (${ungelesen.direkt} an dich)` : ""}`, datum: isoDatum(heute), tage: 0, stufe: ungelesen.direkt ? "warnung" : "info", quelle: "Nachrichten", link: "/nachrichten" });
      }
      const heuteIso = isoDatum(heute);
      const offeneAufgaben = await db
        .select({ id: aufgabe.id, titel: aufgabe.titel, faelligAm: aufgabe.faelligAm, zustaendigId: aufgabe.zustaendigId, vorname: klientin.vorname, nachname: klientin.nachname })
        .from(aufgabe)
        .leftJoin(klientin, eq(klientin.id, aufgabe.klientinId))
        .where(and(isNull(aufgabe.erledigtAm), or(isNull(aufgabe.zustaendigId), eq(aufgabe.zustaendigId, request.benutzer!.id))));
      for (const a of offeneAufgaben) {
        const stufe = aufgabeStufe(a.faelligAm, heuteIso);
        if (!stufe || !a.faelligAm) continue;
        hinweise.push({
          id: `aufgabe-${a.id}`,
          titel: `Aufgabe${a.zustaendigId ? "" : " (Team)"}: ${a.titel}${a.vorname ? ` – ${a.vorname} ${a.nachname}` : ""}`,
          datum: a.faelligAm,
          tage: tageZwischen(heute, new Date(`${a.faelligAm}T12:00:00`)),
          stufe,
          quelle: stufe === "dringend" ? "Aufgabe überfällig" : "Aufgabe fällig",
          link: "/nachrichten?ansicht=aufgaben",
        });
      }
      // Offene Rückrufwünsche von der Website – alle Hebammen sehen sie, Wunsch-Hebamme wird genannt
      const rueckrufe = await db.select({ hebammeId: rueckruf.hebammeId, erstelltAm: rueckruf.erstelltAm }).from(rueckruf).where(eq(rueckruf.status, "offen"));
      if (rueckrufe.length) {
        const fuerMich = rueckrufe.filter((r) => r.hebammeId === request.benutzer!.id).length;
        const alt = rueckrufe.some((r) => Date.now() - r.erstelltAm.getTime() > 86_400_000);
        hinweise.push({
          id: "rueckrufe",
          titel: `${rueckrufe.length === 1 ? "1 Rückrufwunsch" : `${rueckrufe.length} Rückrufwünsche`}${fuerMich ? ` (${fuerMich} für dich)` : ""}`,
          datum: isoDatum(heute),
          tage: 0,
          stufe: alt ? "warnung" : "info",
          quelle: "Website – bitte zurückrufen",
          link: "/anfragen#rueckrufe",
        });
      }
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

    if (request.benutzer!.rolle === "hebamme") {
      // Neue Online-Anmeldungen für eigene Kurse
      const neu = await db
        .select({ kursId: kurs.id, titel: kurs.titel, n: sql<number>`count(*)::int` })
        .from(kursTeilnahme)
        .innerJoin(kurs, eq(kurs.id, kursTeilnahme.kursId))
        .where(and(eq(kursTeilnahme.status, "angemeldet"), eq(kursTeilnahme.quelle, "online"), sql`${request.benutzer!.id} = any(${kurs.leitung})`))
        .groupBy(kurs.id, kurs.titel);
      for (const k of neu) {
        hinweise.unshift({ id: `kurs-${k.kursId}`, titel: `${k.n} neue Online-Anmeldung${k.n > 1 ? "en" : ""}: ${k.titel}`, datum: isoDatum(heute), tage: 0, stufe: "info", quelle: "Kurse – bitte bestätigen", link: `/kurse/${k.kursId}` });
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

  /** Erinnerung als erledigt abhaken (nur Erinnerungen der Automatisierung, Kennung „auto-…“) */
  app.post<{ Params: { id: string } }>("/api/hinweise/:id/erledigt", async (request, reply) => {
    if (!/^auto-[a-z0-9-]{1,80}$/.test(request.params.id)) return reply.code(400).send({ fehler: "Dieser Hinweis lässt sich nicht abhaken." });
    await db.insert(hinweisErledigt).values({ benutzerId: request.benutzer!.id, hinweisId: request.params.id }).onConflictDoNothing();
    return { ok: true };
  });
}
