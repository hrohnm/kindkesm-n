/**
 * Tourenplanung: Reihenfolge der Hausbesuche eines Tages mit Zeitfenstern (VRPTW für eine Hebamme)
 * und Wegegeld nach § 11 Anlage 1.1 des Hebammenhilfevertrags.
 *
 * Reine Funktionen ohne Netzwerkzugriff: Fahrzeiten und Strecken kommen als Matrix von außen
 * (OSRM oder Luftlinien-Schätzung, siehe apps/api/src/geo).
 */
import { z } from "zod";

// ------------------------------------------------------------------ Zeit
/** "HH:MM" → Minuten seit Mitternacht */
export function uhrzeitZuMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h! * 60 + m!;
}
/** Minuten seit Mitternacht → "HH:MM" (ab 24:00 ohne Tagesumbruch gekappt) */
export function minZuUhrzeit(min: number): string {
  const m = Math.min(Math.max(0, Math.round(min)), 24 * 60 - 1);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

// ------------------------------------------------------------------ Eingaben
export type Matrix = {
  /** Fahrzeit in Sekunden; Index 0 = Start, 1..n = Besuche, n+1 = Ende */
  sek: number[][];
  /** Strecke in Metern, gleiche Indizes */
  meter: number[][];
};

export type Stopp = {
  /** Besuchsdauer in Minuten */
  dauerMin: number;
  /** Ankunft frühestens (Minuten seit Mitternacht) */
  fruehestens?: number | null;
  /** Ankunft spätestens (Minuten seit Mitternacht) */
  spaetestens?: number | null;
  /** Muss heute besucht werden (z. B. 3. Lebenstag) – wird bei Zeitnot zuerst eingeplant */
  wichtig?: boolean;
};

export type TourParameter = {
  /** Abfahrt am Start (Minuten seit Mitternacht) */
  startMin: number;
  /** Ankunft am Ende spätestens (z. B. Schule 15:30) */
  endeSpaetestens?: number | null;
  /** Puffer nach jedem Besuch in Minuten (Parken, Dokumentation) */
  pufferMin?: number;
};

export type TourZeiten = {
  /** Besuchsindizes 1..n in Fahrreihenfolge */
  reihenfolge: number[];
  ankunft: number[];
  beginn: number[];
  ende: number[];
  /** je Stopp Minuten nach dem spätesten Zeitpunkt */
  verspaetung: number[];
  ankunftEnde: number;
  fahrSek: number;
  meter: number;
  /** Minuten, die das Ende zu spät erreicht wird */
  endeVerspaetung: number;
};

// ------------------------------------------------------------------ Zeiten berechnen
/** Berechnet Ankunfts- und Abfahrtszeiten für eine feste Reihenfolge (Warten bis zum Zeitfenster ist erlaubt). */
export function tourZeiten(reihenfolge: number[], matrix: Matrix, stopps: Stopp[], p: TourParameter): TourZeiten {
  const ende = stopps.length + 1;
  const puffer = p.pufferMin ?? 0;
  const r: TourZeiten = { reihenfolge, ankunft: [], beginn: [], ende: [], verspaetung: [], ankunftEnde: 0, fahrSek: 0, meter: 0, endeVerspaetung: 0 };
  let ort = 0;
  let zeit = p.startMin;
  for (const i of reihenfolge) {
    const s = stopps[i - 1]!;
    r.fahrSek += matrix.sek[ort]![i]!;
    r.meter += matrix.meter[ort]![i]!;
    const ankunft = zeit + matrix.sek[ort]![i]! / 60;
    const beginn = Math.max(ankunft, s.fruehestens ?? 0);
    r.ankunft.push(ankunft);
    r.beginn.push(beginn);
    r.verspaetung.push(s.spaetestens == null ? 0 : Math.max(0, beginn - s.spaetestens));
    zeit = beginn + s.dauerMin;
    r.ende.push(zeit);
    zeit += puffer;
    ort = i;
  }
  r.fahrSek += matrix.sek[ort]![ende]!;
  r.meter += matrix.meter[ort]![ende]!;
  r.ankunftEnde = zeit + matrix.sek[ort]![ende]! / 60;
  r.endeVerspaetung = p.endeSpaetestens == null ? 0 : Math.max(0, r.ankunftEnde - p.endeSpaetestens);
  return r;
}

/** Bewertung: Verspätungen wiegen schwer (wichtige Besuche doppelt), danach zählt die Fahrzeit. */
function kosten(z: TourZeiten, stopps: Stopp[]): number {
  let strafe = z.endeVerspaetung;
  z.reihenfolge.forEach((i, k) => (strafe += z.verspaetung[k]! * (stopps[i - 1]!.wichtig ? 2 : 1)));
  return strafe * 600 + z.fahrSek;
}

// ------------------------------------------------------------------ Optimieren
export type TourErgebnis = TourZeiten & { hinweise: string[]; exakt: boolean };

/** Grenze für die vollständige Suche; darüber lokale Suche (Einfügen + Verschieben + 2-opt). */
const EXAKT_BIS = 9;

/**
 * Optimiert die Reihenfolge der Besuche. Bis 9 Besuche wird die beste Reihenfolge exakt gesucht
 * (Branch and Bound), darüber eine sehr gute Näherung. Für einen Hebammen-Tag dauert beides Millisekunden.
 */
export function tourOptimieren(matrix: Matrix, stopps: Stopp[], p: TourParameter): TourErgebnis {
  const n = stopps.length;
  const alle = Array.from({ length: n }, (_, i) => i + 1);
  let beste: TourZeiten;
  let exakt = true;
  if (n <= EXAKT_BIS) beste = exakteSuche(alle, matrix, stopps, p);
  else {
    exakt = false;
    beste = lokaleSuche(alle, matrix, stopps, p);
  }
  return { ...beste, hinweise: hinweiseFuer(beste, stopps, p), exakt };
}

function exakteSuche(alle: number[], matrix: Matrix, stopps: Stopp[], p: TourParameter): TourZeiten {
  const n = alle.length;
  const ende = n + 1;
  const puffer = p.pufferMin ?? 0;
  let besteKosten = Infinity;
  let besteFolge: number[] = alle;
  const folge: number[] = [];
  const benutzt = new Array<boolean>(n + 2).fill(false);
  // Teilkosten wachsen monoton (Fahrzeit und Verspätungen sind nicht negativ) → Abschneiden zulässig
  const suche = (ort: number, zeit: number, teil: number) => {
    if (teil >= besteKosten) return;
    if (folge.length === n) {
      const ankunft = zeit + matrix.sek[ort]![ende]! / 60;
      const spaet = p.endeSpaetestens == null ? 0 : Math.max(0, ankunft - p.endeSpaetestens);
      const gesamt = teil + matrix.sek[ort]![ende]! + spaet * 600;
      if (gesamt < besteKosten) {
        besteKosten = gesamt;
        besteFolge = [...folge];
      }
      return;
    }
    for (let i = 1; i <= n; i++) {
      if (benutzt[i]) continue;
      const s = stopps[i - 1]!;
      const ankunft = zeit + matrix.sek[ort]![i]! / 60;
      const beginn = Math.max(ankunft, s.fruehestens ?? 0);
      const spaet = s.spaetestens == null ? 0 : Math.max(0, beginn - s.spaetestens);
      benutzt[i] = true;
      folge.push(i);
      suche(i, beginn + s.dauerMin + puffer, teil + matrix.sek[ort]![i]! + spaet * 600 * (s.wichtig ? 2 : 1));
      folge.pop();
      benutzt[i] = false;
    }
  };
  suche(0, p.startMin, 0);
  return tourZeiten(besteFolge, matrix, stopps, p);
}

function lokaleSuche(alle: number[], matrix: Matrix, stopps: Stopp[], p: TourParameter): TourZeiten {
  // Start: nach Zeitfenster sortiert, dann günstigste Einfügung
  const sortiert = [...alle].sort((a, b) => (stopps[a - 1]!.spaetestens ?? 1e9) - (stopps[b - 1]!.spaetestens ?? 1e9));
  let folge: number[] = [];
  for (const i of sortiert) {
    let best: number[] = [...folge, i];
    let bestK = kosten(tourZeiten(best, matrix, stopps, p), stopps);
    for (let pos = 0; pos < folge.length; pos++) {
      const v = [...folge.slice(0, pos), i, ...folge.slice(pos)];
      const k = kosten(tourZeiten(v, matrix, stopps, p), stopps);
      if (k < bestK) [best, bestK] = [v, k];
    }
    folge = best;
  }
  let aktK = kosten(tourZeiten(folge, matrix, stopps, p), stopps);
  let verbessert = true;
  while (verbessert) {
    verbessert = false;
    // Verschieben eines Besuchs
    for (let a = 0; a < folge.length && !verbessert; a++) {
      for (let b = 0; b < folge.length && !verbessert; b++) {
        if (a === b) continue;
        const v = [...folge];
        const [x] = v.splice(a, 1);
        v.splice(b, 0, x!);
        const k = kosten(tourZeiten(v, matrix, stopps, p), stopps);
        if (k < aktK - 1e-6) [folge, aktK, verbessert] = [v, k, true];
      }
    }
    // 2-opt: Teilstück umdrehen
    for (let a = 0; a < folge.length - 1 && !verbessert; a++) {
      for (let b = a + 1; b < folge.length && !verbessert; b++) {
        const v = [...folge.slice(0, a), ...folge.slice(a, b + 1).reverse(), ...folge.slice(b + 1)];
        const k = kosten(tourZeiten(v, matrix, stopps, p), stopps);
        if (k < aktK - 1e-6) [folge, aktK, verbessert] = [v, k, true];
      }
    }
  }
  return tourZeiten(folge, matrix, stopps, p);
}

function hinweiseFuer(z: TourZeiten, stopps: Stopp[], p: TourParameter): string[] {
  const h: string[] = [];
  z.reihenfolge.forEach((i, k) => {
    const v = z.verspaetung[k]!;
    if (v >= 1) h.push(`Besuch ${k + 1} beginnt ${Math.round(v)} Min. nach dem vereinbarten Zeitpunkt${stopps[i - 1]!.wichtig ? " (muss heute sein)" : ""}.`);
  });
  if (z.endeVerspaetung >= 1 && p.endeSpaetestens != null) {
    h.push(`Das Ziel wird erst um ${minZuUhrzeit(z.ankunftEnde)} erreicht (spätestens ${minZuUhrzeit(p.endeSpaetestens)}). Einen Besuch verschieben oder früher starten.`);
  }
  return h;
}

// ------------------------------------------------------------------ Wegegeld (§ 11 Anlage 1.1)
export type WegegeldRegel = {
  gpos_einzeln: string;
  gpos_anteilig: string;
  satz_je_km: number;
  max_km_regel: number;
  max_km_mit_begruendung: number;
  /** true: Hin- und Rückweg zählen (Ausgangspunkt → Familie → Ausgangspunkt) */
  hin_und_rueckweg?: boolean;
  /** Nachkommastellen der abgerechneten Kilometer */
  km_nachkommastellen?: number;
};

export type WegegeldBesuch = {
  id: string;
  /** kürzeste Strecke Ausgangspunkt → Familie in Metern */
  direktMeter: number;
  /** Begründung für Strecken über 25 km (Hausgeburt, Vertretung mit Name, keine Hebamme im Umkreis) */
  begruendung?: string | null;
};

export type WegegeldZeile = {
  id: string;
  gpos: string;
  km: number;
  /** Anzahl der auf der Gesamtstrecke betreuten Versicherten (Pflichtangabe bei 50200) */
  anzahl: number;
  betrag: number;
  hinweise: Array<{ stufe: "warnung" | "fehler"; text: string }>;
};

const rundenAuf = (x: number, stellen: number) => Math.round(x * 10 ** stellen) / 10 ** stellen;

/**
 * Teilt die Strecke eines Weges auf die betreuten Versicherten auf.
 *
 * - Ein Besuch: kürzeste Strecke zur Familie (bei hin_und_rueckweg hin und zurück), GPOS 50100.
 * - Mehrere Besuche auf einem Weg: zurückgelegte Gesamtstrecke geteilt durch die Anzahl, je Versicherte GPOS 50200
 *   mit Angabe der Anzahl.
 * - Liegt die Familie mehr als 25 km entfernt, ist die Strecke nur mit Begründung und höchstens bis 50 km abrechenbar.
 */
export function wegegeldAufteilen(gesamtMeter: number, besuche: WegegeldBesuch[], regel: WegegeldRegel): WegegeldZeile[] {
  const n = besuche.length;
  if (!n) return [];
  const stellen = regel.km_nachkommastellen ?? 1;
  const faktor = regel.hin_und_rueckweg === false ? 1 : 2;
  const gpos = n === 1 ? regel.gpos_einzeln : regel.gpos_anteilig;
  const anteilKm = gesamtMeter / 1000 / n;
  return besuche.map((b) => {
    const hinweise: WegegeldZeile["hinweise"] = [];
    const direktKm = b.direktMeter / 1000;
    let grenze = regel.max_km_regel;
    if (direktKm > regel.max_km_regel) {
      if (b.begruendung?.trim()) {
        grenze = regel.max_km_mit_begruendung;
        hinweise.push({ stufe: "warnung", text: `Strecke ${direktKm.toFixed(1)} km über ${regel.max_km_regel} km – Begründung: ${b.begruendung.trim()}` });
      } else {
        hinweise.push({
          stufe: "warnung",
          text: `Die Familie wohnt ${direktKm.toFixed(1)} km entfernt. Über ${regel.max_km_regel} km nur mit Begründung abrechenbar (Hausgeburt, Vertretung mit Name, keine Hebamme im Umkreis); bis dahin auf ${regel.max_km_regel} km gekürzt.`,
        });
      }
      if (direktKm > regel.max_km_mit_begruendung) hinweise.push({ stufe: "warnung", text: `Mehr als ${regel.max_km_mit_begruendung} km sind nicht abrechenbar; gekürzt.` });
    }
    const km = rundenAuf(Math.min(anteilKm, grenze * faktor), stellen);
    return { id: b.id, gpos, km, anzahl: n, betrag: rundenAuf(km * regel.satz_je_km, 2), hinweise };
  });
}

// ------------------------------------------------------------------ Fahrtenbuch
export const FAHRT_ARTEN = ["dienstlich", "wohnung_betrieb", "privat"] as const;
export type FahrtArt = (typeof FAHRT_ARTEN)[number];
export const FAHRT_ART_LABEL: Record<FahrtArt, string> = {
  dienstlich: "dienstlich",
  wohnung_betrieb: "Wohnung–Praxis",
  privat: "privat",
};

/** Ort-Typen, deren Anfahrt im Fahrtenbuch als privat gilt (z. B. Kind von der Schule abholen). */
const PRIVATE_ZIELE = new Set(["schule", "kita", "sonstiges"]);

/**
 * Ordnet einen Streckenabschnitt einer Fahrtart zu. Ziel Schule/Kita/Sonstiges = privat;
 * Wohnung ↔ Praxis = Wohnung–Betriebsstätte; alles andere (Hausbesuche) = dienstlich.
 */
export function abschnittArt(von: { typ: string }, nach: { typ: string }): FahrtArt {
  if (PRIVATE_ZIELE.has(nach.typ)) return "privat";
  const paar = new Set([von.typ, nach.typ]);
  if (paar.size === 2 && paar.has("privat") && paar.has("praxis")) return "wohnung_betrieb";
  if (von.typ === nach.typ && (von.typ === "privat" || von.typ === "praxis")) return "privat";
  return "dienstlich";
}

// ------------------------------------------------------------------ Schemas
const uhrzeit = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Uhrzeit im Format HH:MM");
const leerZuNull = (v: unknown) => (v === "" || v === undefined ? null : v);

export const TERMIN_ZEITEN = ["fix", "ganztags", "vormittags", "nachmittags", "fenster"] as const;
export type TerminZeit = (typeof TERMIN_ZEITEN)[number];
export const TERMIN_ZEIT_LABEL: Record<TerminZeit, string> = {
  fix: "feste Uhrzeit",
  ganztags: "flexibel",
  vormittags: "vormittags",
  nachmittags: "nachmittags",
  fenster: "Zeitfenster",
};
/** Zeitfenster der Kurzwahl (Ankunft) */
export const TERMIN_FENSTER: Record<"vormittags" | "nachmittags", [string, string]> = {
  vormittags: ["08:00", "12:00"],
  nachmittags: ["12:00", "17:00"],
};

export const terminSchema = z
  .object({
    betreuungId: z.string().uuid(),
    zeit: z.enum(TERMIN_ZEITEN),
    uhrzeit: z.preprocess(leerZuNull, uhrzeit.nullable()).default(null),
    fruehestens: z.preprocess(leerZuNull, uhrzeit.nullable()).default(null),
    spaetestens: z.preprocess(leerZuNull, uhrzeit.nullable()).default(null),
    dauerMin: z.number().int().min(5).max(240),
    typ: z.enum(["schwangerschaft", "vorsorge", "aufklaerung", "stillvorbereitung", "wochenbett"]),
    wichtig: z.boolean().default(false),
    notiz: z.preprocess(leerZuNull, z.string().trim().max(500).nullable()).default(null),
  })
  .superRefine((t, ctx) => {
    if (t.zeit === "fix" && !t.uhrzeit) ctx.addIssue({ code: "custom", path: ["uhrzeit"], message: "Bitte Uhrzeit angeben." });
    if (t.zeit === "fenster" && !t.fruehestens && !t.spaetestens) ctx.addIssue({ code: "custom", path: ["fruehestens"], message: "Bitte Zeitfenster angeben." });
    if (t.fruehestens && t.spaetestens && uhrzeitZuMin(t.fruehestens) > uhrzeitZuMin(t.spaetestens)) {
      ctx.addIssue({ code: "custom", path: ["spaetestens"], message: "Ende vor Beginn." });
    }
  });
export type TerminEingabe = z.infer<typeof terminSchema>;

/** Ankunftsfenster eines Termins in Minuten seit Mitternacht */
export function terminFenster(t: Pick<TerminEingabe, "zeit" | "uhrzeit" | "fruehestens" | "spaetestens">): { fruehestens: number | null; spaetestens: number | null } {
  if (t.zeit === "fix" && t.uhrzeit) return { fruehestens: uhrzeitZuMin(t.uhrzeit), spaetestens: uhrzeitZuMin(t.uhrzeit) };
  if (t.zeit === "vormittags" || t.zeit === "nachmittags") {
    const [a, b] = TERMIN_FENSTER[t.zeit];
    return { fruehestens: uhrzeitZuMin(a), spaetestens: uhrzeitZuMin(b) };
  }
  if (t.zeit === "fenster") return { fruehestens: t.fruehestens ? uhrzeitZuMin(t.fruehestens) : null, spaetestens: t.spaetestens ? uhrzeitZuMin(t.spaetestens) : null };
  return { fruehestens: null, spaetestens: null };
}

export const tourEinstellungSchema = z.object({
  startOrtId: z.string().uuid(),
  endeOrtId: z.string().uuid(),
  wegegeldAusgangsOrtId: z.string().uuid(),
  startZeit: uhrzeit,
  endeSpaetestens: z.preprocess(leerZuNull, uhrzeit.nullable()).default(null),
  pufferMin: z.number().int().min(0).max(60).default(5),
});
export type TourEinstellung = z.infer<typeof tourEinstellungSchema>;

export const wegegeldTagSchema = z.object({
  manuellKm: z.preprocess(leerZuNull, z.number().min(0).max(1000).nullable()).default(null),
  getrennteWege: z.boolean().default(false),
  begruendungen: z.record(z.string().uuid(), z.string().trim().max(200)).default({}),
});

export const fahrtSchema = z
  .object({
    datum: z.iso.date(),
    kmStandBeginn: z.preprocess(leerZuNull, z.number().int().min(0).max(9_999_999).nullable()).default(null),
    kmStandEnde: z.preprocess(leerZuNull, z.number().int().min(0).max(9_999_999).nullable()).default(null),
    strecke: z.string().trim().min(1).max(500),
    zweck: z.string().trim().min(1).max(300),
    kmDienstlich: z.number().min(0).max(2000),
    kmWohnungBetrieb: z.number().min(0).max(2000).default(0),
    kmPrivat: z.number().min(0).max(2000).default(0),
  })
  .superRefine((f, ctx) => {
    if (f.kmStandBeginn != null && f.kmStandEnde != null) {
      if (f.kmStandEnde < f.kmStandBeginn) ctx.addIssue({ code: "custom", path: ["kmStandEnde"], message: "Kilometerstand am Ende ist kleiner als am Beginn." });
    }
  });
export type FahrtEingabe = z.infer<typeof fahrtSchema>;
