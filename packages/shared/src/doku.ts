/**
 * Felder der Besuchsdokumentation und persönliche Ansicht je Hebamme:
 * welche Felder standardmäßig sichtbar sind, ob der Wert des letzten Besuchs zum Vergleich erscheint
 * und ob die Kacheln Mutter/Kind beim Öffnen auf- oder zugeklappt sind.
 */
import { z } from "zod";
import { AUSWAHL } from "./akte";
import { WHO_GEWICHT_JUNGEN, WHO_GEWICHT_MAEDCHEN } from "./who-gewicht";
import { WHO_KOPF_JUNGEN, WHO_KOPF_MAEDCHEN, WHO_LAENGE_JUNGEN, WHO_LAENGE_MAEDCHEN } from "./who-wachstum";

export type DokuFeld = {
  id: string;
  label: string;
  art: "zahl" | "auswahl" | "text";
  einheit?: string;
  /** Schnellauswahl (Chips) */
  auswahl?: readonly string[];
  /** Nur nach der Geburt sinnvoll (Wochenbett) */
  nachGeburt?: boolean;
  /** Nur nach einem Kaiserschnitt */
  nurSectio?: boolean;
  /** Mehrere Werte gleichzeitig wählbar (gespeichert durch „, “ getrennt) */
  mehrfach?: boolean;
  inputMode?: "numeric" | "decimal";
};

export const DOKU_FELDER: { mutter: DokuFeld[]; kind: DokuFeld[] } = {
  mutter: [
    { id: "rrSys", label: "RR systolisch", art: "zahl", einheit: "mmHg", inputMode: "numeric" },
    { id: "rrDia", label: "RR diastolisch", art: "zahl", einheit: "mmHg", inputMode: "numeric" },
    { id: "puls", label: "Puls", art: "zahl", einheit: "/min", inputMode: "numeric" },
    { id: "temperatur", label: "Temperatur", art: "zahl", einheit: "°C", inputMode: "decimal" },
    { id: "fundus", label: "Fundus", art: "auswahl", auswahl: AUSWAHL.fundus, nachGeburt: true },
    { id: "lochien", label: "Lochien", art: "auswahl", auswahl: AUSWAHL.lochien, nachGeburt: true, mehrfach: true },
    { id: "brust", label: "Brust", art: "auswahl", auswahl: AUSWAHL.brust, nachGeburt: true, mehrfach: true },
    { id: "wunde", label: "Wunde / Naht", art: "auswahl", auswahl: AUSWAHL.wunde, nachGeburt: true, mehrfach: true },
    { id: "sectionarbe", label: "Kaiserschnittnarbe", art: "auswahl", auswahl: AUSWAHL.sectionarbe, nachGeburt: true, nurSectio: true, mehrfach: true },
    { id: "befinden", label: "Befinden", art: "text" },
  ],
  kind: [
    { id: "gewicht", label: "Gewicht", art: "zahl", einheit: "g", inputMode: "numeric" },
    { id: "temperatur", label: "Temperatur", art: "zahl", einheit: "°C", inputMode: "decimal" },
    { id: "laenge", label: "Länge", art: "zahl", einheit: "cm", inputMode: "decimal" },
    { id: "kopfumfang", label: "Kopfumfang", art: "zahl", einheit: "cm", inputMode: "decimal" },
    { id: "haut", label: "Haut", art: "auswahl", auswahl: AUSWAHL.haut, mehrfach: true },
    { id: "nabel", label: "Nabel", art: "auswahl", auswahl: AUSWAHL.nabel, mehrfach: true },
    { id: "stillen", label: "Ernährung", art: "auswahl", auswahl: AUSWAHL.stillen, mehrfach: true },
    { id: "ausscheidung", label: "Ausscheidung", art: "auswahl", auswahl: AUSWAHL.ausscheidung, mehrfach: true },
  ],
};

const feldEinstellung = z.object({ sichtbar: z.boolean(), vergleich: z.boolean() });
export type FeldEinstellung = z.infer<typeof feldEinstellung>;

