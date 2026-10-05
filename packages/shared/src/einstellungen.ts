import { z } from "zod";

/** Status einer Hebamme in der Praxis. */
export const HEBAMME_STATUS = ["aktiv", "babypause", "ausgeschieden"] as const;
export type HebammeStatus = (typeof HEBAMME_STATUS)[number];
export const HEBAMME_STATUS_LABEL: Record<HebammeStatus, string> = {
  aktiv: "Aktiv",
  babypause: "Babypause",
  ausgeschieden: "Ausgeschieden",
};

/** Rolle eines Benutzerkontos. */
export const ROLLEN = ["hebamme", "buero"] as const;
export type Rolle = (typeof ROLLEN)[number];

/** Art eines Orts (Start- und Endpunkte der Touren). */
export const ORT_TYPEN = ["privat", "schule", "kita", "praxis", "sonstiges"] as const;
export type OrtTyp = (typeof ORT_TYPEN)[number];
export const ORT_TYP_LABEL: Record<OrtTyp, string> = {
  privat: "Private Anschrift",
  schule: "Schule",
  kita: "Kita",
  praxis: "Praxis",
  sonstiges: "Sonstiges",
};

/** Abrechnungsweg je Hebamme (jede rechnet einzeln ab). */
export const ABRECHNUNGSWEGE = ["hebset", "andere_abrechnungsstelle", "selbst"] as const;
export type Abrechnungsweg = (typeof ABRECHNUNGSWEGE)[number];
export const ABRECHNUNGSWEG_LABEL: Record<Abrechnungsweg, string> = {
  hebset: "HebSet (Papierversand)",
  andere_abrechnungsstelle: "Andere Abrechnungsstelle",
  selbst: "Selbst abrechnen",
};
export const ABRECHNUNGSWEG_HINWEIS: Record<Abrechnungsweg, string> = {
  hebset: "Unterlagen gehen per Post an die hebset KG.",
  andere_abrechnungsstelle: "Gleiche Unterlagen, Empfänger und Anschrift frei wählbar.",
  selbst:
    "Die App liefert alle Unterlagen. Die elektronische Übermittlung an die Kassen (§ 302 SGB V) erfolgt mit externer zertifizierter Software, sonst droht eine Kürzung von bis zu 5 % (Anlage 2 § 2).",
};

export const HEBSET_ANSCHRIFT = { name: "hebset KG", anschrift: "Lindauer Straße 38, 86845 Großaitingen" };

/** Belegart: selbst gedrucktes amtliches Formular oder Durchschreibesatz. */
export const BELEGARTEN = ["eigendruck_amtliches_formular", "durchschreibesatz"] as const;
export type Belegart = (typeof BELEGARTEN)[number];
export const BELEGART_LABEL: Record<Belegart, string> = {
  eigendruck_amtliches_formular: "Eigendruck amtliches Formular (3.1–3.5)",
  durchschreibesatz: "Durchschreibesatz der Abrechnungsstelle",
};

/** Unterschriftsverfahren für die Versichertenbestätigung. */
export const UNTERSCHRIFTSVERFAHREN = ["papier", "tablet"] as const;
export type Unterschriftsverfahren = (typeof UNTERSCHRIFTSVERFAHREN)[number];
export const UNTERSCHRIFT_LABEL: Record<Unterschriftsverfahren, string> = {
  papier: "Auf Papier",
  tablet: "Auf dem Tablet",
};

/**
 * Versandrhythmus. Der Vertrag (Anlage 2 § 2) erlaubt höchstens eine Einreichung je Monat
 * und verlangt mindestens zwei je Jahr; kürzere oder längere Rhythmen gibt es deshalb nicht.
 */
export const VERSANDRHYTHMEN = ["monatlich", "zweimonatlich", "quartalsweise", "halbjaehrlich"] as const;
export type Versandrhythmus = (typeof VERSANDRHYTHMEN)[number];
export const VERSANDRHYTHMUS_LABEL: Record<Versandrhythmus, string> = {
  monatlich: "Monatlich (vertragliches Maximum)",
  zweimonatlich: "Alle zwei Monate",
  quartalsweise: "Quartalsweise",
  halbjaehrlich: "Halbjährlich (vertragliches Minimum)",
};
/** Versandmonate (1-12) je Rhythmus. */
export const VERSANDMONATE: Record<Versandrhythmus, number[]> = {
  monatlich: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  zweimonatlich: [1, 3, 5, 7, 9, 11],
  quartalsweise: [1, 4, 7, 10],
  halbjaehrlich: [1, 7],
};

