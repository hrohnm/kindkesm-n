import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { config } from "../config";
import type { Datenbank } from "../db/client";
import { aenderung, gebuehrenposition, ort, praxis, regelwerk, selbstzahlerLeistung } from "../db/schema";

type Position = {
  gpos: string;
  gruppe: string;
  bezeichnung: string;
  kurztext: string;
  kategorie: number;
  leistungsart: string;
  leistungsart_kurs?: string;
  zuschlag: boolean;
  betrag: number | null;
  einheit: string;
  formular: string | null;
  quittierungspflichtig: boolean;
  hinweis?: string;
  befristung?: { gueltig_von: string; gueltig_bis: string };
};

/** Zeile der Tabelle gebuehrenposition aus einer Position des Regelwerk-JSON. */
export function positionZeile(regelwerkId: string, p: Position) {
  return {
    regelwerkId,
    gpos: p.gpos,
    gruppe: p.gruppe,
    bezeichnung: p.bezeichnung,
    kurztext: p.kurztext,
    kategorie: p.kategorie,
    leistungsart: p.leistungsart_kurs ?? p.leistungsart,
    zuschlag: p.zuschlag,
    betrag: p.betrag === null ? null : p.betrag.toFixed(2),
    einheit: p.einheit,
    formular: p.formular,
    quittierungspflichtig: p.quittierungspflichtig,
    hinweis: p.hinweis ?? null,
    befristetVon: p.befristung?.gueltig_von ?? null,
    befristetBis: p.befristung?.gueltig_bis ?? null,
  };
}
export type { Position as RegelwerkPosition };

const lesen = (relativ: string) => JSON.parse(readFileSync(join(config.datenOrdner, relativ), "utf8"));

/**
 * Importiert ein Regelwerk aus regelwerk/<id>.json. Bereits importierte Versionen werden ersetzt,
 * solange sie noch im Status "entwurf" sind; aktive oder archivierte Versionen bleiben unangetastet.
 */
export async function regelwerkImportieren(db: Datenbank, id: string) {
  const daten = lesen(`regelwerk/${id}.json`);
  const [vorhanden] = await db.select({ status: regelwerk.status }).from(regelwerk).where(eq(regelwerk.id, id));
  if (vorhanden && vorhanden.status !== "entwurf") return { id, uebersprungen: true };
  // In der App freigegebene Änderungen nicht durch die Datei überschreiben
  const [geaendert] = await db.select({ id: aenderung.id }).from(aenderung).where(and(eq(aenderung.regelwerkId, id), eq(aenderung.status, "freigegeben"))).limit(1);
  if (geaendert) return { id, uebersprungen: true };

  await db.transaction(async (tx) => {
    await tx.delete(regelwerk).where(eq(regelwerk.id, id));
    await tx.insert(regelwerk).values({
      id,
      name: daten.name,
      gueltigVon: daten.gueltig_von,
      gueltigBis: daten.gueltig_bis,
      status: "entwurf",
      daten,
    });
    await tx.insert(gebuehrenposition).values((daten.positionen as Position[]).map((p) => positionZeile(id, p)));
  });
  return { id, positionen: daten.positionen.length };
}

export async function selbstzahlerImportieren(db: Datenbank) {
  const liste = lesen("konfiguration/selbstzahler-preisliste.json");
  for (const l of liste.leistungen as Array<Record<string, unknown>>) {
    const { id, bezeichnung, rechnungstext, einheit, preis, umsatzsteuer, ...details } = l as {
      id: string; bezeichnung: string; rechnungstext: string; einheit: string; preis: number; umsatzsteuer: string;
    };
    const werte = { id, bezeichnung, rechnungstext, einheit, preis: preis.toFixed(2), umsatzsteuer, details };
    // Vorhandene (evtl. in der App geänderte) Preise nicht überschreiben
    await db.insert(selbstzahlerLeistung).values(werte).onConflictDoNothing();
  }
  return liste.leistungen.length as number;
}

export async function praxisAnlegen(db: Datenbank) {
  const konf = lesen("konfiguration/einstellungen-beispiel.json");
  await db
    .insert(praxis)
    .values({
      id: 1,
      name: konf.praxis.name,
      anschrift: konf.praxis.standort.anschrift,
      aktivesRegelwerkId: konf.praxis.regelwerk.aktiv,
      einstellungen: { wegegeld: konf.praxis.wegegeld, benachrichtigungen: konf.praxis.benachrichtigungen },
    })
    .onConflictDoNothing();
  const [praxisOrt] = await db.select().from(ort).where(and(isNull(ort.benutzerId), eq(ort.typ, "praxis")));
  if (!praxisOrt) {
    await db.insert(ort).values({ benutzerId: null, bezeichnung: "Praxis", typ: "praxis", anschrift: konf.praxis.standort.anschrift });
  }
}