export const ansichtSchema = z.object({
  mutter: z.record(z.string(), feldEinstellung).default({}),
  kind: z.record(z.string(), feldEinstellung).default({}),
  /** Kacheln beim Öffnen eines Besuchs aufgeklappt */
  mutterOffen: z.boolean().default(false),
  kindOffen: z.boolean().default(false),
});
export type Ansicht = z.infer<typeof ansichtSchema>;

/** Standard: alle Felder sichtbar, Vergleich für Messwerte. */
export function standardAnsicht(): Ansicht {
  const je = (felder: DokuFeld[]) => Object.fromEntries(felder.map((f) => [f.id, { sichtbar: true, vergleich: f.art === "zahl" || f.id === "lochien" || f.id === "fundus" || f.id === "sectionarbe" }]));
  // Kacheln standardmäßig zugeklappt: die Hebamme klappt auf, was sie eintragen möchte
  return { mutter: je(DOKU_FELDER.mutter), kind: je(DOKU_FELDER.kind), mutterOffen: false, kindOffen: false };
}

/** Ergänzt gespeicherte Einstellungen um neue Felder (Standardwerte). */
export function ansichtVervollstaendigen(gespeichert: unknown): Ansicht {
  const s = standardAnsicht();
  const r = ansichtSchema.safeParse(gespeichert ?? {});
  if (!r.success) return s;
  return {
    mutter: { ...s.mutter, ...r.data.mutter },
    kind: { ...s.kind, ...r.data.kind },
    mutterOffen: r.data.mutterOffen,
    kindOffen: r.data.kindOffen,
  };
}

// ------------------------------------------------------------------ Gewicht und Perzentile (WHO)
/** Standardnormalverteilung (Abramowitz/Stegun 26.2.17, Fehler < 7,5·10⁻⁸) */
function normalVerteilung(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}

export const WHO_MAX_TAG = 365;

/** Messgrößen mit WHO-Referenz: Gewicht in Gramm, Länge und Kopfumfang in Zentimetern. */
export type Messgroesse = "gewicht" | "laenge" | "kopfumfang";
type Lms = ReadonlyArray<readonly [number, number, number]>;
const TABELLEN: Record<Messgroesse, { jungen: Lms; maedchen: Lms; faktor: number }> = {
  gewicht: { jungen: WHO_GEWICHT_JUNGEN, maedchen: WHO_GEWICHT_MAEDCHEN, faktor: 1000 }, // Tabelle in kg
  laenge: { jungen: WHO_LAENGE_JUNGEN, maedchen: WHO_LAENGE_MAEDCHEN, faktor: 1 },
  kopfumfang: { jungen: WHO_KOPF_JUNGEN, maedchen: WHO_KOPF_MAEDCHEN, faktor: 1 },
};
function lms(groesse: Messgroesse, tag: number, geschlecht: string | null | undefined) {
  const t = TABELLEN[groesse];
  const liste = geschlecht === "maennlich" ? t.jungen : t.maedchen;
  const [l, m, s] = liste[Math.min(Math.max(0, Math.round(tag)), WHO_MAX_TAG)]!;
  return { l, m: m * t.faktor, s };
}

/** Messwert zur Perzentile p (0–100) im Alter `tag` (Tag 0 = Geburtstag). */
export function wertFuerPerzentile(groesse: Messgroesse, tag: number, p: number, geschlecht: string | null | undefined): number {
  const { l, m, s } = lms(groesse, tag, geschlecht);
  return m * Math.pow(1 + l * s * zAusPerzentile(p / 100), 1 / l);
}

/** Perzentile (0–100) eines Messwerts im Alter `tag`. */
export function perzentileFuerWert(groesse: Messgroesse, tag: number, wert: number, geschlecht: string | null | undefined): number {
  const { l, m, s } = lms(groesse, tag, geschlecht);
  return 100 * normalVerteilung((Math.pow(wert / m, l) - 1) / (l * s));
}

/** Gewicht (g) zur Perzentile p (0–100) im Alter in Tagen (Tag 0 = Geburtstag). */
export const gewichtFuerPerzentile = (tag: number, p: number, geschlecht: string | null | undefined) => wertFuerPerzentile("gewicht", tag, p, geschlecht);
/** Perzentile (0–100) eines Gewichts (g) im Alter in Tagen. */
export const perzentileFuerGewicht = (tag: number, gramm: number, geschlecht: string | null | undefined) => perzentileFuerWert("gewicht", tag, gramm, geschlecht);

