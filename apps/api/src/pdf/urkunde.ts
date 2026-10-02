/**
 * Kinderurkunde als PDF (A4 hoch, druckfertig). Gestaltung mit Vektorformen (Wellen, Leuchtturm, Rahmen),
 * damit die Datei klein bleibt und scharf druckt. Der persönliche Text steht in einer Kursivschrift.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { datumLang, sternzeichen, wertFuerPerzentile, type Urkunde, type UrkundeZeile } from "@kindkesmoeoen/shared";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { config } from "../config";
import { datumDe, sauber, umbrechen } from "./werkzeug";

export type UrkundePdfDaten = {
  urkunde: Urkunde;
  kind: { vorname: string; nachname: string | null; geburtsdatum: string; geburtszeit: string | null; geschlecht: string | null; geburtsgewicht: number | null; laenge: number | null; kopfumfang: number | null };
  geburtsort: string | null;
  hebamme: string;
  praxis: { name: string; anschrift: string; telefon: string | null; email: string | null };
  /** Gewichtswerte für die Kurve (Lebenstag ab 1) */
  gewichte: Array<{ lebenstag: number; gramm: number }>;
};

const B = 595.28;
const H = 841.89;
const RAND = 56;
const FARBE = {
  salbei: rgb(0.27, 0.4, 0.34),
  text: rgb(0.16, 0.2, 0.18),
  grau: rgb(0.45, 0.48, 0.46),
  hell: rgb(0.8, 0.82, 0.8),
  sand: rgb(0.985, 0.968, 0.93),
  meer: [rgb(0.79, 0.88, 0.92), rgb(0.62, 0.78, 0.86), rgb(0.42, 0.62, 0.74)],
  akzent: rgb(0.76, 0.25, 0.05),
  rot: rgb(0.78, 0.22, 0.2),
};

const g = (x: number) => Math.round(x).toLocaleString("de-DE");
const zahl = (x: number) => x.toLocaleString("de-DE", { maximumFractionDigits: 1 });

function logoLaden(): Buffer | null {
  for (const p of [config.webDist && join(config.webDist, "logo.png"), join(config.datenOrdner, "apps/web/public/logo.png")]) {
    if (p && existsSync(p)) return readFileSync(p);
  }
  return null;
}

type Schriften = { normal: PDFFont; fett: PDFFont; kursiv: PDFFont; zier: PDFFont };

