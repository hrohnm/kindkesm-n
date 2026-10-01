import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

/** Schriften (Standard-Helvetica, enthält Umlaute, ß, €, „“ und –). */
export type Schriften = { normal: PDFFont; fett: PDFFont };

export async function schriftenLaden(doc: PDFDocument): Promise<Schriften> {
  return { normal: await doc.embedFont(StandardFonts.Helvetica), fett: await doc.embedFont(StandardFonts.HelveticaBold) };
}

/** Ersetzt Zeichen, die die Standardschrift nicht kennt. */
export const sauber = (text: string) => text.replace(/[^\n\u0020-\u007e\u00a0-\u00ff€„“”‚‘’–—…•]/g, "?");

export const datumDe = (iso: string | null | undefined) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "");
export const euro = (n: number | string) => `${Number(n).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/** Schreibt Text in ein Feld; verkleinert die Schrift, bis er in die Breite passt. y = Grundlinie von oben gemessen. */
export function feldText(
  seite: PDFPage,
  text: string,
  opts: { x: number; y: number; breite?: number; groesse?: number; schrift: PDFFont; ausrichtung?: "links" | "mitte"; seitenhoehe?: number },
) {
  const t = sauber(text).replace(/\n/g, " ");
  if (!t) return;
  const hoehe = opts.seitenhoehe ?? seite.getHeight();
  let groesse = opts.groesse ?? 9;
  if (opts.breite) while (groesse > 5.5 && opts.schrift.widthOfTextAtSize(t, groesse) > opts.breite) groesse -= 0.25;
  const breite = opts.schrift.widthOfTextAtSize(t, groesse);
  const x = opts.ausrichtung === "mitte" && opts.breite ? opts.x + (opts.breite - breite) / 2 : opts.x;
  seite.drawText(t, { x, y: hoehe - opts.y, size: groesse, font: opts.schrift, color: rgb(0.05, 0.1, 0.35) });
}

/** Bricht Text auf eine maximale Breite um. */
export function umbrechen(text: string, schrift: PDFFont, groesse: number, breite: number): string[] {
  const zeilen: string[] = [];
  for (const absatz of sauber(text).split("\n")) {
    let zeile = "";
    for (const wort of absatz.split(/\s+/)) {
      const probe = zeile ? `${zeile} ${wort}` : wort;
      if (schrift.widthOfTextAtSize(probe, groesse) > breite && zeile) {
        zeilen.push(zeile);
        zeile = wort;
      } else zeile = probe;
    }
    zeilen.push(zeile);
  }
  return zeilen;
}

/**
 * Einfacher Seitenschreiber für eigene Seiten (Deckblatt, Datenblatt): fortlaufender Text und Tabellen
 * mit automatischem Seitenumbruch. Koordinaten von oben links, A4.
 */
export class Schreiber {
  seite!: PDFPage;
  y = 0;
  readonly rand = 42;
  readonly breite = 595.28 - 84;
  private seitenNr = 0;

  constructor(
    private doc: PDFDocument,
    private s: Schriften,
    private kopfzeile: string,
  ) {
    this.neueSeite();
  }

  neueSeite() {
    this.seite = this.doc.addPage([595.28, 841.89]);
    this.seitenNr += 1;
    this.y = 48;
    this.seite.drawText(sauber(this.kopfzeile), { x: this.rand, y: 841.89 - 28, size: 7.5, font: this.s.normal, color: rgb(0.4, 0.42, 0.35) });
    this.seite.drawText(`Seite ${this.seitenNr}`, { x: 595.28 - this.rand - 30, y: 841.89 - 28, size: 7.5, font: this.s.normal, color: rgb(0.4, 0.42, 0.35) });
  }

  platz(hoehe: number) {
    if (this.y + hoehe > 800) this.neueSeite();
  }

  text(text: string, opts: { groesse?: number; fett?: boolean; abstand?: number; farbe?: [number, number, number]; einzug?: number } = {}) {
    const groesse = opts.groesse ?? 9.5;
    const schrift = opts.fett ? this.s.fett : this.s.normal;
    for (const zeile of umbrechen(text, schrift, groesse, this.breite - (opts.einzug ?? 0))) {
      this.platz(groesse * 1.35);
      this.y += groesse * 1.25;
      this.seite.drawText(zeile, { x: this.rand + (opts.einzug ?? 0), y: 841.89 - this.y, size: groesse, font: schrift, color: rgb(...(opts.farbe ?? [0.1, 0.12, 0.08])) });
    }
    this.y += opts.abstand ?? 2;
  }

  linie(dicke = 0.6) {
    this.platz(6);
    this.y += 4;
    this.seite.drawLine({ start: { x: this.rand, y: 841.89 - this.y }, end: { x: this.rand + this.breite, y: 841.89 - this.y }, thickness: dicke, color: rgb(0.55, 0.57, 0.48) });
    this.y += 4;
  }

  /** Schlüssel-Wert-Paare in zwei Spalten. */
  felder(paare: Array<[string, string]>, spaltenbreite = 120) {
    for (const [k, v] of paare) {
      const zeilen = umbrechen(v || "–", this.s.normal, 9, this.breite - spaltenbreite);
      this.platz(12 * zeilen.length + 1);
      this.y += 12;
      this.seite.drawText(sauber(k), { x: this.rand, y: 841.89 - this.y, size: 8.5, font: this.s.normal, color: rgb(0.4, 0.42, 0.35) });
      zeilen.forEach((z, i) => this.seite.drawText(z, { x: this.rand + spaltenbreite, y: 841.89 - this.y - i * 11.5, size: 9, font: this.s.normal, color: rgb(0.1, 0.12, 0.08) }));
      this.y += (zeilen.length - 1) * 11.5;
    }
    this.y += 4;
  }

  /** Tabelle mit festen Spaltenbreiten (Summe = breite); rechtsbündige Spalten über "rechts". */
  tabelle(kopf: string[], zeilen: string[][], breiten: number[], opts: { rechts?: number[]; groesse?: number; fettLetzte?: boolean } = {}) {
    const groesse = opts.groesse ?? 8.5;
    const zeichne = (werte: string[], fett: boolean, hintergrund: boolean) => {
      const schrift = fett ? this.s.fett : this.s.normal;
      const umbrueche = werte.map((w, i) => umbrechen(w, schrift, groesse, breiten[i]! - 6));
      const hoehe = Math.max(...umbrueche.map((u) => u.length)) * groesse * 1.2 + 6;
      this.platz(hoehe);
      if (hintergrund) this.seite.drawRectangle({ x: this.rand, y: 841.89 - this.y - hoehe, width: this.breite, height: hoehe, color: rgb(0.92, 0.93, 0.87) });
      let x = this.rand;
      umbrueche.forEach((u, i) => {
        u.forEach((z, j) => {
          const w = schrift.widthOfTextAtSize(z, groesse);
          const zx = opts.rechts?.includes(i) ? x + breiten[i]! - 3 - w : x + 3;
          this.seite.drawText(z, { x: zx, y: 841.89 - this.y - 3 - groesse - j * groesse * 1.2 + 1, size: groesse, font: schrift, color: rgb(0.1, 0.12, 0.08) });
        });
        x += breiten[i]!;
      });
      this.y += hoehe;
      this.seite.drawLine({ start: { x: this.rand, y: 841.89 - this.y }, end: { x: this.rand + this.breite, y: 841.89 - this.y }, thickness: 0.3, color: rgb(0.75, 0.76, 0.7) });
    };
    zeichne(kopf, true, true);
    zeilen.forEach((z, i) => zeichne(z, Boolean(opts.fettLetzte && i === zeilen.length - 1), false));
    this.y += 6;
  }
}
