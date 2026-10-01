/**
 * Abrechnungslogik für einen Besuch nach dem Hebammenhilfevertrag (Anlage 1.1).
 *
 * Alle Zahlen (Beträge, Kontingente, Zuschlagszeiten, Feiertage) kommen aus dem Regelwerk (regelwerk/*.json),
 * damit sie in der App pflegbar bleiben. Hier steckt nur die Logik:
 *  - Leistungsgruppe (GPOS-Stamm) aus Leistungstyp, Lebenstag bzw. SSW
 *  - 5-Minuten-Einheiten, Zuschlag je Einheit (Nacht, Samstag ab 12 Uhr, Sonn- und Feiertage)
 *  - Kontingente (Kontakte/Einheiten je Kontakt, Tag und gesamt)
 *  - Materialpauschalen
 */
import type { WegegeldRegel } from "./tour";

export type Leistungstyp = "schwangerschaft" | "vorsorge" | "aufklaerung" | "stillvorbereitung" | "wochenbett";
export type Leistungsart = 1 | 2 | 3 | 4;

export const LEISTUNGSTYP_LABEL: Record<Leistungstyp, string> = {
  schwangerschaft: "Hilfeleistung Schwangerschaft",
  vorsorge: "Vorsorgeuntersuchung",
  aufklaerung: "Aufklärungsgespräch Geburtsort",
  stillvorbereitung: "Individuelle Stillvorbereitung",
  wochenbett: "Wochenbett / Stillzeit",
};
export const LEISTUNGSTYPEN = Object.keys(LEISTUNGSTYP_LABEL) as Leistungstyp[];

export const LEISTUNGSART_LABEL: Record<Leistungsart, string> = {
  1: "Hausbesuch",
  2: "In der Praxis",
  3: "Video",
  4: "Telefon",
};

/** Material, das je Leistungstyp auf dem Formular angekreuzt werden kann. */
export const MATERIAL_JE_TYP: Record<Leistungstyp, string[]> = {
  schwangerschaft: ["60100", "60300", "60400", "60500", "60700"],
  vorsorge: ["60200", "60300", "60400", "60500", "60700"],
  aufklaerung: [],
  stillvorbereitung: ["60600"],
  wochenbett: ["60300", "61100", "61400", "61500", "61600", "61700"],
};

/** Material, das je Betreuung nur einmal abgerechnet werden darf. */
const MATERIAL_EINMALIG = new Set(["60400", "60600", "60700", "61100", "61200", "61300", "61400", "61600", "61700"]);

// ------------------------------------------------------------------ Regelwerk-Typen (Ausschnitt)
export type RwPosition = {
  gpos: string;
  gruppe: string;
  bezeichnung: string;
  kurztext: string;
  betrag: number | null;
  einheit: string;
  formular: string | null;
  quittierungspflichtig: boolean;
  befristung?: { gueltig_von: string; gueltig_bis: string };
};
type Grenzen = { kontakte_pro_tag?: number; einheiten_pro_kontakt?: number; einheiten_pro_tag?: number };
export type RwKontingent = Grenzen & {
  id: string;
  name: string;
  verhalten_bei_ueberschreitung: "anordnung" | "sperre" | "hinweis";
  einheiten_pro_kontakt_video?: number;
  davon_video_max?: number;
  video_nur_zweiter_kontakt?: boolean;
  telefon?: Grenzen;
  kontakte_gesamt?: number | string | null;
  kontakttage_gesamt?: number;
  einheiten_gesamt?: number;
  mehrling_zusatz_einheiten?: number;
  erste_tage?: { bis_lebenstag: number; auch_tag_erster_hausbesuch: boolean; leistungsart: string; einheiten_pro_kontakt: number; einheiten_pro_tag: number };
  zeitraum?: { ssw_bis_exklusiv?: number } | null;
};
export type RwFormularSpalte = { label: string; gruppen: string[]; eintrag: "ziffer" | "kreuz"; ziffern?: string };
export type RegelwerkDaten = {
  id: string;
  positionen: RwPosition[];
  kontingente: RwKontingent[];
  zuschlaege: { nacht: { von: string; bis: string }; samstag_ab: string; sonntag: boolean; feiertage: boolean };
  feiertage: Array<{ name: string; regel: string }>;
  formulare: Record<string, unknown>;
  wegegeld?: WegegeldRegel;
};