/** Seite mit Hintergrund des gewählten Designs. Gibt den unteren Rand zurück, bis zu dem Inhalt stehen darf. */
function seiteAnlegen(doc: PDFDocument, design: Urkunde["design"]): { seite: PDFPage; unten: number } {
  const seite = doc.addPage([B, H]);
  if (design === "ostsee") {
    seite.drawRectangle({ x: 0, y: 0, width: B, height: H, color: FARBE.sand });
    // drei Wellenbänder am unteren Rand (SVG-Koordinaten: y nach unten, Ursprung oben links an x/y)
    const welle = (hoehe: number, versatz: number) => {
      let d = `M 0 ${hoehe}`;
      for (let x = 0; x <= B + 60; x += 60) d += ` Q ${x + 15 + versatz} ${hoehe - 14} ${x + 30 + versatz} ${hoehe} T ${x + 60 + versatz} ${hoehe}`;
      return `${d} L ${B} 120 L 0 120 Z`;
    };
    FARBE.meer.forEach((f, i) => seite.drawSvgPath(welle(30 + i * 22, i * 18), { x: 0, y: 120, color: f, borderWidth: 0 }));
    return { seite, unten: 150 };
  }
  if (design === "leuchtturm") {
    seite.drawRectangle({ x: 0, y: 0, width: B, height: H, color: rgb(0.975, 0.98, 0.985) });
    seite.drawRectangle({ x: 0, y: 0, width: B, height: 30, color: FARBE.meer[0] });
    // Leuchtturm unten rechts: rot-weiß gestreifter Turm, Galerie, Laterne mit Lichtkegel
    const x0 = B - 70;
    const y0 = 30;
    seite.drawSvgPath("M -40 -4 L 40 -4 L 28 0 L -28 0 Z", { x: x0, y: y0 + 4, color: rgb(0.55, 0.6, 0.55), borderWidth: 0 });
    for (let i = 0; i < 5; i++) {
      const breiteU = 12 - i * 1.1;
      const breiteO = 12 - (i + 1) * 1.1;
      seite.drawSvgPath(`M ${-breiteU} 0 L ${breiteU} 0 L ${breiteO} -16 L ${-breiteO} -16 Z`, { x: x0, y: y0 + i * 16, color: i % 2 ? rgb(1, 1, 1) : FARBE.rot, borderColor: FARBE.rot, borderWidth: 0.5 });
    }
    seite.drawRectangle({ x: x0 - 10, y: y0 + 80, width: 20, height: 3, color: FARBE.text });
    seite.drawRectangle({ x: x0 - 6, y: y0 + 83, width: 12, height: 10, color: rgb(1, 0.86, 0.45), borderColor: FARBE.text, borderWidth: 0.6 });
    seite.drawSvgPath("M -9 0 L 0 -6 L 9 0 Z", { x: x0, y: y0 + 93, color: FARBE.rot, borderWidth: 0 });
    seite.drawSvgPath("M 0 0 L -90 -13 L -90 13 Z", { x: x0 - 6, y: y0 + 88, color: rgb(1, 0.93, 0.7), opacity: 0.55, borderWidth: 0 });
    return { seite, unten: 130 };
  }
  // schlicht: doppelter Rahmen
  seite.drawRectangle({ x: 22, y: 22, width: B - 44, height: H - 44, borderColor: FARBE.salbei, borderWidth: 1.6 });
  seite.drawRectangle({ x: 28, y: 28, width: B - 56, height: H - 56, borderColor: FARBE.salbei, borderWidth: 0.5 });
  return { seite, unten: 60 };
}

