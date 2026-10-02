/**
 * CSV-Austausch der Gebührenpositionen und Selbstzahler-Preise (Semikolon, Dezimalkomma, UTF-8 mit BOM – öffnet direkt in Excel).
 * Der Import ändert nichts sofort, sondern erzeugt Operationen für einen Vorschlag mit Vier-Augen-Freigabe.
 */
import { operationSchema, vorherWerte, type Operation } from "./aenderung";
import type { RegelwerkDaten, RwPosition } from "./plausi";

export const POSITIONEN_KOPF = ["GPOS", "Gruppe", "Bezeichnung", "Kurztext", "Kategorie", "Leistungsart", "Zuschlag", "Betrag EUR", "Einheit", "Formular", "Quittierungspflichtig", "Hinweis"];
export const SELBSTZAHLER_KOPF = ["Kennung", "Bezeichnung", "Rechnungstext", "Einheit", "Preis EUR", "Umsatzsteuer", "Angeboten"];

const feld = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const betrag = (b: number | null | undefined) => (b === null || b === undefined ? "" : b.toFixed(2).replace(".", ","));
export const csvText = (zeilen: unknown[][]) => "﻿" + zeilen.map((z) => z.map(feld).join(";")).join("\r\n") + "\r\n";

type PositionVoll = RwPosition & { kategorie?: number; leistungsart?: string; zuschlag?: boolean; hinweis?: string | null };

export function positionenCsv(positionen: PositionVoll[]): string {
  return csvText([
    POSITIONEN_KOPF,
    ...positionen.map((p) => [p.gpos, p.gruppe, p.bezeichnung, p.kurztext, p.kategorie ?? p.gpos[0], p.leistungsart ?? "", p.zuschlag ? "ja" : "nein", betrag(p.betrag), p.einheit, p.formular ?? "", p.quittierungspflichtig ? "ja" : "nein", p.hinweis ?? ""]),
  ]);
}

export function selbstzahlerCsv(liste: Array<{ id: string; bezeichnung: string; rechnungstext: string; einheit: string; preis: number | string; umsatzsteuer: string; aktiv: boolean }>): string {
  return csvText([SELBSTZAHLER_KOPF, ...liste.map((s) => [s.id, s.bezeichnung, s.rechnungstext, s.einheit, betrag(Number(s.preis)), s.umsatzsteuer, s.aktiv ? "ja" : "nein"])]);
}

/** Einfacher CSV-Leser (Semikolon oder Komma, Anführungszeichen, Zeilenumbrüche in Feldern). */
export function csvLesen(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const trenner = (t.split(/\r?\n/)[0] ?? "").includes(";") ? ";" : ",";
  const zeilen: string[][] = [];
  let zeile: string[] = [];
  let f = "";
  let inAnf = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (inAnf) {
      if (c === '"' && t[i + 1] === '"') (f += '"'), i++;
      else if (c === '"') inAnf = false;
      else f += c;
    } else if (c === '"') inAnf = true;
    else if (c === trenner) zeile.push(f), (f = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      zeile.push(f);
      if (zeile.some((x) => x.trim() !== "")) zeilen.push(zeile);
      zeile = [];
      f = "";
    } else f += c;
  }
  zeile.push(f);
  if (zeile.some((x) => x.trim() !== "")) zeilen.push(zeile);
  return zeilen;
}

export type ImportErgebnis = { operationen: Operation[]; vorher: Array<Record<string, unknown>>; hinweise: string[]; unveraendert: number };

const jaNein = (s: string | undefined) => /^(ja|j|x|1|true|wahr)$/i.test((s ?? "").trim());
const zahl = (s: string | undefined) => {
  const t = (s ?? "").trim().replace(/\s|€/g, "");
  if (!t) return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : NaN;
};
const textOderNull = (s: string | undefined) => ((s ?? "").trim() === "" ? null : (s ?? "").trim());

const LEISTUNGSART: Record<string, string> = { "0": "keine Spezifikation", "1": "aufsuchend", "2": "nicht-aufsuchend", "3": "Videobetreuung", "4": "Telefonkurzberatung", "5": "Beleghebamme", "6": "Selbstlerneinheit" };