/** Umkehrfunktion der Normalverteilung (Acklam, ausreichend genau für Kurven) */
function zAusPerzentile(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const q = Math.min(Math.max(p, 1e-9), 1 - 1e-9);
  if (q < 0.02425) {
    const r = Math.sqrt(-2 * Math.log(q));
    return (((((c[0]! * r + c[1]!) * r + c[2]!) * r + c[3]!) * r + c[4]!) * r + c[5]!) / ((((d[0]! * r + d[1]!) * r + d[2]!) * r + d[3]!) * r + 1);
  }
  if (q > 1 - 0.02425) return -zAusPerzentile(1 - q);
  const r = q - 0.5;
  const t = r * r;
  return ((((((a[0]! * t + a[1]!) * t + a[2]!) * t + a[3]!) * t + a[4]!) * t + a[5]!) * r) / (((((b[0]! * t + b[1]!) * t + b[2]!) * t + b[3]!) * t + b[4]!) * t + 1);
}

export type Gewichtswert = { datum: string; gramm: number; quelle: "geburt" | "besuch"; besuchId?: string };

/**
 * Ergänzt Gewichtswerte um Lebenstag (Geburtstag = 1. Lebenstag, wie in der übrigen App und im Vertrag),
 * Alter in Tagen (Geburtstag = 0, Grundlage der WHO-Tabellen), Veränderung zum Vorwert und zum Geburtsgewicht.
 */
export function gewichtsverlauf(geburtsdatum: string, werte: Gewichtswert[]) {
  const tagNr = (iso: string) => Math.round(Date.parse(`${iso}T12:00:00Z`) / 86_400_000);
  const sortiert = [...werte].sort((a, b) => a.datum.localeCompare(b.datum) || (a.quelle === "geburt" ? -1 : 1));
  const geburt = sortiert.find((w) => w.quelle === "geburt")?.gramm ?? null;
  return sortiert.map((w, i) => {
    const vor = sortiert[i - 1];
    const tage = vor ? tagNr(w.datum) - tagNr(vor.datum) : 0;
    return {
      ...w,
      alterTage: tagNr(w.datum) - tagNr(geburtsdatum),
      lebenstag: tagNr(w.datum) - tagNr(geburtsdatum) + 1,
      diffVorwert: vor ? w.gramm - vor.gramm : null,
      grammProTag: vor && tage > 0 ? (w.gramm - vor.gramm) / tage : null,
      prozentGeburt: geburt ? ((w.gramm - geburt) / geburt) * 100 : null,
    };
  });
}

export type Messwert = { datum: string; wert: number; quelle: "geburt" | "besuch"; besuchId?: string };

/** Wie `gewichtsverlauf`, für beliebige Messgrößen (Länge, Kopfumfang): Lebenstag, Veränderung zum Vorwert und zur Geburt. */
export function messverlauf(geburtsdatum: string, werte: Messwert[]) {
  const tagNr = (iso: string) => Math.round(Date.parse(`${iso}T12:00:00Z`) / 86_400_000);
  const sortiert = [...werte].sort((a, b) => a.datum.localeCompare(b.datum) || (a.quelle === "geburt" ? -1 : 1));
  const geburt = sortiert.find((w) => w.quelle === "geburt")?.wert ?? null;
  return sortiert.map((w, i) => {
    const vor = sortiert[i - 1];
    return {
      ...w,
      alterTage: tagNr(w.datum) - tagNr(geburtsdatum),
      lebenstag: tagNr(w.datum) - tagNr(geburtsdatum) + 1,
      diffVorwert: vor ? w.wert - vor.wert : null,
      diffGeburt: geburt != null ? w.wert - geburt : null,
    };
  });
}

/** Mehrfachauswahl: gespeicherter Text ↔ Liste der gewählten Werte */
export const mehrfachWerte = (wert: string | null | undefined) => (wert ? wert.split(",").map((x) => x.trim()).filter(Boolean) : []);
export const mehrfachText = (werte: string[]) => werte.join(", ");
