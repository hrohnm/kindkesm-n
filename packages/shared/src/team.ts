import { z } from "zod";

/** M20: Team-Nachrichten und Aufgaben */
const leerZuNull = (v: unknown) => (typeof v === "string" && !v.trim() ? null : v);

export const nachrichtSchema = z.object({
  text: z.string().trim().min(1, "Bitte eine Nachricht eingeben.").max(2000),
  /** leer = ganzes Team */
  anId: z.preprocess(leerZuNull, z.string().uuid().nullable()).default(null),
  klientinId: z.preprocess(leerZuNull, z.string().uuid().nullable()).default(null),
});
export type NachrichtEingabe = z.infer<typeof nachrichtSchema>;

export const aufgabeSchema = z.object({
  titel: z.string().trim().min(1, "Bitte kurz beschreiben, was zu tun ist.").max(120),
  notiz: z.preprocess(leerZuNull, z.string().trim().max(1000).nullable()).default(null),
  zustaendigId: z.preprocess(leerZuNull, z.string().uuid().nullable()).default(null),
  klientinId: z.preprocess(leerZuNull, z.string().uuid().nullable()).default(null),
  faelligAm: z.preprocess(leerZuNull, z.iso.date().nullable()).default(null),
});
export type AufgabeEingabe = z.infer<typeof aufgabeSchema>;

/** Stufe einer offenen Aufgabe im Cockpit: überfällig → dringend, heute/morgen → warnung, ohne Datum/später → keine */
export function aufgabeStufe(faelligAm: string | null, heuteIso: string): "dringend" | "warnung" | null {
  if (!faelligAm) return null;
  if (faelligAm < heuteIso) return "dringend";
  const morgen = new Date(`${heuteIso}T12:00:00Z`);
  morgen.setUTCDate(morgen.getUTCDate() + 1);
  return faelligAm <= morgen.toISOString().slice(0, 10) ? "warnung" : null;
}