/** Vergleicht eine CSV der Positionen mit dem Regelwerk und erzeugt Änderungen bzw. neue Positionen. */
export function positionenAusCsv(text: string, daten: RegelwerkDaten & Record<string, unknown>): ImportErgebnis {
  const zeilen = csvLesen(text);
  const kopf = (zeilen.shift() ?? []).map((k) => k.trim().toLowerCase());
  const spalte = (name: string) => kopf.findIndex((k) => k.startsWith(name.toLowerCase()));
  const sp = { gpos: spalte("GPOS"), bez: spalte("Bezeichnung"), kurz: spalte("Kurztext"), art: spalte("Leistungsart"), betrag: spalte("Betrag"), einheit: spalte("Einheit"), formular: spalte("Formular"), quitt: spalte("Quittierungspflichtig"), hinweis: spalte("Hinweis") };
  const ergebnis: ImportErgebnis = { operationen: [], vorher: [], hinweise: [], unveraendert: 0 };
  if (sp.gpos < 0 || sp.betrag < 0) {
    ergebnis.hinweise.push("Die Datei braucht mindestens die Spalten „GPOS“ und „Betrag EUR“ (Vorlage: Export).");
    return ergebnis;
  }
  const gesehen = new Set<string>();
  zeilen.forEach((z, i) => {
    const nr = i + 2;
    const gpos = (z[sp.gpos] ?? "").trim();
    if (!/^\d{5}$/.test(gpos)) return void ergebnis.hinweise.push(`Zeile ${nr}: „${gpos}“ ist keine 5-stellige GPOS – übersprungen.`);
    if (gesehen.has(gpos)) return void ergebnis.hinweise.push(`Zeile ${nr}: GPOS ${gpos} doppelt – übersprungen.`);
    gesehen.add(gpos);
    const b = zahl(z[sp.betrag]);
    if (Number.isNaN(b)) return void ergebnis.hinweise.push(`Zeile ${nr}: Betrag „${z[sp.betrag]}“ unlesbar – übersprungen.`);
    const vorhanden = daten.positionen.find((p) => p.gpos === gpos) as (PositionVoll & Record<string, unknown>) | undefined;
    const lies = (i: number) => (i >= 0 ? z[i] : undefined);
    if (vorhanden) {
      const neu: Record<string, unknown> = { betrag: b };
      if (sp.bez >= 0 && lies(sp.bez)?.trim()) neu.bezeichnung = lies(sp.bez)!.trim();
      if (sp.kurz >= 0 && lies(sp.kurz)?.trim()) neu.kurztext = lies(sp.kurz)!.trim();
      if (sp.formular >= 0) neu.formular = textOderNull(lies(sp.formular));
      if (sp.quitt >= 0) neu.quittierungspflichtig = jaNein(lies(sp.quitt));
      if (sp.hinweis >= 0) neu.hinweis = textOderNull(lies(sp.hinweis));
      const felder = Object.fromEntries(Object.entries(neu).filter(([k, v]) => JSON.stringify(v ?? null) !== JSON.stringify(vorhanden[k] ?? null)));
      if (!Object.keys(felder).length) return void ergebnis.unveraendert++;
      const op = operationSchema.safeParse({ art: "position", gpos, felder });
      if (!op.success) return void ergebnis.hinweise.push(`Zeile ${nr} (GPOS ${gpos}): ${op.error.issues[0]?.message ?? "ungültig"} – übersprungen.`);
      ergebnis.operationen.push(op.data);
      ergebnis.vorher.push(vorherWerte(daten, op.data));
    } else {
      const op = operationSchema.safeParse({
        art: "position_neu",
        position: {
          gpos,
          bezeichnung: (lies(sp.bez) ?? "").trim(),
          kurztext: (lies(sp.kurz) ?? "").trim() || (lies(sp.bez) ?? "").trim().slice(0, 40),
          leistungsart: (lies(sp.art) ?? "").trim() || LEISTUNGSART[gpos[4]!] || "keine Spezifikation",
          betrag: b,
          einheit: (lies(sp.einheit) ?? "").trim() || "pauschal",
          formular: textOderNull(lies(sp.formular)),
          quittierungspflichtig: jaNein(lies(sp.quitt)),
          hinweis: textOderNull(lies(sp.hinweis)),
        },
      });
      if (!op.success) return void ergebnis.hinweise.push(`Zeile ${nr} (neue GPOS ${gpos}): ${op.error.issues.map((x) => `${String(x.path.at(-1) ?? "")} ${x.message}`).join(", ")} – übersprungen.`);
      ergebnis.operationen.push(op.data);
      ergebnis.vorher.push({});
    }
  });
  const fehlen = daten.positionen.filter((p) => !gesehen.has(p.gpos)).length;
  if (fehlen) ergebnis.hinweise.push(`${fehlen} Position(en) stehen nicht in der Datei; sie bleiben unverändert (gelöscht wird nichts).`);
  return ergebnis;
}

