/**
 * M3: Auswertung der Edinburgh Postnatal Depression Scale (EPDS; Cox, Holden & Sagovsky 1987).
 * Die Mutter füllt den validierten Fragebogen auf Papier aus; die Hebamme trägt die Punkte je Frage (0–3) ein.
 * Die App rechnet die Summe und zeigt Hinweise – sie ersetzt keine Diagnose.
 * Hier stehen bewusst nur Themen-Stichworte, nicht der Wortlaut der Fragen.
 */

export const EPDS_THEMEN = [
  "Lachen und das Schöne sehen",
  "Vorfreude",
  "Selbstvorwürfe",
  "Ängstlichkeit, Sorgen",
  "Panik, Erschrecken",
  "Überforderung",
  "Schlafprobleme durch Unglücklichsein",
  "Traurigkeit",
  "Weinen",
  "Gedanken, sich selbst zu verletzen",
] as const;

/** Schwellen: ab 10 Punkten genauer hinsehen, ab 13 wahrscheinlich behandlungsbedürftig; Frage 10 > 0 immer sofort ansprechen */
export const EPDS_SCHWELLEN = { erhoeht: 10, auffaellig: 13 } as const;

export type EpdsErgebnis = { summe: number; stufe: "unauffaellig" | "erhoeht" | "auffaellig"; selbstverletzung: boolean; vollstaendig: boolean };

/** „1,0,2,…“ (10 Werte) ↔ Zahlen */
export const epdsLesen = (text: string | null | undefined): Array<number | null> => {
  const teile = (text ?? "").split(",");
  return Array.from({ length: 10 }, (_, i) => (/^[0-3]$/.test(teile[i] ?? "") ? Number(teile[i]) : null));
};
export const epdsSchreiben = (werte: Array<number | null>) => (werte.every((w) => w === null) ? "" : werte.map((w) => (w === null ? "" : String(w))).join(","));

export function epdsAuswerten(werte: Array<number | null>): EpdsErgebnis | null {
  if (werte.every((w) => w === null)) return null;
  const summe = werte.reduce<number>((s, w) => s + (w ?? 0), 0);
  const selbstverletzung = (werte[9] ?? 0) > 0;
  const stufe = summe >= EPDS_SCHWELLEN.auffaellig ? "auffaellig" : summe >= EPDS_SCHWELLEN.erhoeht ? "erhoeht" : "unauffaellig";
  return { summe, stufe, selbstverletzung, vollstaendig: werte.every((w) => w !== null) };
}

/** Checkliste der Beratungsthemen im Wochenbett bzw. in der Schwangerschaft */
export const BERATUNGSTHEMEN = {
  schwangerschaft: ["Ernährung", "Beschwerden", "Geburtsvorbereitung", "Geburtsort/Kliniktasche", "Mutterschutz/Elterngeld", "Stillvorbereitung", "Wochenbettplanung"],
  wochenbett: ["Stillen/Anlegen", "Flaschennahrung", "Schlafen/sicherer Schlafplatz (SIDS)", "Nabelpflege", "Vitamin K/D, Fluorid", "U-Untersuchungen", "Babyblues/Stimmung", "Rückbildung", "Beckenboden", "Verhütung", "Tragen/Handling", "Schreien/Beruhigen"],
} as const;
