/**
 * M23 Erinnerungen und Automatisierungen: Regeln für Cockpit-Hinweise aus ET und Geburtsdatum.
 * (Fristen der Abrechnung und die Kinderurkunde erinnern bereits an anderer Stelle.)
 */

const tagNr = (iso: string) => Math.round(Date.parse(`${iso}T12:00:00Z`) / 86_400_000);
const tageBis = (von: string, bis: string) => tagNr(bis) - tagNr(von);

/** ET in den nächsten 14 Tagen: Erstbesuch im Wochenbett vorbereiten */
export function etBald(et: string | null | undefined, heute: string): { tage: number } | null {
  if (!et) return null;
  const tage = tageBis(heute, et);
  return tage >= 0 && tage <= 14 ? { tage } : null;
}

/** Kind in der 8. bis 10. Lebenswoche (Tag 50–70): Rückbildungskurs anbieten */
export function rueckbildungAnbieten(geburtsdatum: string, heute: string): { woche: number } | null {
  const alter = tageBis(geburtsdatum, heute);
  return alter >= 49 && alter <= 69 ? { woche: Math.floor(alter / 7) + 1 } : null;
}

/** Früherkennungsuntersuchungen laut Kinder-Richtlinie (Zeitraum in Lebenstagen, Geburtstag = 1. Lebenstag) */
export const U_UNTERSUCHUNGEN = [
  { id: "U2", zeitraum: "3.–10. Lebenstag", von: 3, bis: 10 },
  { id: "U3", zeitraum: "4.–5. Lebenswoche", von: 22, bis: 35 },
  { id: "U4", zeitraum: "3.–4. Lebensmonat", von: 57, bis: 120 },
] as const;

/** Welche U-Untersuchung ist gerade dran? (Hinweis, die Eltern zu erinnern) */
export function uUntersuchungFaellig(geburtsdatum: string, heute: string) {
  const lebenstag = tageBis(geburtsdatum, heute) + 1;
  return U_UNTERSUCHUNGEN.find((u) => lebenstag >= u.von && lebenstag <= u.bis) ?? null;
}