// ------------------------------------------------------------------ Eingaben und Ergebnis
export type BesuchEingabe = {
  datum: string; // JJJJ-MM-TT
  von: string; // HH:MM
  bis: string; // HH:MM (kleiner als "von" = über Mitternacht)
  typ: Leistungstyp;
  art: Leistungsart;
  material: string[];
};

/** Bereits gespeicherte Besuche derselben Betreuung (alle Hebammen). */
export type FruehererBesuch = {
  id?: string;
  datum: string;
  von: string;
  art: Leistungsart;
  stamm: string | null;
  einheiten: number; // abgerechnete Einheiten
  material: string[]; // abgerechnete Materialpositionen
};

export type Kontext = {
  geburtsdatum: string | null;
  et: string | null;
  anzahlKinder: number;
  fruehereBesuche: FruehererBesuch[];
};

export type Zeile = {
  gpos: string;
  bezeichnung: string;
  menge: number;
  einheit: string;
  einzelbetrag: number;
  betrag: number;
  zuschlag: boolean;
  formular: string | null;
  quittierungspflichtig: boolean;
  automatisch?: boolean;
};

export type Hinweis = { stufe: "info" | "warnung" | "fehler"; text: string };

export type Formularzeile = { formular: string; spalte: string; eintrag: string } | null;

export type Ergebnis = {
  stamm: string | null;
  lebenstag: number | null;
  ssw: string | null;
  einheiten: number;
  einheitenAbrechenbar: number;
  zeilen: Zeile[];
  summe: number;
  hinweise: Hinweis[];
  formularzeile: Formularzeile;
  materialAbgerechnet: string[];
};

// ------------------------------------------------------------------ Datum und Zeit
const MS_TAG = 86_400_000;
const tagesNummer = (iso: string) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / MS_TAG);
const isoAusNummer = (n: number) => new Date(n * MS_TAG).toISOString().slice(0, 10);
export const tageDiff = (von: string, bis: string) => tagesNummer(bis) - tagesNummer(von);
const minuten = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Lebenstag des Kindes (Tag der Geburt = 1. Lebenstag, § 5 Anlage 1.1). */
export const lebenstag = (geburtsdatum: string, datum: string) => tageDiff(geburtsdatum, datum) + 1;

/** Schwangerschaftswoche als "SSW+Tage" (z. B. 36+4) aus dem errechneten Termin (40+0). */
export function sswAusEt(et: string, datum: string): { wochen: number; tage: number; text: string } {
  const schwangerTage = 280 - tageDiff(datum, et);
  const wochen = Math.floor(schwangerTage / 7);
  const tage = schwangerTage - wochen * 7;
  return { wochen, tage, text: `${wochen}+${tage}` };
}

