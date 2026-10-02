/**
 * Kinderurkunde im Praxis-Design „Kindkesmöön“: cremefarbenes Papier, Logo mit Schriftzug, Schreibschrift
 * (Dancing Script, SIL OFL) für Titel und Überschriften, Symbole bei den Geburtsdaten, Mohnblume, Hügel und
 * Leuchtturm im Fuß. Seite 1: Text, Geburtsdaten, Tabelle. Seite 2: „Dein Wachstum“ mit bis zu drei Kurven.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { datumLang, sternzeichen, type Messgroesse, type UrkundeZeile } from "@kindkesmoeoen/shared";
import { PDFDocument, StandardFonts, rgb, setCharacterSpacing, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { config } from "../config";
import { datumDe, sauber, umbrechen } from "./werkzeug";
import type { UrkundePdfDaten } from "./urkunde";

const B = 595.28;
const H = 841.89;
const F = {
  papier: rgb(0.976, 0.969, 0.945),
  dunkel: rgb(0.2, 0.24, 0.2),
  text: rgb(0.24, 0.26, 0.24),
  grau: rgb(0.45, 0.47, 0.45),
  linie: rgb(0.8, 0.82, 0.79),
  kasten: rgb(0.99, 0.985, 0.97),
  kopf: rgb(0.88, 0.9, 0.87),
  salbei: rgb(0.45, 0.5, 0.45),
  mohn: rgb(0.85, 0.43, 0.39),
  mohnDunkel: rgb(0.66, 0.27, 0.25),
  blatt: rgb(0.45, 0.58, 0.45),
  huegel1: rgb(0.84, 0.87, 0.83),
  huegel2: rgb(0.74, 0.79, 0.73),
};
const RAND = 40;
const UNTEN = 150; // Fußbereich mit Grafik

const g = (x: number) => Math.round(x).toLocaleString("de-DE");
const zahl = (x: number) => x.toLocaleString("de-DE", { maximumFractionDigits: 1 });

function datei(...pfade: Array<string | undefined>) {
  for (const p of pfade) if (p && existsSync(p)) return readFileSync(p);
  return null;
}

type Schriften = { normal: PDFFont; fett: PDFFont; kursiv: PDFFont; schreib: PDFFont };

export async function urkundeKindkesmoeoenPdf(d: UrkundePdfDaten, doc: PDFDocument): Promise<void> {
  doc.registerFontkit(fontkit);
  const schreibDaten = datei(join(config.datenOrdner, "apps/api/assets/fonts/DancingScript.ttf"));
  const s: Schriften = {
    normal: await doc.embedFont(StandardFonts.Helvetica),
    fett: await doc.embedFont(StandardFonts.HelveticaBold),
    kursiv: await doc.embedFont(StandardFonts.TimesRomanItalic),
    schreib: schreibDaten ? await doc.embedFont(schreibDaten, { subset: true }) : await doc.embedFont(StandardFonts.TimesRomanBoldItalic),
  };
  const logoDaten = datei(config.webDist && join(config.webDist, "logo.png"), join(config.datenOrdner, "apps/web/public/logo.png"));
  const logo: PDFImage | null = logoDaten ? await doc.embedPng(logoDaten).catch(() => null) : null;
  const u = d.urkunde;

  // ---------------------------------------------------- Zeichenhilfen (y von oben gemessen)
  const t = (p: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color: RGB = F.text, abstand = 0) => {
    const tx = sauber(text);
    if (abstand) p.pushOperators(setCharacterSpacing(abstand));
    p.drawText(tx, { x, y: H - y, size, font, color });
    if (abstand) p.pushOperators(setCharacterSpacing(0));
  };
  const breite = (text: string, font: PDFFont, size: number, abstand = 0) => font.widthOfTextAtSize(sauber(text), size) + abstand * Math.max(0, sauber(text).length - 1);
  const mitte = (p: PDFPage, text: string, y: number, font: PDFFont, size: number, color: RGB = F.text, abstand = 0) => t(p, text, (B - breite(text, font, size, abstand)) / 2, y, font, size, color, abstand);
  const pfad = (p: PDFPage, d0: string, x: number, y: number, opts: { fuellung?: RGB; linie?: RGB; staerke?: number; skala?: number; deckkraft?: number }) =>
    p.drawSvgPath(d0, { x, y: H - y, color: opts.fuellung, borderColor: opts.linie, borderWidth: opts.linie ? (opts.staerke ?? 1.2) : 0, scale: opts.skala ?? 1, opacity: opts.deckkraft, borderOpacity: opts.deckkraft });
  const herz = (p: PDFPage, x: number, y: number, groesse: number, farbe: RGB = F.salbei) =>
    pfad(p, "M12 21 C5 15 2 12 2 8 C2 5 4.5 3 7 3 C9 3 11 4.5 12 6 C13 4.5 15 3 17 3 C19.5 3 22 5 22 8 C22 12 19 15 12 21 Z", x - (12 * groesse) / 24, y - (12 * groesse) / 24, { fuellung: farbe, skala: groesse / 24 });
  const trenner = (p: PDFPage, y: number, halb: number) => {
    p.drawLine({ start: { x: B / 2 - halb, y: H - y }, end: { x: B / 2 - 9, y: H - y }, thickness: 0.6, color: F.salbei });
    p.drawLine({ start: { x: B / 2 + 9, y: H - y }, end: { x: B / 2 + halb, y: H - y }, thickness: 0.6, color: F.salbei });
    herz(p, B / 2, y, 9);
  };
  const kasten = (p: PDFPage, x: number, y: number, w: number, h: number, r = 8, fuellung: RGB = F.kasten) =>
    pfad(p, `M${r} 0 H${w - r} Q${w} 0 ${w} ${r} V${h - r} Q${w} ${h} ${w - r} ${h} H${r} Q0 ${h} 0 ${h - r} V${r} Q0 0 ${r} 0 Z`, x, y, { fuellung, linie: F.linie, staerke: 0.8 });

  // Symbole (24er-Raster, Strich)
  const SYMBOL: Record<string, (p: PDFPage, x: number, y: number, k: number) => void> = {
    kalender: (p, x, y, k) => {
      pfad(p, "M3 6 H21 V21 H3 Z M3 10 H21 M8 3 V7 M16 3 V7 M7 14 H9 M11 14 H13 M15 14 H17 M7 17.5 H9 M11 17.5 H13", x, y, { linie: F.dunkel, skala: k, staerke: 1.3 });
    },
    uhr: (p, x, y, k) => {
      p.drawCircle({ x: x + 12 * k, y: H - y - 12 * k, size: 9.5 * k, borderColor: F.dunkel, borderWidth: 1.3 });
      pfad(p, "M12 6.5 V12 L15.5 14.5", x, y, { linie: F.dunkel, skala: k, staerke: 1.3 });
    },
    gewicht: (p, x, y, k) => pfad(p, "M5 10 H19 L21 21 H3 Z M9 10 C9 5.5 15 5.5 15 10 M10 15.5 H14", x, y, { linie: F.dunkel, skala: k, staerke: 1.3 }),
    lineal: (p, x, y, k) => pfad(p, "M2.5 16.5 L16.5 2.5 L21.5 7.5 L7.5 21.5 Z M6.5 12.5 L8.5 14.5 M9.5 9.5 L11.5 11.5 M12.5 6.5 L14.5 8.5", x, y, { linie: F.dunkel, skala: k, staerke: 1.3 }),
    kopf: (p, x, y, k) =>
      pfad(p, "M9 21 V18 C5.5 17 4 13.5 4.5 10 C5 5.5 8.5 3 12.5 3 C17 3 20 6.5 19.5 11 L21 14 H19 V16.5 C19 17.5 18 18 17 18 H14.5 V21 M12 9.5 C13.5 8.5 15 9.5 14.5 11 C14 12.3 12.5 12 12.5 11", x, y, { linie: F.dunkel, skala: k, staerke: 1.3 }),
    stern: (p, x, y, k) => pfad(p, "M12 3 L14.6 9 L21 9.6 L16.2 13.8 L17.6 20.2 L12 16.9 L6.4 20.2 L7.8 13.8 L3 9.6 L9.4 9 Z", x, y, { linie: F.dunkel, skala: k, staerke: 1.2 }),
    ort: (p, x, y, k) => {
      pfad(p, "M12 21 C9 17 5 13 5 9.5 C5 5.5 8.5 3 12 3 C15.5 3 19 5.5 19 9.5 C19 13 15 17 12 21 Z", x, y, { linie: F.dunkel, skala: k, staerke: 1.3 });
      p.drawCircle({ x: x + 12 * k, y: H - y - 9.5 * k, size: 2.5 * k, borderColor: F.dunkel, borderWidth: 1.2 });
    },
  };

  /** Fuß: Hügel, Mohnblume links, Leuchtturm rechts, Möwen; darüber eine Zeile in Schreibschrift. */
  const fuss = (p: PDFPage, zeileSchreib: string | null, zeileKlein: string | null) => {
    const band = 120;
    pfad(p, "M0 62 C110 26 250 38 350 56 C450 74 520 44 595.28 34 L595.28 120 L0 120 Z", 0, H - band, { fuellung: F.huegel1 });
    pfad(p, "M0 92 C150 66 300 88 420 82 C500 78 560 66 595.28 72 L595.28 120 L0 120 Z", 0, H - band, { fuellung: F.huegel2 });
    // Mohnblume
    const mx = 46;
    const my = H - 112;
    pfad(p, "M30 100 C32 78 38 58 46 40", mx, my, { linie: F.blatt, staerke: 1.6 });
    pfad(p, "M33 78 C20 72 12 62 10 52 C22 56 30 64 33 78 Z", mx, my, { fuellung: F.blatt });
    pfad(p, "M38 64 C46 58 58 56 66 58 C58 66 48 68 38 64 Z", mx, my, { fuellung: F.blatt, deckkraft: 0.9 });
    pfad(p, "M46 40 C30 38 22 24 28 14 C34 20 42 22 46 30 Z", mx, my, { fuellung: F.mohnDunkel });
    pfad(p, "M46 40 C36 30 36 14 48 8 C56 14 58 28 46 40 Z", mx, my, { fuellung: F.mohn });
    pfad(p, "M46 40 C56 34 70 34 72 22 C62 18 52 24 46 40 Z", mx, my, { fuellung: F.mohn, deckkraft: 0.92 });
    p.drawCircle({ x: mx + 46, y: H - my - 36, size: 2.6, color: F.dunkel });
    // Leuchtturm
    const lx = B - 66;
    const ly = H - 34;
    for (let i = 0; i < 5; i++) {
      const bu = 9 - i * 0.8;
      const bo = 9 - (i + 1) * 0.8;
      pfad(p, `M${-bu} 0 L${bu} 0 L${bo} -12 L${-bo} -12 Z`, lx, ly - i * 12, { fuellung: i % 2 ? rgb(1, 1, 1) : F.mohn, linie: F.mohnDunkel, staerke: 0.4 });
    }
    p.drawRectangle({ x: lx - 7.5, y: H - ly + 60, width: 15, height: 2.4, color: F.dunkel });
    p.drawRectangle({ x: lx - 4.5, y: H - ly + 62.4, width: 9, height: 8, color: rgb(1, 0.88, 0.55), borderColor: F.dunkel, borderWidth: 0.5 });
    pfad(p, "M-7 0 L0 -5 L7 0 Z", lx, ly - 70.4, { fuellung: F.mohn });
    pfad(p, "M-18 0 C-14 -6 -12 -8 -10 -10 M-14 0 C-12 -5 -11 -7 -11 -9 M14 0 C12 -6 11 -8 9 -9 M18 0 C16 -5 14 -7 12 -8", lx, ly, { linie: F.blatt, staerke: 0.9 });
    for (const [bx, by, k] of [[lx - 44, ly - 66, 1], [lx - 30, ly - 74, 0.8]] as const) pfad(p, "M0 0 Q3 -3 6 0 Q9 -3 12 0", bx, by, { linie: F.grau, staerke: 0.7, skala: k });
    if (zeileSchreib) mitte(p, zeileSchreib, H - 112, s.schreib, 13.5, F.dunkel);
    if (zeileKlein) mitte(p, zeileKlein.toUpperCase(), H - 97, s.normal, 6.3, F.grau, 1.1);
  };

  /** Kopf mit Logo, „HEBAMMENPRAXIS“, Schriftzug und Trenner; gibt y unterhalb zurück. */
  const kopf = (p: PDFPage) => {
    p.drawRectangle({ x: 0, y: 0, width: B, height: H, color: F.papier });
    let y = 22;
    if (logo) {
      const h = 64;
      const w = (logo.width / logo.height) * h;
      p.drawImage(logo, { x: (B - w) / 2, y: H - y - h, width: w, height: h });
      y += h;
    }
    mitte(p, "HEBAMMENPRAXIS", y + 13, s.normal, 8.5, F.dunkel, 2.6);
    mitte(p, "Kindkesmöön", y + 40, s.schreib, 28, F.dunkel);
    trenner(p, y + 50, 90);
    return y + 62;
  };

  // ==================================================== Seite 1
  let seite = doc.addPage([B, H]);
  let y = kopf(seite);
  mitte(seite, u.titel, y + 40, s.schreib, 42, F.dunkel);
  y += 64;
  const geboren = `geboren am ${datumLang(d.kind.geburtsdatum)}${d.kind.geburtszeit ? ` um ${d.kind.geburtszeit.slice(0, 5)} Uhr` : ""}${d.geburtsort ? ` in ${d.geburtsort}` : ""}`;
  mitte(seite, geboren.toUpperCase(), y, s.normal, 9, F.dunkel, 1.8);
  y += 26;

  // Persönlicher Text; die Grußzeile („– Deine Hebamme …“) in Schreibschrift mit Herz
  const textX = 88;
  const textB = B - 2 * textX;
  const absaetze = u.text.split("\n");
  const gruss = absaetze.length > 1 && /^[–-]/.test(absaetze.at(-1)!.trim()) ? absaetze.pop()!.trim() : u.optionen.unterschrift ? `– Deine Hebamme ${d.hebamme.split(/\s+/)[0]}` : null;
  for (const zeile of umbrechen(absaetze.join("\n"), s.kursiv, 12.5, textB)) {
    t(seite, zeile, textX, y, s.kursiv, 12.5, F.text);
    y += 17;
  }
  if (gruss) {
    t(seite, gruss, textX, y + 2, s.schreib, 14, F.dunkel);
    herz(seite, textX + breite(gruss, s.schreib, 14) + 10, y - 2, 9, F.dunkel);
    y += 20;
  }
  y += 10;

  // Geburtsdaten mit Symbolen
  const daten: Array<[string, string, string]> = [
    ["kalender", "Geburtstag", datumDe(d.kind.geburtsdatum)],
    ...(d.kind.geburtszeit ? [["uhr", "Uhrzeit", `${d.kind.geburtszeit.slice(0, 5)} Uhr`] as [string, string, string]] : []),
    ...(d.kind.geburtsgewicht ? [["gewicht", "Gewicht", `${g(d.kind.geburtsgewicht)} g`] as [string, string, string]] : []),
    ...(d.kind.laenge ? [["lineal", "Länge", `${zahl(d.kind.laenge)} cm`] as [string, string, string]] : []),
    ...(d.kind.kopfumfang ? [["kopf", "Kopfumfang", `${zahl(d.kind.kopfumfang)} cm`] as [string, string, string]] : []),
    ...(d.geburtsort ? [["ort", "Geburtsort", d.geburtsort] as [string, string, string]] : []),
    ...(u.optionen.sternzeichen ? [["stern", "Sternzeichen", sternzeichen(d.kind.geburtsdatum)] as [string, string, string]] : []),
  ];
  const reihen: Array<typeof daten> = [];
  for (let i = 0; i < daten.length; i += 4) reihen.push(daten.slice(i, i + 4));
  const zeilenH = 46;
  const boxB = B - 2 * RAND;
  kasten(seite, RAND, y, boxB, reihen.length * zeilenH + 8);
  reihen.forEach((r, ri) => {
    const zy = y + 4 + ri * zeilenH;
    if (ri) seite.drawLine({ start: { x: RAND + 14, y: H - zy }, end: { x: RAND + boxB - 14, y: H - zy }, thickness: 0.5, color: F.linie });
    const zelle = boxB / r.length;
    r.forEach(([sym, label, wert], ci) => {
      const zx = RAND + ci * zelle;
      if (ci) seite.drawLine({ start: { x: zx, y: H - zy - 10 }, end: { x: zx, y: H - zy - zeilenH + 10 }, thickness: 0.5, color: F.linie });
      SYMBOL[sym]!(seite, zx + 16, zy + 10, 1.1);
      t(seite, label.toUpperCase(), zx + 52, zy + 19, s.normal, 6.3, F.grau, 0.8);
      let groesse = 11;
      while (groesse > 7 && breite(wert, s.normal, groesse) > zelle - 60) groesse -= 0.5;
      t(seite, wert, zx + 52, zy + 33, s.normal, groesse, F.dunkel);
    });
  });
  y += reihen.length * zeilenH + 8 + 26;

  // Tabelle aus der Hebammenzeit
  if (u.zeilen.length) {
    const ueberschrift = (p: PDFPage, yy: number, text: string) => {
      herz(p, RAND + 6, yy - 5, 11, F.dunkel);
      t(p, text, RAND + 20, yy, s.schreib, 17, F.dunkel);
      const w = breite(text, s.schreib, 17);
      p.drawLine({ start: { x: RAND + 30 + w, y: H - yy + 4 }, end: { x: B - RAND, y: H - yy + 4 }, thickness: 0.6, color: F.linie });
    };
    ueberschrift(seite, y, "Aus unserer gemeinsamen Zeit");
    y += 14;
    const hat = (f: keyof UrkundeZeile) => u.zeilen.some((z) => z[f] != null && z[f] !== "");
    const spalten: Array<{ titel: string; b: number; wert: (z: UrkundeZeile) => string }> = [
      { titel: "Datum", b: 84, wert: (z) => datumDe(z.datum) },
      { titel: "Lebenstag", b: 66, wert: (z) => String(z.lebenstag) },
      ...(hat("gewicht") ? [{ titel: "Gewicht", b: 76, wert: (z: UrkundeZeile) => (z.gewicht ? `${g(z.gewicht)} g` : "") }] : []),
      ...(hat("laenge") ? [{ titel: "Länge", b: 70, wert: (z: UrkundeZeile) => (z.laenge ? `${zahl(z.laenge)} cm` : "") }] : []),
      ...(hat("kopfumfang") ? [{ titel: "Kopfumfang", b: 80, wert: (z: UrkundeZeile) => (z.kopfumfang ? `${zahl(z.kopfumfang)} cm` : "") }] : []),
    ];
    spalten.push({ titel: "Besonderes", b: boxB - spalten.reduce((a, x) => a + x.b, 0), wert: (z) => z.besonderes ?? "" });
    // Zeilenhöhe an den Platz anpassen; reicht er nicht, geht es auf einer Folgeseite weiter
    let rest = [...u.zeilen];
    while (rest.length) {
      const frei = H - UNTEN - y - 24;
      const zh = Math.max(12, Math.min(16, frei / rest.length));
      const passen = Math.max(1, Math.floor(frei / zh));
      const teil = rest.slice(0, passen);
      rest = rest.slice(passen);
      const hoehe = 20 + teil.length * zh + 4;
      kasten(seite, RAND, y, boxB, hoehe, 7);
      pfad(seite, `M7 0 H${boxB - 7} Q${boxB} 0 ${boxB} 7 V20 H0 V7 Q0 0 7 0 Z`, RAND, y, { fuellung: F.kopf });
      let x = RAND + 14;
      for (const sp of spalten) {
        t(seite, sp.titel.toUpperCase(), x, y + 13, s.normal, 6.3, F.dunkel, 0.6);
        x += sp.b;
      }
      teil.forEach((z, i) => {
        const zy = y + 20 + i * zh;
        if (i) seite.drawLine({ start: { x: RAND + 1, y: H - zy }, end: { x: RAND + boxB - 1, y: H - zy }, thickness: 0.35, color: F.linie });
        let xx = RAND + 14;
        for (const sp of spalten) {
          const w = sp.wert(z);
          const gr = sp.titel === "Besonderes" && breite(w, s.normal, 8.6) > sp.b - 16 ? 7 : 8.6;
          t(seite, w, xx, zy + zh / 2 + 3, s.normal, gr, F.text);
          xx += sp.b;
        }
      });
      y += hoehe + 14;
      if (rest.length) {
        fuss(seite, u.optionen.kursHinweis ? "Wir sehen uns beim Rückbildungs- oder Babymassagekurs!" : null, null);
        seite = doc.addPage([B, H]);
        seite.drawRectangle({ x: 0, y: 0, width: B, height: H, color: F.papier });
        y = 50;
      }
    }
  }
  const adresse = [d.praxis.name, d.praxis.anschrift].filter(Boolean).join(" · ");
  fuss(seite, u.optionen.kursHinweis ? "Wir sehen uns beim Rückbildungs- oder Babymassagekurs!" : null, adresse);

  // ==================================================== Seite 2: Dein Wachstum
  const kurven: Array<{ g: Messgroesse; titel: string; einheit: string; sym: string; farbe: RGB; stufe: number; text: (v: number) => string }> = [
    ...(u.optionen.kurve ? [{ g: "gewicht" as const, titel: "Gewicht", einheit: "(g)", sym: "gewicht", farbe: F.salbei, stufe: 500, text: (v: number) => g(v) }] : []),
    ...(u.optionen.kurveLaenge ? [{ g: "laenge" as const, titel: "Größe", einheit: "(cm)", sym: "lineal", farbe: F.mohn, stufe: 5, text: (v: number) => zahl(v) }] : []),
    ...(u.optionen.kurveKopfumfang ? [{ g: "kopfumfang" as const, titel: "Kopfumfang", einheit: "(cm)", sym: "kopf", farbe: F.salbei, stufe: 2, text: (v: number) => zahl(v) }] : []),
  ].filter((k) => d.reihen[k.g].length >= 2);
  if (!kurven.length && !u.meilensteine.length) return;

  seite = doc.addPage([B, H]);
  y = kopf(seite);
  mitte(seite, kurven.length ? "Dein Wachstum" : "Deine ersten Meilensteine", y + 40, s.schreib, 42, F.dunkel);
  y += 50;
  trenner(seite, y, 85);
  y += 22;
  if (kurven.length) {
    mitte(seite, kurven.map((k) => k.titel).join(" · ").toUpperCase(), y, s.normal, 9, F.dunkel, 1.8);
    y += 26;
    mitte(seite, "Kleine Schritte, große Entwicklung –", y, s.schreib, 14, F.dunkel);
    mitte(seite, "jeden Tag ein bisschen mehr du.", y + 17, s.schreib, 14, F.dunkel);
    y += 34;
  }
  // Gemeinsame Zeitachse: alle Messtage (gleichmäßig verteilt wie in einem Tagebuch)
  const zuDatum = (lt: number) => new Date(Date.parse(`${d.kind.geburtsdatum}T12:00:00Z`) + (lt - 1) * 86_400_000).toISOString().slice(0, 10);
  const tage = [...new Set(kurven.flatMap((k) => d.reihen[k.g].map((p) => p.lebenstag)))].sort((a, b) => a - b);
  const meilensteinH = u.meilensteine.length ? 30 + u.meilensteine.length * 15 : 0;
  const frei = H - UNTEN - y - meilensteinH;
  const kartenH = kurven.length ? Math.min(150, (frei - (kurven.length - 1) * 12) / kurven.length) : 0;
  for (const k of kurven) {
    kasten(seite, RAND, y, boxB, kartenH, 9);
    // linke Spalte: Symbol, Bezeichnung, Einheit
    const links = 100;
    SYMBOL[k.sym]!(seite, RAND + links / 2 - 13, y + kartenH / 2 - 34, 1.1);
    const tw = breite(k.titel, s.schreib, k.titel.length > 8 ? 16 : 19);
    t(seite, k.titel, RAND + (links - tw) / 2, y + kartenH / 2 + 10, s.schreib, k.titel.length > 8 ? 16 : 19, F.dunkel);
    t(seite, k.einheit, RAND + (links - breite(k.einheit, s.normal, 8.5)) / 2, y + kartenH / 2 + 24, s.normal, 8.5, F.grau);
    seite.drawLine({ start: { x: RAND + links, y: H - y - 12 }, end: { x: RAND + links, y: H - y - kartenH + 12 }, thickness: 0.5, color: F.linie });
    // Diagramm
    const punkte = [...d.reihen[k.g]].sort((a, b) => a.lebenstag - b.lebenstag);
    const werte = punkte.map((p) => p.wert);
    let stufe = k.stufe;
    let yMin = Math.floor((Math.min(...werte) - stufe * 0.3) / stufe) * stufe;
    let yMax = Math.ceil((Math.max(...werte) + stufe * 0.3) / stufe) * stufe;
    if (yMax - yMin < stufe * 2) yMax = yMin + stufe * 2;
    while ((yMax - yMin) / stufe > 6) stufe *= 2;
    yMin = Math.floor(yMin / stufe) * stufe;
    yMax = Math.ceil(yMax / stufe) * stufe;
    const cx0 = RAND + links + 46;
    const cx1 = RAND + boxB - 16;
    const cy0 = y + 14;
    const cy1 = y + kartenH - 26;
    const px = (lt: number) => (tage.length < 2 ? (cx0 + cx1) / 2 : cx0 + (tage.indexOf(lt) / (tage.length - 1)) * (cx1 - cx0));
    const py = (v: number) => cy1 - ((v - yMin) / (yMax - yMin)) * (cy1 - cy0);
    seite.drawLine({ start: { x: cx0 - 6, y: H - cy0 + 4 }, end: { x: cx0 - 6, y: H - cy1 }, thickness: 0.5, color: F.linie });
    for (let v = yMin; v <= yMax + 1e-9; v += stufe) {
      seite.drawLine({ start: { x: cx0 - 6, y: H - py(v) }, end: { x: cx1, y: H - py(v) }, thickness: 0.35, color: F.linie });
      const txt = k.text(v);
      t(seite, txt, cx0 - 12 - breite(txt, s.normal, 7), py(v) + 2.5, s.normal, 7, F.grau);
    }
    // Datumsbeschriftung: bei vielen Messtagen nur jede zweite/dritte
    const jede = Math.ceil(tage.length / 12);
    tage.forEach((lt, i) => {
      if (i % jede && i !== tage.length - 1) return;
      const txt = `${datumDe(zuDatum(lt)).slice(0, 6)}`;
      t(seite, txt, px(lt) - breite(txt, s.normal, 6.8) / 2, cy1 + 14, s.normal, 6.8, F.grau);
    });
    for (let i = 1; i < punkte.length; i++) seite.drawLine({ start: { x: px(punkte[i - 1]!.lebenstag), y: H - py(punkte[i - 1]!.wert) }, end: { x: px(punkte[i]!.lebenstag), y: H - py(punkte[i]!.wert) }, thickness: 1.2, color: k.farbe });
    for (const p of punkte) seite.drawCircle({ x: px(p.lebenstag), y: H - py(p.wert), size: 2.2, color: k.farbe });
    y += kartenH + 12;
  }
  if (u.meilensteine.length) {
    y += 8;
    t(seite, "Deine ersten Meilensteine", RAND + 4, y + 8, s.schreib, 17, F.dunkel);
    y += 24;
    for (const m of u.meilensteine) {
      herz(seite, RAND + 10, y - 3, 8, F.mohn);
      t(seite, `${m.text}${m.datum ? ` (${datumDe(m.datum)})` : ""}`, RAND + 22, y, s.normal, 10, F.text);
      y += 15;
    }
  }
  fuss(seite, "Ein kleines Wunder – mit großen Meilensteinen.", null);
  herz(seite, B / 2, H - 100, 8, F.dunkel);
}