/** Vergleicht eine CSV der Selbstzahler-Preisliste und erzeugt Preis-/Textänderungen bzw. neue Leistungen. */
export function selbstzahlerAusCsv(text: string, liste: Record<string, Record<string, unknown>>): ImportErgebnis {
  const zeilen = csvLesen(text);
  const kopf = (zeilen.shift() ?? []).map((k) => k.trim().toLowerCase());
  const s = (n: string) => kopf.findIndex((k) => k.startsWith(n.toLowerCase()));
  const sp = { id: s("Kennung"), bez: s("Bezeichnung"), text: s("Rechnungstext"), einheit: s("Einheit"), preis: s("Preis"), ust: s("Umsatzsteuer"), aktiv: s("Angeboten") };
  const ergebnis: ImportErgebnis = { operationen: [], vorher: [], hinweise: [], unveraendert: 0 };
  if (sp.id < 0 || sp.preis < 0) {
    ergebnis.hinweise.push("Die Datei braucht mindestens die Spalten „Kennung“ und „Preis EUR“ (Vorlage: Export).");
    return ergebnis;
  }
  zeilen.forEach((z, i) => {
    const nr = i + 2;
    const id = (z[sp.id] ?? "").trim();
    const preis = zahl(z[sp.preis]);
    if (!id || preis === null || Number.isNaN(preis)) return void ergebnis.hinweise.push(`Zeile ${nr}: Kennung oder Preis fehlt/unlesbar – übersprungen.`);
    const alt = liste[id];
    const lies = (k: number) => (k >= 0 ? (z[k] ?? "").trim() : "");
    if (alt) {
      const neu: Record<string, unknown> = { preis };
      if (lies(sp.bez)) neu.bezeichnung = lies(sp.bez);
      if (lies(sp.text)) neu.rechnungstext = lies(sp.text);
      if (sp.aktiv >= 0) neu.aktiv = jaNein(lies(sp.aktiv));
      const felder = Object.fromEntries(Object.entries(neu).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(alt[k])));
      if (!Object.keys(felder).length) return void ergebnis.unveraendert++;
      const op = operationSchema.safeParse({ art: "selbstzahler", id, felder });
      if (!op.success) return void ergebnis.hinweise.push(`Zeile ${nr}: ${op.error.issues[0]?.message} – übersprungen.`);
      ergebnis.operationen.push(op.data);
      ergebnis.vorher.push(vorherWerte(null, op.data, liste));
    } else {
      const op = operationSchema.safeParse({ art: "selbstzahler_neu", id, bezeichnung: lies(sp.bez), rechnungstext: lies(sp.text) || lies(sp.bez), einheit: lies(sp.einheit) || "Termin", preis, umsatzsteuer: lies(sp.ust) || "kleinunternehmer_19" });
      if (!op.success) return void ergebnis.hinweise.push(`Zeile ${nr} (neu: ${id}): ${op.error.issues.map((x) => `${String(x.path.at(-1) ?? "")} ${x.message}`).join(", ")} – übersprungen.`);
      ergebnis.operationen.push(op.data);
      ergebnis.vorher.push({});
    }
  });
  return ergebnis;
}
