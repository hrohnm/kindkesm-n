import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RegelwerkDaten, RwFormularSpalte } from "@kindkesmoeoen/shared";
import { PDFDocument, rgb } from "pdf-lib";
import { config } from "../config";
import { datumDe, feldText, umbrechen, type Schriften } from "./werkzeug";

export type FormularLayout = {
  vorlage: string;
  gueltig_von: string;
  seitenhoehe: number;
  seiten: Record<string, number>;
  unterstuetzt: string[];
  kopf: Record<string, { x: number; y: number; breite: number; groesse: number }>;
  hebammen: { zeilen_oben: number[]; zeilenhoehe: number; name: { x: number; breite: number }; nr: { x: number; breite: number }; ik: { x: number; breite: number }; groesse: number };
  tabelle: {
    zeilen_oben: number[];
    zeilenhoehe: number;
    groesse: number;
    hebnr: [number, number];
    datum: [number, number];
    von: [number, number];
    bis: [number, number];
    leistungsspalten: Array<[number, number]>;
    unterschrift: [number, number];
    vermerk: [number, number];
  };
  vermerke: { x: number; y: number; breite: number; zeilen: number; groesse: number };
  zusatz?: Record<string, { mehrlinge?: { x: number; y: number; groesse: number } }>;
  /** Abweichende Spalten einzelner Formulare (z. B. 3.4: breitere Unterschriftsspalte, nur vier Leistungsspalten) */
  abweichungen?: Record<string, Partial<FormularLayout["tabelle"]>>;
};

/** Verfügbare Formular-Layouts (neueste zuerst). */
const LAYOUTS = ["anlage6-2026-04-01"];

export function layoutFuer(datum: string): { layout: FormularLayout; vorlage: Uint8Array } | undefined {
  for (const name of LAYOUTS) {
    const layout = JSON.parse(readFileSync(join(config.datenOrdner, "regelwerk/formulare", `${name}.layout.json`), "utf8")) as FormularLayout;
    if (datum >= layout.gueltig_von) return { layout, vorlage: readFileSync(join(config.datenOrdner, "regelwerk/formulare", layout.vorlage)) };
  }
  return undefined;
}

export type Formularkopf = {
  krankenkasse: string;
  name: string;
  anschrift: string;
  geburtsdatum: string | null;
  kassenIk: string;
  versichertennummer: string;
  et: string | null;
  geburtsdatumKind: string | null;
  anzahlKinder: number;
};
export type FormularHebamme = { name: string; nr: number; ik: string };
export type FormularZeile = {
  hebNr: number;
  datum: string;
  von: string;
  bis: string;
  spalte: number; // Index der Leistungsspalte
  eintrag: string; // Ziffer oder X
  material: number[]; // Indizes der Materialspalten
  vermerk: boolean;
  unterschriftPng?: string; // Data-URL
};

/**
 * Bestimmt Spalte und Eintrag auf dem Formular für eine Leistungsgruppe (z. B. Stamm "301", Art 1)
 * anhand der Spaltendefinition im Regelwerk. Liefert null, wenn die Leistung nicht auf dem Formular steht.
 */
export function formularSpalte(rw: RegelwerkDaten, formular: string, stammOderGpos: string, art?: number): { index: number; eintrag: string } | null {
  const f = rw.formulare[formular] as { spalten: RwFormularSpalte[] } | undefined;
  if (!f) return null;
  const index = f.spalten.findIndex((s) => s.gruppen.some((g) => g.startsWith(stammOderGpos) || g === stammOderGpos));
  if (index < 0) return null;
  const s = f.spalten[index]!;
  if (s.eintrag === "kreuz") return { index, eintrag: "X" };
  if (art === undefined || (s.ziffern && !s.ziffern.includes(String(art)))) return null;
  return { index, eintrag: String(art) };
}

