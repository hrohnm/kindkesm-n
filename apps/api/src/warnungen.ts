/**
 * Warnungen für das Cockpit (M1/M7): Gewichtsabnahme der Kinder, fast ausgeschöpfte Kontingente und Besuche,
 * für die laut Prüfung eine ärztliche Anordnung nötig ist und noch nicht als vorhanden vermerkt wurde.
 * Betrachtet werden die Betreuungen, für die die Hebamme zuständig oder als Vertretung eingetragen ist.
 */
import { anordnungNoetig, epdsAuswerten, epdsLesen, gewichtWarnung, isoDatum, kontingentStand, kontingentWarnung, letztesGewicht, tageZwischen, type FristHinweis, type FruehererBesuch, type Leistungsart } from "@kindkesmoeoen/shared";
import { and, asc, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import type { Datenbank } from "./db/client";
import { besuch, betreuung, kind, klientin } from "./db/schema";
import { regelwerkFuer } from "./regelwerk-laden";

const deZahl = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });

export async function cockpitWarnungen(db: Datenbank, benutzerId: string, heute: Date): Promise<FristHinweis[]> {
  const heuteIso = isoDatum(heute);
  const hinweise: FristHinweis[] = [];
  const meine = await db
    .select({ id: betreuung.id, status: betreuung.status, klientinId: klientin.id, vorname: klientin.vorname, nachname: klientin.nachname })
    .from(betreuung)
    .innerJoin(klientin, eq(klientin.id, betreuung.klientinId))
    .where(
      and(
        inArray(betreuung.status, ["schwangerschaft", "wochenbett"]),
        eq(klientin.archiviert, false),
        or(sql`coalesce(${betreuung.zustaendigeHebammeId}, ${klientin.zustaendigeHebammeId}) = ${benutzerId}`, eq(betreuung.vertretungHebammeId, benutzerId)),
      ),
    );
  if (meine.length) {
    const ids = meine.map((b) => b.id);
    const kinder = await db.select().from(kind).where(inArray(kind.betreuungId, ids));
    const besuche = await db
      .select({ id: besuch.id, betreuungId: besuch.betreuungId, datum: besuch.datum, von: besuch.von, art: besuch.art, stamm: besuch.stamm, einheiten: besuch.einheitenAbrechenbar, dokumentation: besuch.dokumentation })
      .from(besuch)
      .where(inArray(besuch.betreuungId, ids))
      .orderBy(asc(besuch.datum), asc(besuch.von));
    const rw = await regelwerkFuer(db, heuteIso);

    for (const b of meine) {
      const name = `${b.vorname} ${b.nachname}`;
      const eigene = besuche.filter((x) => x.betreuungId === b.id);
      // Gewicht: letzter Wert der letzten 14 Tage gegenüber dem Geburtsgewicht
      for (const k of kinder.filter((x) => x.betreuungId === b.id)) {
        const letztes = letztesGewicht(eigene, k.id);
        if (!letztes || tageZwischen(new Date(`${letztes.datum}T12:00:00`), heute) > 14) continue;
        const w = gewichtWarnung(k.geburtsgewicht, letztes.gramm);
        if (!w) continue;
        const lebenstag = tageZwischen(new Date(`${k.geburtsdatum}T12:00:00`), new Date(`${letztes.datum}T12:00:00`)) + 1;
        hinweise.push({
          id: `gewicht-${k.id}`,
          titel: `${k.vorname}${k.nachname ? ` ${k.nachname}` : ""}: ${deZahl(w.abnahme)} % unter dem Geburtsgewicht (${lebenstag}. Lebenstag)`,
          datum: letztes.datum,
          tage: 0,
          stufe: w.stufe === "warnung" ? "dringend" : "info",
          quelle: w.stufe === "warnung" ? "Gewicht – Stillen/Ernährung prüfen, ggf. ärztlich abklären" : "Gewicht – genauer beobachten",
          link: `/kinder/${k.id}/gewicht`,
        });
      }
      // EPDS: letzte Auswertung der letzten 14 Tage
      const mitEpds = [...eigene].reverse().find((x) => typeof (x.dokumentation as { mutter?: { epds?: unknown } })?.mutter?.epds === "string");
      if (mitEpds && tageZwischen(new Date(`${mitEpds.datum}T12:00:00`), heute) <= 14) {
        const e = epdsAuswerten(epdsLesen((mitEpds.dokumentation as { mutter: { epds: string } }).mutter.epds));
        if (e && (e.selbstverletzung || e.stufe !== "unauffaellig")) {
          hinweise.push({
            id: `epds-${b.id}`,
            titel: `${name}: EPDS ${e.summe} ${e.summe === 1 ? "Punkt" : "Punkte"}${e.selbstverletzung ? " – Frage 10 positiv" : ""}`,
            datum: mitEpds.datum,
            tage: 0,
            stufe: e.selbstverletzung || e.stufe === "auffaellig" ? "dringend" : "info",
            quelle: e.selbstverletzung || e.stufe === "auffaellig" ? "Stimmung – ärztliche Abklärung anbahnen" : "Stimmung – genauer hinsehen",
            link: `/besuche/${mitEpds.id}`,
          });
        }
      }
      // Kontingente der laufenden Phase
      if (rw) {
        const fruehere: FruehererBesuch[] = eigene.map((x) => ({ id: x.id, datum: x.datum, von: x.von, art: x.art as Leistungsart, stamm: x.stamm, einheiten: x.einheiten, material: [] }));
        const relevant = b.status === "wochenbett" ? ["301", "303", "306"] : ["101-tel", "103", "104"];
        for (const s of kontingentStand(fruehere, rw).filter((s) => relevant.includes(s.id))) {
          const w = kontingentWarnung(s);
          if (!w) continue;
          hinweise.push({ id: `kontingent-${b.id}-${s.id}`, titel: `${name} – ${w.text}`, datum: heuteIso, tage: 0, stufe: w.stufe === "warnung" ? "warnung" : "info", quelle: "Kontingent", link: `/klientinnen/${b.klientinId}` });
        }
      }
    }
  }

  // Besuche des letzten Jahres, für die eine ärztliche Anordnung nötig ist und noch nicht vermerkt wurde
  const grenze = new Date(heute);
  grenze.setFullYear(grenze.getFullYear() - 1);
  const offen = await db
    .select({ id: besuch.id, datum: besuch.datum, hinweise: besuch.hinweise, klientinId: klientin.id, vorname: klientin.vorname, nachname: klientin.nachname })
    .from(besuch)
    .innerJoin(betreuung, eq(betreuung.id, besuch.betreuungId))
    .innerJoin(klientin, eq(klientin.id, betreuung.klientinId))
    .where(and(eq(besuch.hebammeId, benutzerId), eq(besuch.anordnungVorhanden, false), gte(besuch.datum, isoDatum(grenze)), sql`${besuch.hinweise}::text ilike '%Anordnung%'`))
    .orderBy(desc(besuch.datum));
  const jeKlientin = new Map<string, typeof offen>();
  for (const o of offen.filter((x) => anordnungNoetig(x.hinweise))) jeKlientin.set(o.klientinId, [...(jeKlientin.get(o.klientinId) ?? []), o]);
  for (const [klientinId, liste] of jeKlientin) {
    const neuester = liste[0]!;
    hinweise.push({
      id: `anordnung-${klientinId}`,
      titel: `Ärztliche Anordnung fehlt: ${neuester.vorname} ${neuester.nachname} (${liste.length === 1 ? "1 Besuch" : `${liste.length} Besuche`})`,
      datum: neuester.datum,
      tage: 0,
      stufe: "warnung",
      quelle: "Anordnung einholen und im Besuch vermerken",
      link: `/besuche/${neuester.id}`,
    });
  }
  return hinweise;
}
