/**
 * Rückrufwunsch über die Website: Familien hinterlassen Name, Telefonnummer, Anliegen und ein passendes
 * Zeitfenster. In der App erscheinen die Wünsche im Cockpit und auf der Seite „Anfragen“.
 */
import { z } from "zod";

export const RUECKRUF_ANLIEGEN = {
  betreuung: "Hebammenbetreuung",
  wochenbett: "Fragen im Wochenbett",
  stillen: "Stillen & Ernährung",
  kurs: "Kurse",
  sonstiges: "Sonstiges",
} as const;
export type RueckrufAnliegen = keyof typeof RUECKRUF_ANLIEGEN;

export const RUECKRUF_ZEITFENSTER = {
  egal: "jederzeit",
  vormittag: "vormittags (8–12 Uhr)",
  mittag: "mittags (12–14 Uhr)",
  nachmittag: "nachmittags (14–18 Uhr)",
} as const;
export type RueckrufZeitfenster = keyof typeof RUECKRUF_ZEITFENSTER;

/** Stunden [von, bis) je Zeitfenster */
const FENSTER: Record<RueckrufZeitfenster, [number, number]> = { egal: [8, 18], vormittag: [8, 12], mittag: [12, 14], nachmittag: [14, 18] };

/** Erledigte Rückrufwünsche werden nach dieser Frist automatisch gelöscht (Datensparsamkeit). */
export const RUECKRUF_AUFBEWAHRUNG_TAGE = 30;

const leer = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const textOderNull = (max: number) => z.preprocess(leer, z.string().trim().max(max).nullable().default(null));

export const oeffentlicherRueckrufSchema = z.object({
  name: z.string().trim().min(2, "Bitte deinen Namen angeben.").max(120),
  telefon: z
    .string()
    .trim()
    .regex(/^\+?[\d\s/()-]{6,30}$/, "Bitte eine Telefonnummer angeben, unter der wir dich erreichen.")
    .refine((t) => t.replace(/\D/g, "").length >= 6, "Bitte eine Telefonnummer angeben, unter der wir dich erreichen."),
  anliegen: z.enum(Object.keys(RUECKRUF_ANLIEGEN) as [RueckrufAnliegen, ...RueckrufAnliegen[]]).default("sonstiges"),
  zeitfenster: z.enum(Object.keys(RUECKRUF_ZEITFENSTER) as [RueckrufZeitfenster, ...RueckrufZeitfenster[]]).default("egal"),
  /** Name der Wunsch-Hebamme (wie auf der Website); unbekannte Namen werden ignoriert */
  hebamme: textOderNull(120),
  nachricht: textOderNull(500),
  einwilligung: z.literal(true, { message: "Bitte der Verarbeitung deiner Angaben zustimmen." }),
  /** Honigtopf gegen Formular-Spam: muss leer bleiben */
  webseite: z.string().max(0).optional(),
});
export type OeffentlicherRueckruf = z.infer<typeof oeffentlicherRueckrufSchema>;

export const rueckrufAktionSchema = z.discriminatedUnion("aktion", [
  /** Gespräch geführt – Rückruf erledigt */
  z.object({ aktion: z.literal("erreicht"), notiz: textOderNull(1000) }),
  /** Versuch vermerken, bleibt offen */
  z.object({ aktion: z.literal("nicht_erreicht"), notiz: textOderNull(1000) }),
  z.object({ aktion: z.literal("wieder_oeffnen") }),
  z.object({ aktion: z.literal("notiz"), notiz: textOderNull(1000) }),
]);
export type RueckrufAktion = z.infer<typeof rueckrufAktionSchema>;

/** Liegt die Stunde im gewünschten Zeitfenster (werktags 8–18 Uhr)? */
export function imZeitfenster(zeitfenster: RueckrufZeitfenster, jetzt: Date): boolean {
  const tag = jetzt.getDay();
  if (tag === 0 || tag === 6) return false;
  const [von, bis] = FENSTER[zeitfenster];
  const h = jetzt.getHours();
  return h >= von && h < bis;
}

/** Name grob in Vor- und Nachname teilen (für „als Betreuungsanfrage erfassen“) */
export function nameTeilen(name: string): { vorname: string; nachname: string } {
  const teile = name.trim().split(/\s+/);
  if (teile.length < 2) return { vorname: teile[0] ?? "", nachname: "" };
  return { vorname: teile.slice(0, -1).join(" "), nachname: teile.at(-1)! };
}
