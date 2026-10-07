/**
 * Warnungen für Cockpit und Besuch (M1/M7): Gewichtsabnahme des Kindes, fast ausgeschöpfte Kontingente,
 * fehlende ärztliche Anordnung. Nur Hinweise für die Hebamme – keine Diagnose.
 */
import type { KontingentStand } from "./plausi";

/** Gewichtsabnahme in % vom Geburtsgewicht: ab 7 % genauer hinsehen, ab 10 % Warnung */
export const GEWICHT_SCHWELLEN = { beobachten: 7, warnung: 10 } as const;

export type Gewichtswarnung = { stufe: "warnung" | "info"; abnahme: number };

export function gewichtWarnung(geburtsgewicht: number | null | undefined, gramm: number | null | undefined): Gewichtswarnung | null {
  if (!geburtsgewicht || !gramm || gramm <= 0) return null;
  const abnahme = ((geburtsgewicht - gramm) / geburtsgewicht) * 100;
  if (abnahme >= GEWICHT_SCHWELLEN.warnung) return { stufe: "warnung", abnahme };
  if (abnahme >= GEWICHT_SCHWELLEN.beobachten) return { stufe: "info", abnahme };
  return null;
}

/** Letztes in der Besuchsdokumentation erfasstes Gewicht je Kind (Besuche nach Datum sortiert übergeben) */
export function letztesGewicht(besuche: Array<{ datum: string; dokumentation: unknown }>, kindId: string): { datum: string; gramm: number } | null {
  let letztes: { datum: string; gramm: number } | null = null;
  for (const b of besuche) {
    const kinder = (b.dokumentation as { kinder?: Record<string, Record<string, unknown>> } | null)?.kinder;
    const roh = kinder?.[kindId]?.gewicht;
    const g = Number(String(roh ?? "").replace(",", "."));
    if (g > 0 && (!letztes || b.datum >= letztes.datum)) letztes = { datum: b.datum, gramm: g };
  }
  return letztes;
}

export type Kontingentwarnung = { stufe: "warnung" | "info"; rest: number; text: string };

/**
 * Fast ausgeschöpft: höchstens 2 Kontakte/Kontakttage (bei Kontingenten ab 6) bzw. 10 % der Minuten übrig;
 * ausgeschöpft = Warnung. Kleine Kontingente (z. B. 2 Aufklärungsgespräche) erst, wenn sie aufgebraucht sind.
 */
export function kontingentWarnung(k: KontingentStand): Kontingentwarnung | null {
  const rest = k.maximum - k.genutzt;
  if (k.genutzt === 0) return null;
  const knapp = k.einheit === "Minuten" ? rest <= k.maximum * 0.1 : k.maximum >= 6 ? rest <= 2 : rest <= 0;
  if (!knapp) return null;
  if (rest <= 0) return { stufe: "warnung", rest: 0, text: `${k.name}: ausgeschöpft (${k.genutzt} von ${k.maximum} ${k.einheit}) – weitere Leistungen nur mit ärztlicher Anordnung` };
  return { stufe: "info", rest, text: `${k.name}: ${k.genutzt} von ${k.maximum} ${k.einheit} genutzt, noch ${rest} frei` };
}

/** Braucht der Besuch laut Prüfung eine ärztliche Anordnung? */
export const anordnungNoetig = (hinweise: ReadonlyArray<{ stufe: string; text: string }>) => hinweise.some((h) => h.stufe !== "info" && /ärztliche[rn]? Anordnung/i.test(h.text));