/** Ostersonntag (gregorianisch, anonymer Algorithmus). */
function ostersonntag(jahr: number): string {
  const a = jahr % 19, b = Math.floor(jahr / 100), c = jahr % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31), tag = ((h + l - 7 * m + 114) % 31) + 1;
  return `${jahr}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
}

export function feiertage(jahr: number, regeln: RegelwerkDaten["feiertage"]): Map<string, string> {
  const ostern = tagesNummer(ostersonntag(jahr));
  const ergebnis = new Map<string, string>();
  for (const r of regeln) {
    const iso = r.regel.startsWith("ostern") ? isoAusNummer(ostern + Number(r.regel.slice(6) || 0)) : `${jahr}-${r.regel}`;
    ergebnis.set(iso, r.name);
  }
  return ergebnis;
}

function zuschlagFuer(datum: string, minute: number, rw: RegelwerkDaten): boolean {
  const z = rw.zuschlaege;
  const wochentag = new Date(tagesNummer(datum) * MS_TAG).getUTCDay(); // 0 = Sonntag
  if (z.sonntag && wochentag === 0) return true;
  if (z.feiertage && feiertage(+datum.slice(0, 4), rw.feiertage).has(datum)) return true;
  if (wochentag === 6 && minute >= minuten(z.samstag_ab)) return true;
  const nachtVon = minuten(z.nacht.von), nachtBis = minuten(z.nacht.bis);
  return minute >= nachtVon || minute < nachtBis;
}

// ------------------------------------------------------------------ Hilfsfunktionen
function stammErmitteln(e: BesuchEingabe, k: Kontext, hinweise: Hinweis[]): { stamm: string | null; lt: number | null } {
  const lt = k.geburtsdatum ? lebenstag(k.geburtsdatum, e.datum) : null;
  if (e.typ === "wochenbett") {
    if (lt === null) {
      hinweise.push({ stufe: "fehler", text: "Für Wochenbett-Leistungen bitte zuerst das Kind mit Geburtsdatum erfassen." });
      return { stamm: null, lt };
    }
    if (lt < 1) {
      hinweise.push({ stufe: "fehler", text: "Das Besuchsdatum liegt vor der Geburt." });
      return { stamm: null, lt };
    }
    if (lt <= 10) return { stamm: "301", lt };
    if (lt <= 84) return { stamm: "303", lt };
    if (tageDiff(k.geburtsdatum!, e.datum) > 274) {
      hinweise.push({ stufe: "warnung", text: "Nach dem 9. Lebensmonat nur bei fortbestehender Stillzeit abrechenbar (306XX)." });
    }
    return { stamm: "306", lt };
  }
  if (lt !== null && lt >= 1) {
    hinweise.push({ stufe: "fehler", text: `${LEISTUNGSTYP_LABEL[e.typ]} ist nach der Geburt nicht abrechenbar.` });
    return { stamm: null, lt };
  }
  return { stamm: { schwangerschaft: "101", vorsorge: "102", aufklaerung: "103", stillvorbereitung: "104" }[e.typ], lt };
}

const kontingentId = (stamm: string, art: Leistungsart) => (stamm === "101" ? (art === 4 ? "101-tel" : "101-live") : stamm);

function position(rw: RegelwerkDaten, gpos: string, datum: string): RwPosition | undefined {
  const p = rw.positionen.find((x) => x.gpos === gpos);
  if (p?.befristung && (datum < p.befristung.gueltig_von || datum > p.befristung.gueltig_bis)) return undefined;
  return p;
}

function formularzeileFinden(rw: RegelwerkDaten, stamm: string, art: Leistungsart): Formularzeile {
  for (const [nr, f] of Object.entries(rw.formulare)) {
    if (nr === "gemeinsam") continue;
    const spalten = (f as { spalten: RwFormularSpalte[] }).spalten;
    const s = spalten.find((sp) => sp.gruppen.some((g) => g.startsWith(stamm)));
    if (s) {
      if (s.eintrag === "ziffer" && s.ziffern && !s.ziffern.includes(String(art))) return null; // z. B. Telefon seit 04/2026 nicht auf dem Formular
      return { formular: nr, spalte: s.label, eintrag: s.eintrag === "ziffer" ? String(art) : "X" };
    }
  }
  return null;
}

const runden = (x: number) => Math.round(x * 100) / 100;

// ------------------------------------------------------------------ Hauptfunktion
export function besuchAbrechnen(e: BesuchEingabe, k: Kontext, rw: RegelwerkDaten): Ergebnis {
  const hinweise: Hinweis[] = [];
  const { stamm, lt } = stammErmitteln(e, k, hinweise);
  const ssw = k.et && e.typ !== "wochenbett" ? sswAusEt(k.et, e.datum) : null;
  const leer: Ergebnis = { stamm, lebenstag: lt, ssw: ssw?.text ?? null, einheiten: 0, einheitenAbrechenbar: 0, zeilen: [], summe: 0, hinweise, formularzeile: null, materialAbgerechnet: [] };

  // Dauer
  const start = minuten(e.von);
  let ende = minuten(e.bis);
  if (ende <= start) ende += 1440;
  const einheiten = Math.floor((ende - start) / 5);
  leer.einheiten = einheiten;
  if (!stamm) return leer;
  if (einheiten < 1) {
    hinweise.push({ stufe: "fehler", text: "Die Dauer muss mindestens 5 Minuten betragen." });
    return leer;
  }

  // Leistungsart
  if (["102", "103", "104"].includes(stamm) && (e.art === 3 || e.art === 4)) {
    hinweise.push({ stufe: "fehler", text: `${LEISTUNGSTYP_LABEL[e.typ]} ist nur als Hausbesuch oder in der Praxis abrechenbar.` });
    return leer;
  }
  if (stamm === "103" && ssw && ssw.wochen >= 37) {
    hinweise.push({ stufe: "fehler", text: `Aufklärungsgespräch nur vor der 38. SSW (heute SSW ${ssw.text}).` });
    return leer;
  }

  const kont = rw.kontingente.find((x) => x.id === kontingentId(stamm, e.art));
  const istTel = e.art === 4;
  const grenzen: Grenzen = istTel && kont?.telefon ? kont.telefon : (kont ?? {});
  const mehrling = (e.art === 1 || e.art === 2) && kont?.mehrling_zusatz_einheiten ? Math.max(0, k.anzahlKinder - 1) * kont.mehrling_zusatz_einheiten : 0;

  // Frühere Kontakte desselben Kontingents (Telefon wird je Tag getrennt gezählt)
  const gleicheGruppe = k.fruehereBesuche.filter((b) => b.stamm !== null && kontingentId(b.stamm, b.art) === kontingentId(stamm, e.art));
  const gleicherTag = gleicheGruppe.filter((b) => b.datum === e.datum && (b.art === 4) === istTel);

  // Erste Lebenstage bzw. Tag des ersten Hausbesuchs (301X1: bis 120 Minuten)
  let maxKontakt = (e.art === 3 ? kont?.einheiten_pro_kontakt_video : undefined) ?? grenzen.einheiten_pro_kontakt ?? Infinity;
  let maxTag = grenzen.einheiten_pro_tag ?? Infinity;
  const et = kont?.erste_tage;
  if (et && String(e.art) === et.leistungsart && lt !== null) {
    const ersterHausbesuch = !k.fruehereBesuche.some((b) => b.art === 1 && (b.stamm === "301" || b.stamm === "303") && b.datum < e.datum);
    if (lt <= et.bis_lebenstag || (et.auch_tag_erster_hausbesuch && ersterHausbesuch)) {
      maxKontakt = et.einheiten_pro_kontakt;
      maxTag = et.einheiten_pro_tag;
    }
  }
  maxKontakt += mehrling;
  maxTag += mehrling;

  // Kontakte pro Tag
  if (grenzen.kontakte_pro_tag !== undefined && gleicherTag.length >= grenzen.kontakte_pro_tag) {
    hinweise.push({ stufe: "fehler", text: `Höchstens ${grenzen.kontakte_pro_tag} ${istTel ? "Telefonkontakt(e)" : "Kontakt(e)"} pro Tag (${kont?.name}).` });
    return leer;
  }
  if (e.art === 3 && kont?.video_nur_zweiter_kontakt && !gleicherTag.some((b) => b.art !== 3)) {
    hinweise.push({ stufe: "fehler", text: "Videobetreuung ist an diesem Tag nur als zweiter Kontakt abrechenbar." });
    return leer;
  }
  if (e.art === 3 && kont?.davon_video_max !== undefined && gleicherTag.filter((b) => b.art === 3).length >= kont.davon_video_max) {
    hinweise.push({ stufe: "fehler", text: `Höchstens ${kont.davon_video_max} Videokontakt pro Tag.` });
    return leer;
  }

  // Gesamtkontingente
  const verhalten = kont?.verhalten_bei_ueberschreitung ?? "hinweis";
  const ueberschritten = (text: string) => {
    if (verhalten === "sperre") hinweise.push({ stufe: "fehler", text });
    else hinweise.push({ stufe: "warnung", text: `${text} Weitere Leistungen nur mit ärztlicher Anordnung.` });
  };
  if (typeof kont?.kontakte_gesamt === "number") {
    const bisher = gleicheGruppe.length;
    if (bisher >= kont.kontakte_gesamt) {
      ueberschritten(`${kont.name}: Kontingent von ${kont.kontakte_gesamt} Kontakten ist ausgeschöpft.`);
      if (verhalten === "sperre") return leer;
    } else if (kont.kontakte_gesamt - bisher <= 2) {
      hinweise.push({ stufe: "info", text: `${kont.name}: Kontakt ${bisher + 1} von ${kont.kontakte_gesamt}.` });
    }
  }
  if (kont?.kontakttage_gesamt) {
    const tage = new Set(gleicheGruppe.map((b) => b.datum));
    if (!tage.has(e.datum)) {
      if (tage.size >= kont.kontakttage_gesamt) ueberschritten(`${kont.name}: Kontingent von ${kont.kontakttage_gesamt} Kontakttagen ist ausgeschöpft.`);
      else if (kont.kontakttage_gesamt - tage.size <= 2) hinweise.push({ stufe: "info", text: `${kont.name}: Kontakttag ${tage.size + 1} von ${kont.kontakttage_gesamt}.` });
    }
  }

  // Abrechenbare Einheiten
  const bisherTag = gleicherTag.reduce((s, b) => s + b.einheiten, 0);
  let restGesamt = Infinity;
  if (kont?.einheiten_gesamt) restGesamt = Math.max(0, kont.einheiten_gesamt - gleicheGruppe.reduce((s, b) => s + b.einheiten, 0));
  const abrechenbar = Math.max(0, Math.min(einheiten, maxKontakt, maxTag - bisherTag, restGesamt));
  if (abrechenbar < einheiten) {
    const zuviel = (einheiten - abrechenbar) * 5;
    hinweise.push({
      stufe: "warnung",
      text: `${zuviel} Minuten über der abrechenbaren Höchstdauer (${Math.min(maxKontakt, maxTag) * 5} Min.${bisherTag ? `, heute bereits ${bisherTag * 5} Min.` : ""}). Mehr nur mit ärztlicher Anordnung.`,
    });
  }

  // Zeilen je Zuschlagsabschnitt (maßgeblich ist der Beginn jeder 5-Minuten-Einheit)
  const zeilen: Zeile[] = [];
  for (let i = 0; i < abrechenbar; i++) {
    const m = start + i * 5;
    const tag = isoAusNummer(tagesNummer(e.datum) + Math.floor(m / 1440));
    const mitZuschlag = zuschlagFuer(tag, m % 1440, rw);
    let gpos = `${stamm}${mitZuschlag ? 1 : 0}${e.art}`;
    let p = position(rw, gpos, e.datum);
    let zuschlag = mitZuschlag;
    if (!p && mitZuschlag) {
      gpos = `${stamm}0${e.art}`; // keine Zuschlagsvariante (z. B. Vorsorge, Telefon)
      p = position(rw, gpos, e.datum);
      zuschlag = false;
    }
    if (!p) {
      hinweise.push({ stufe: "fehler", text: `Keine Gebührenposition ${gpos} im Regelwerk ${rw.id}.` });
      return { ...leer, hinweise };
    }
    const letzte = zeilen.at(-1);
    if (letzte && letzte.gpos === gpos) {
      letzte.menge += 1;
    } else {
      zeilen.push({ gpos, bezeichnung: p.bezeichnung, menge: 1, einheit: "5min", einzelbetrag: p.betrag ?? 0, betrag: 0, zuschlag, formular: p.formular, quittierungspflichtig: p.quittierungspflichtig });
    }
  }

  // Material
  const erlaubt = new Set(MATERIAL_JE_TYP[e.typ]);
  const bisherMaterial = new Set(k.fruehereBesuche.flatMap((b) => b.material));
  const material = [...new Set(e.material)].filter((g) => {
    if (!erlaubt.has(g)) {
      hinweise.push({ stufe: "warnung", text: `Material ${g} passt nicht zu dieser Leistung und wird nicht abgerechnet.` });
      return false;
    }
    if (MATERIAL_EINMALIG.has(g) && bisherMaterial.has(g)) {
      hinweise.push({ stufe: "warnung", text: `Materialpauschale ${g} wurde in dieser Betreuung bereits abgerechnet (nur einmalig).` });
      return false;
    }
    return true;
  });
  if (material.includes("60100") && material.includes("60200")) {
    hinweise.push({ stufe: "warnung", text: "60100 ist nicht neben 60200 abrechenbar; 60100 entfällt." });
    material.splice(material.indexOf("60100"), 1);
  }
  if (e.art === 3 || e.art === 4) {
    if (material.length) hinweise.push({ stufe: "warnung", text: "Bei Video- und Telefonkontakten wird kein Material abgerechnet." });
    material.length = 0;
  }
  // Materialpauschale Wochenbett lang/kurz beim ersten Hausbesuch im Wochenbett (automatisch)
  if ((stamm === "301" || stamm === "303") && e.art === 1 && !bisherMaterial.has("61200") && !bisherMaterial.has("61300") && k.geburtsdatum) {
    material.push(tageDiff(k.geburtsdatum, e.datum) <= 4 ? "61200" : "61300");
  }
  for (const g of material) {
    const p = position(rw, g, e.datum);
    if (!p) continue;
    zeilen.push({ gpos: g, bezeichnung: p.bezeichnung, menge: 1, einheit: "pauschal", einzelbetrag: p.betrag ?? 0, betrag: 0, zuschlag: false, formular: p.formular, quittierungspflichtig: p.quittierungspflichtig, automatisch: g === "61200" || g === "61300" });
  }

  for (const z of zeilen) z.betrag = runden(z.menge * z.einzelbetrag);
  if (istTel) hinweise.push({ stufe: "info", text: "Telefonkurzberatung: keine Unterschrift auf der Versichertenbestätigung nötig (seit 01.04.2026 nicht auf dem Formular)." });

  return {
    stamm,
    lebenstag: lt,
    ssw: ssw?.text ?? null,
    einheiten,
    einheitenAbrechenbar: abrechenbar,
    zeilen,
    summe: runden(zeilen.reduce((s, z) => s + z.betrag, 0)),
    hinweise,
    formularzeile: formularzeileFinden(rw, stamm, e.art),
    materialAbgerechnet: material,
  };
}

// ------------------------------------------------------------------ Kontingentübersicht je Betreuung
export type KontingentStand = { id: string; name: string; genutzt: number; maximum: number; einheit: "Kontakte" | "Kontakttage" };

export function kontingentStand(besuche: FruehererBesuch[], rw: RegelwerkDaten): KontingentStand[] {
  const stand: KontingentStand[] = [];
  for (const k of rw.kontingente) {
    const passend = besuche.filter((b) => b.stamm !== null && kontingentId(b.stamm, b.art) === k.id);
    if (typeof k.kontakte_gesamt === "number") stand.push({ id: k.id, name: k.name, genutzt: passend.length, maximum: k.kontakte_gesamt, einheit: "Kontakte" });
    else if (k.kontakttage_gesamt) stand.push({ id: k.id, name: k.name, genutzt: new Set(passend.map((b) => b.datum)).size, maximum: k.kontakttage_gesamt, einheit: "Kontakttage" });
  }
  return stand;
}