export async function urkundePdf(d: UrkundePdfDaten): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(sauber(d.urkunde.titel));
  doc.setAuthor(sauber(d.praxis.name));
  doc.setCreator("Kindkesmöön Praxis-App");
  const s: Schriften = {
    normal: await doc.embedFont(StandardFonts.Helvetica),
    fett: await doc.embedFont(StandardFonts.HelveticaBold),
    kursiv: await doc.embedFont(StandardFonts.TimesRomanItalic),
    zier: await doc.embedFont(StandardFonts.TimesRomanBoldItalic),
  };
  const logoDaten = logoLaden();
  const logo: PDFImage | null = logoDaten ? await doc.embedPng(logoDaten).catch(() => null) : null;
  const u = d.urkunde;

  let { seite, unten } = seiteAnlegen(doc, u.design);
  let y = 46; // von oben
  const fussHoehe = 40;
  const platz = (h: number) => {
    if (y + h > H - unten - fussHoehe) {
      ({ seite, unten } = seiteAnlegen(doc, u.design));
      y = 56;
    }
  };
  const text = (t: string, x: number, schrift: PDFFont, groesse: number, farbe: RGB = FARBE.text) => seite.drawText(sauber(t), { x, y: H - y, size: groesse, font: schrift, color: farbe });
  const mitte = (t: string, schrift: PDFFont, groesse: number, farbe: RGB = FARBE.text) => text(t, (B - schrift.widthOfTextAtSize(sauber(t), groesse)) / 2, schrift, groesse, farbe);

  // ---------------------------------------------------- Kopf
  if (logo) {
    const h = 64;
    const w = (logo.width / logo.height) * h;
    seite.drawImage(logo, { x: (B - w) / 2, y: H - y - h, width: w, height: h });
    y += h + 28;
  } else y += 24;
  mitte(u.titel, s.zier, 30, FARBE.salbei);
  y += 20;
  mitte(`geboren am ${datumLang(d.kind.geburtsdatum)}${d.kind.geburtszeit ? ` um ${d.kind.geburtszeit.slice(0, 5)} Uhr` : ""}${d.geburtsort ? ` in ${d.geburtsort}` : ""}`, s.normal, 10.5, FARBE.grau);
  y += 26;

  // ---------------------------------------------------- persönlicher Text
  const textBreite = B - 2 * (RAND + 14);
  for (const zeile of umbrechen(u.text, s.kursiv, 13.5, textBreite)) {
    platz(18);
    text(zeile, RAND + 14, s.kursiv, 13.5);
    y += 18.5;
  }
  y += 12;

  // ---------------------------------------------------- Geburtsdaten
  const daten: Array<[string, string]> = [
    ["Geburtstag", datumDe(d.kind.geburtsdatum)],
    ...(d.kind.geburtszeit ? [["Uhrzeit", `${d.kind.geburtszeit.slice(0, 5)} Uhr`] as [string, string]] : []),
    ...(d.geburtsort ? [["Geburtsort", d.geburtsort] as [string, string]] : []),
    ...(d.kind.geburtsgewicht ? [["Gewicht", `${g(d.kind.geburtsgewicht)} g`] as [string, string]] : []),
    ...(d.kind.laenge ? [["Länge", `${zahl(d.kind.laenge)} cm`] as [string, string]] : []),
    ...(d.kind.kopfumfang ? [["Kopfumfang", `${zahl(d.kind.kopfumfang)} cm`] as [string, string]] : []),
    ...(u.optionen.sternzeichen ? [["Sternzeichen", sternzeichen(d.kind.geburtsdatum)] as [string, string]] : []),
  ];
  const spalten = Math.min(4, daten.length);
  const zellBreite = (B - 2 * RAND) / spalten;
  for (let i = 0; i < daten.length; i += spalten) {
    platz(40);
    seite.drawRectangle({ x: RAND, y: H - y - 34, width: B - 2 * RAND, height: 36, color: rgb(1, 1, 1), opacity: 0.75, borderColor: FARBE.hell, borderWidth: 0.6 });
    daten.slice(i, i + spalten).forEach(([k, v], j) => {
      const x = RAND + j * zellBreite + 10;
      seite.drawText(sauber(k), { x, y: H - y - 13, size: 8, font: s.normal, color: FARBE.grau });
      seite.drawText(sauber(v), { x, y: H - y - 27, size: 11.5, font: s.fett, color: FARBE.salbei });
    });
    y += 44;
  }
  y += 8;

  // ---------------------------------------------------- Tabelle aus der Hebammenzeit
  if (u.zeilen.length) {
    const hat = (f: keyof UrkundeZeile) => u.zeilen.some((z) => z[f] != null && z[f] !== "");
    const spaltenDef: Array<{ titel: string; breite: number; wert: (z: UrkundeZeile) => string; rechts?: boolean }> = [
      { titel: "Datum", breite: 70, wert: (z) => datumDe(z.datum) },
      { titel: "Lebenstag", breite: 58, wert: (z) => String(z.lebenstag), rechts: true },
      ...(hat("gewicht") ? [{ titel: "Gewicht", breite: 62, wert: (z: UrkundeZeile) => (z.gewicht ? `${g(z.gewicht)} g` : ""), rechts: true }] : []),
      ...(hat("laenge") ? [{ titel: "Länge", breite: 52, wert: (z: UrkundeZeile) => (z.laenge ? `${zahl(z.laenge)} cm` : ""), rechts: true }] : []),
      ...(hat("kopfumfang") ? [{ titel: "Kopfumfang", breite: 66, wert: (z: UrkundeZeile) => (z.kopfumfang ? `${zahl(z.kopfumfang)} cm` : ""), rechts: true }] : []),
    ];
    const rest = B - 2 * RAND - spaltenDef.reduce((a, x) => a + x.breite, 0);
    spaltenDef.push({ titel: "Besonderes", breite: rest, wert: (z) => z.besonderes ?? "" });
    platz(40);
    seite.drawText("Aus unserer gemeinsamen Zeit", { x: RAND, y: H - y, size: 13, font: s.zier, color: FARBE.salbei });
    y += 12;
    const zeile = (werte: string[], schrift: PDFFont, farbe: RGB, hintergrund?: boolean) => {
      platz(17);
      if (hintergrund) seite.drawRectangle({ x: RAND, y: H - y - 15, width: B - 2 * RAND, height: 17, color: rgb(0.9, 0.93, 0.9), opacity: 0.85 });
      let x = RAND;
      werte.forEach((w, i) => {
        const sp = spaltenDef[i]!;
        const t = sauber(w);
        const breite = schrift.widthOfTextAtSize(t, 9.5);
        seite.drawText(t, { x: sp.rechts ? x + sp.breite - 8 - breite : x + 6, y: H - y - 11, size: 9.5, font: schrift, color: farbe });
        x += sp.breite;
      });
      y += 17;
      seite.drawLine({ start: { x: RAND, y: H - y + 1 }, end: { x: B - RAND, y: H - y + 1 }, thickness: 0.3, color: FARBE.hell });
    };
    zeile(spaltenDef.map((x) => x.titel), s.fett, FARBE.salbei, true);
    for (const z of u.zeilen) zeile(spaltenDef.map((x) => x.wert(z)), s.normal, FARBE.text);
    y += 16;
  }

  // ---------------------------------------------------- Gewichtskurve
  if (u.optionen.kurve && d.gewichte.length >= 2) {
    // Höhe an den Platz auf der Seite anpassen (110–150 pt), sonst neue Seite
    const frei = H - unten - fussHoehe - y - 44;
    const hoehe = frei >= 110 ? Math.min(150, frei) : 150;
    platz(hoehe + 44);
    seite.drawText("Dein Gewicht", { x: RAND, y: H - y, size: 13, font: s.zier, color: FARBE.salbei });
    y += 10;
    const links = RAND + 40;
    const breite = B - RAND - links - 26;
    const maxTag = Math.max(14, Math.ceil(Math.max(...d.gewichte.map((p) => p.lebenstag)) / 7) * 7);
    const ref = u.optionen.perzentilen
      ? [3, 50, 97].map((p) => ({ p, werte: Array.from({ length: maxTag }, (_, i) => wertFuerPerzentile("gewicht", i, p, d.kind.geschlecht)) }))
      : [];
    const alle = [...d.gewichte.map((p) => p.gramm), ...ref.flatMap((r) => r.werte)];
    const yMin = Math.floor((Math.min(...alle) - 100) / 500) * 500;
    const yMax = Math.ceil((Math.max(...alle) + 100) / 500) * 500;
    const px = (t: number) => links + ((t - 1) / (maxTag - 1)) * breite;
    const py = (v: number) => H - y - hoehe + ((v - yMin) / (yMax - yMin)) * hoehe;
    seite.drawRectangle({ x: links, y: H - y - hoehe, width: breite, height: hoehe, color: rgb(1, 1, 1), opacity: 0.7, borderColor: FARBE.hell, borderWidth: 0.6 });
    for (let v = yMin; v <= yMax; v += 500) {
      seite.drawLine({ start: { x: links, y: py(v) }, end: { x: links + breite, y: py(v) }, thickness: 0.3, color: FARBE.hell });
      if ((v - yMin) % 1000 === 0) seite.drawText(`${zahl(v / 1000)} kg`, { x: RAND - 4, y: py(v) - 3, size: 7.5, font: s.normal, color: FARBE.grau });
    }
    for (const r of ref) {
      for (let i = 1; i < r.werte.length; i++) seite.drawLine({ start: { x: px(i), y: py(r.werte[i - 1]!) }, end: { x: px(i + 1), y: py(r.werte[i]!) }, thickness: r.p === 50 ? 0.8 : 0.5, color: rgb(0.7, 0.72, 0.7), dashArray: r.p === 50 ? undefined : [2, 2] });
      seite.drawText(`P${r.p}`, { x: links + breite + 3, y: py(r.werte.at(-1)!) - 3, size: 6.5, font: s.normal, color: FARBE.grau });
    }
    const pkt = [...d.gewichte].sort((a, b) => a.lebenstag - b.lebenstag);
    for (let i = 1; i < pkt.length; i++) seite.drawLine({ start: { x: px(pkt[i - 1]!.lebenstag), y: py(pkt[i - 1]!.gramm) }, end: { x: px(pkt[i]!.lebenstag), y: py(pkt[i]!.gramm) }, thickness: 1.6, color: FARBE.akzent });
    for (const p of pkt) seite.drawCircle({ x: px(p.lebenstag), y: py(p.gramm), size: 2.6, color: FARBE.akzent, borderColor: rgb(1, 1, 1), borderWidth: 0.8 });
    y += hoehe + 12;
    for (const t of [1, ...Array.from({ length: Math.floor(maxTag / 7) }, (_, i) => (i + 1) * 7)]) {
      const w = s.normal.widthOfTextAtSize(String(t), 7);
      seite.drawText(String(t), { x: px(t) - w / 2, y: H - y + 2, size: 7, font: s.normal, color: FARBE.grau });
    }
    y += 4;
    seite.drawText("Lebenstag", { x: links + breite / 2 - 18, y: H - y - 6, size: 7, font: s.normal, color: FARBE.grau });
    y += 20;
  }

  // ---------------------------------------------------- Meilensteine
  if (u.meilensteine.length) {
    platz(36);
    seite.drawText("Deine ersten Meilensteine", { x: RAND, y: H - y, size: 13, font: s.zier, color: FARBE.salbei });
    y += 18;
    for (const m of u.meilensteine) {
      platz(16);
      seite.drawCircle({ x: RAND + 4, y: H - y + 3.5, size: 2.2, color: FARBE.akzent });
      text(`${m.text}${m.datum ? ` (${datumDe(m.datum)})` : ""}`, RAND + 14, s.normal, 10.5);
      y += 16;
    }
    y += 8;
  }

  // ---------------------------------------------------- Unterschrift der Hebamme
  if (u.optionen.unterschrift) {
    platz(52);
    y += 22;
    const x = B - RAND - 190;
    seite.drawText(sauber(d.hebamme), { x: x + 6, y: H - y, size: 20, font: s.zier, color: FARBE.salbei });
    y += 8;
    seite.drawLine({ start: { x, y: H - y }, end: { x: x + 190, y: H - y }, thickness: 0.6, color: FARBE.grau });
    y += 11;
    seite.drawText(sauber(`Hebamme · ${d.praxis.name}`), { x, y: H - y, size: 8, font: s.normal, color: FARBE.grau });
  }

  // ---------------------------------------------------- Fuß (auf jeder Seite)
  const fuss = [d.praxis.name, d.praxis.anschrift, d.praxis.telefon, d.praxis.email].filter(Boolean).join(" · ");
  for (const p of doc.getPages()) {
    const pu = u.design === "ostsee" ? 150 : u.design === "leuchtturm" ? 130 : 60;
    const zeile = (t: string, abstand: number, schrift: PDFFont, groesse: number) => {
      const tt = sauber(t);
      p.drawText(tt, { x: (B - schrift.widthOfTextAtSize(tt, groesse)) / 2, y: pu + abstand, size: groesse, font: schrift, color: FARBE.grau });
    };
    if (u.optionen.kursHinweis) zeile("Wir sehen uns beim Rückbildungs- oder Babymassagekurs!", 24, s.kursiv, 10.5);
    zeile(fuss, 10, s.normal, 7.5);
  }
  return doc.save();
}