const uhrzeit = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Uhrzeit im Format HH:MM");
const leerZuNull = (v: unknown) => (v === "" ? null : v);

export const ikSchema = z
  .string()
  .regex(/^45\d{7}$/, "Das IK einer Hebamme hat 9 Ziffern und beginnt mit 45 (Anlage 2 § 1).");

export const abrechnungseinstellungSchema = z
  .object({
    weg: z.enum(ABRECHNUNGSWEGE),
    abrechnungsstelleName: z.string().trim().max(200).nullable(),
    abrechnungsstelleAnschrift: z.string().trim().max(300).nullable(),
    belegart: z.enum(BELEGARTEN),
    unterschrift: z.enum(UNTERSCHRIFTSVERFAHREN),
    versandRhythmus: z.enum(VERSANDRHYTHMEN),
    versandTag: z.number().int().min(1).max(28),
    erinnerungVorlaufTage: z.number().int().min(0).max(14),
  })
  .superRefine((v, ctx) => {
    if (v.weg === "andere_abrechnungsstelle" && !v.abrechnungsstelleName) {
      ctx.addIssue({ code: "custom", path: ["abrechnungsstelleName"], message: "Bitte Name der Abrechnungsstelle angeben." });
    }
  });
export type Abrechnungseinstellung = z.infer<typeof abrechnungseinstellungSchema>;

export const hebammeProfilSchema = z.object({
  name: z.string().trim().min(2).max(120),
  kuerzel: z.string().trim().min(1).max(4).toUpperCase(),
  telefon: z.preprocess(leerZuNull, z.string().trim().max(40).nullable()),
  ik: z.preprocess(leerZuNull, ikSchema.nullable()),
  status: z.enum(HEBAMME_STATUS),
  babypauseBis: z.preprocess(leerZuNull, z.iso.date().nullable()),
  /** Kapazität im Belegungsplan (M11): neue Wochenbetten pro ET-Monat */
  wochenbettenProMonat: z.coerce.number().int().min(0, "Mindestens 0").max(20, "Höchstens 20").default(4),
});
export type HebammeProfil = z.infer<typeof hebammeProfilSchema>;

export const ortSchema = z.object({
  bezeichnung: z.string().trim().min(1).max(80),
  typ: z.enum(ORT_TYPEN),
  anschrift: z.string().trim().min(5).max(200),
  abholzeit: z.preprocess(leerZuNull, uhrzeit.nullable()),
});
export type OrtEingabe = z.infer<typeof ortSchema>;

export const tourvorlageSchema = z.object({
  name: z.string().trim().min(1).max(80),
  wochentage: z.array(z.number().int().min(1).max(7)).min(1, "Mindestens einen Wochentag wählen."),
  startOrtId: z.string().uuid(),
  endeOrtId: z.string().uuid(),
  endeSpaetestens: z.preprocess(leerZuNull, uhrzeit.nullable()),
  startZeit: uhrzeit.default("08:00"),
  wegegeldAusgangsOrtId: z.string().uuid(),
});
export type TourvorlageEingabe = z.infer<typeof tourvorlageSchema>;

/** Von Hand gesetzte Position (Karte); Bereich grob Norddeutschland */
export const positionSchema = z.object({
  lat: z.number().min(47).max(56),
  lon: z.number().min(5).max(16),
});

export const praxisSchema = z.object({
  name: z.string().trim().min(2).max(120),
  anschrift: z.string().trim().min(5).max(200),
  telefon: z.preprocess(leerZuNull, z.string().trim().max(40).nullable()),
  email: z.preprocess(leerZuNull, z.email().nullable()),
});
export type PraxisEingabe = z.infer<typeof praxisSchema>;

export const passwortAendernSchema = z.object({
  altesPasswort: z.string().min(1),
  neuesPasswort: z.string().min(12, "Mindestens 12 Zeichen."),
});

export const WOCHENTAGE_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;
