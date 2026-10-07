import { z } from "zod";

/** M17: Fotos in der Akte (Wundverlauf, Nabel, Haut …) – nur mit Einwilligung, verschlüsselt gespeichert */
export const FOTO_BEREICHE = {
  nabel: "Nabel",
  naht: "Naht/Damm",
  sectionarbe: "Kaiserschnittnarbe",
  brust: "Brust/Mamille",
  haut: "Haut",
  sonstiges: "Sonstiges",
} as const;
export type FotoBereich = keyof typeof FOTO_BEREICHE;

/** Bild als Data-URL (JPEG/PNG/WebP), höchstens ~4 MB */
export const FOTO_MAX_BYTES = 4 * 1024 * 1024;

export const fotoSchema = z.object({
  bild: z.string().regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Bitte ein Foto (JPEG, PNG oder WebP) aufnehmen."),
  bereich: z.enum(Object.keys(FOTO_BEREICHE) as [FotoBereich, ...FotoBereich[]]),
  kindId: z.preprocess((v) => (v === "" ? null : v), z.string().uuid().nullable()).default(null),
  besuchId: z.preprocess((v) => (v === "" ? null : v), z.string().uuid().nullable()).default(null),
  notiz: z.preprocess((v) => (typeof v === "string" && !v.trim() ? null : v), z.string().trim().max(300).nullable()).default(null),
});
export type FotoEingabe = z.infer<typeof fotoSchema>;

/** Data-URL → Typ und Bytes (oder null bei ungültigem Inhalt) */
export function dataUrlLesen(url: string): { typ: string; base64: string } | null {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(url);
  return m ? { typ: m[1]!, base64: m[2]! } : null;
}