/** Fügt dem Dokument die Formularseite(n) hinzu (je 15 Zeilen ein Blatt mit identischem Kopf). */
export async function formularSeiten(
  doc: PDFDocument,
  s: Schriften,
  quelle: { layout: FormularLayout; vorlage: Uint8Array },
  formular: string,
  kopf: Formularkopf,
  hebammen: FormularHebamme[],
  zeilen: FormularZeile[],
  vermerke: string[],
): Promise<number> {
  const { layout: l, vorlage } = quelle;
  const vorlageDoc = await PDFDocument.load(vorlage);
  const proBlatt = l.tabelle.zeilen_oben.length;
  const blaetter = Math.max(1, Math.ceil(zeilen.length / proBlatt));
  const h = l.seitenhoehe;

  for (let b = 0; b < blaetter; b++) {
    const [seite] = await doc.copyPages(vorlageDoc, [l.seiten[formular]!]);
    doc.addPage(seite);
    const k = l.kopf;
    const t = (wert: string | null | undefined, feld: keyof typeof k) => wert && feldText(seite!, wert, { ...k[feld]!, schrift: s.normal, seitenhoehe: h });
    t(kopf.krankenkasse, "krankenkasse");
    t(kopf.name, "name");
    t(kopf.anschrift, "anschrift");
    t(datumDe(kopf.geburtsdatum), "geburtsdatum");
    t(kopf.kassenIk, "kassenIk");
    t(kopf.versichertennummer, "versichertennummer");
    t(datumDe(kopf.et), "et");
    t(datumDe(kopf.geburtsdatumKind), "geburtsdatumKind");
    const mehr = l.zusatz?.[formular]?.mehrlinge;
    if (mehr && kopf.anzahlKinder > 1) feldText(seite!, String(kopf.anzahlKinder), { x: mehr.x, y: mehr.y, groesse: mehr.groesse, schrift: s.normal, seitenhoehe: h });

    hebammen.slice(0, l.hebammen.zeilen_oben.length).forEach((hb, i) => {
      const y = l.hebammen.zeilen_oben[i]! + l.hebammen.zeilenhoehe - 4.5;
      feldText(seite!, hb.name, { x: l.hebammen.name.x, y, breite: l.hebammen.name.breite, groesse: l.hebammen.groesse, schrift: s.normal, seitenhoehe: h });
      feldText(seite!, String(hb.nr), { x: l.hebammen.nr.x, y, breite: l.hebammen.nr.breite, groesse: l.hebammen.groesse, schrift: s.normal, ausrichtung: "mitte", seitenhoehe: h });
      feldText(seite!, hb.ik, { x: l.hebammen.ik.x, y, breite: l.hebammen.ik.breite, groesse: l.hebammen.groesse, schrift: s.normal, seitenhoehe: h });
    });

    const tb = { ...l.tabelle, ...l.abweichungen?.[formular] };
    const zelle = (text: string, [x0, x1]: [number, number], y: number, fett = false) =>
      feldText(seite!, text, { x: x0 + 2, y, breite: x1 - x0 - 4, groesse: tb.groesse, schrift: fett ? s.fett : s.normal, ausrichtung: "mitte", seitenhoehe: h });
    for (const [i, z] of zeilen.slice(b * proBlatt, (b + 1) * proBlatt).entries()) {
      const oben = tb.zeilen_oben[i]!;
      const y = oben + tb.zeilenhoehe / 2 + tb.groesse / 2 - 1;
      zelle(String(z.hebNr), tb.hebnr, y);
      zelle(datumDe(z.datum), tb.datum, y);
      if (z.von) zelle(z.von, tb.von, y);
      zelle(z.bis, tb.bis, y);
      zelle(z.eintrag, tb.leistungsspalten[z.spalte]!, y, true);
      for (const m of z.material) zelle("X", tb.leistungsspalten[m]!, y, true);
      if (z.vermerk) zelle("X", tb.vermerk, y, true);
      if (z.unterschriftPng) {
        const bild = await doc.embedPng(Buffer.from(z.unterschriftPng.split(",")[1]!, "base64"));
        const [x0, x1] = tb.unterschrift;
        const maxB = x1 - x0 - 6;
        const maxH = tb.zeilenhoehe - 3;
        const faktor = Math.min(maxB / bild.width, maxH / bild.height);
        const bw = bild.width * faktor;
        const bh = bild.height * faktor;
        seite!.drawImage(bild, { x: x0 + (x1 - x0 - bw) / 2, y: h - oben - tb.zeilenhoehe + (tb.zeilenhoehe - bh) / 2, width: bw, height: bh });
      }
    }

    // Begründungen und Vermerke
    const v = l.vermerke;
    const textzeilen = vermerke.flatMap((t) => umbrechen(t, s.normal, v.groesse, v.breite)).slice(0, v.zeilen);
    textzeilen.forEach((t, i) => seite!.drawText(t, { x: v.x, y: h - v.y - i * v.groesse * 1.3, size: v.groesse, font: s.normal, color: rgb(0.05, 0.1, 0.35) }));
    if (blaetter > 1) feldText(seite!, `Blatt ${b + 1}/${blaetter}`, { x: 480, y: 800, groesse: 7.5, schrift: s.normal, seitenhoehe: h });
  }
  return blaetter;
}
