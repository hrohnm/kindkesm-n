import { z } from "zod";
import { LEISTUNGSTYPEN } from "./plausi";

const leerZuNull = (v: unknown) => (v === "" || v === undefined ? null : v);
const optText = (max = 300) => z.preprocess(leerZuNull, z.string().trim().max(max).nullable());
const optZahl = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === undefined || v === null ? null : Number(String(v).replace(",", "."))), z.number().min(min).max(max).nullable());
const uhrzeit = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Uhrzeit im Format HH:MM");
const optDatum = z.preprocess(leerZuNull, z.iso.date().nullable());

export const BETREUUNG_STATUS = ["anfrage", "schwangerschaft", "wochenbett", "abgeschlossen"] as const;
export type BetreuungStatus = (typeof BETREUUNG_STATUS)[number];
export const BETREUUNG_STATUS_LABEL: Record<BetreuungStatus, string> = {
  anfrage: "Anfrage",
  schwangerschaft: "Schwangerschaft",
  wochenbett: "Wochenbett",
  abgeschlossen: "Abgeschlossen",
};

export const klientinSchema = z.object({
  vorname: z.string().trim().min(1, "Bitte Vornamen angeben.").max(80),
  nachname: z.string().trim().min(1, "Bitte Nachnamen angeben.").max(80),
  geburtsdatum: optDatum,
  strasse: optText(120),
  plz: z.preprocess(leerZuNull, z.string().regex(/^\d{5}$/, "5-stellige PLZ").nullable()),
  ort: optText(80),
  telefon: optText(40),
  email: z.preprocess(leerZuNull, z.email("Ungültige E-Mail-Adresse").nullable()),
  krankenkasse: optText(120),
  kassenIk: z.preprocess(leerZuNull, z.string().regex(/^\d{9}$/, "Das Kassen-IK hat 9 Ziffern.").nullable()),
  versichertennummer: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toUpperCase() || null : v ?? null),
    z.string().regex(/^[A-Z]\d{9}$/, "Ein Buchstabe und 9 Ziffern (z. B. A123456789).").nullable(),
  ),
  hinweise: optText(1000),
  zustaendigeHebammeId: z.string().uuid("Bitte zuständige Hebamme wählen."),
});
export type KlientinEingabe = z.infer<typeof klientinSchema>;

/** Art der Geburt (gespeichert ist der Schlüssel; ältere Freitexte bleiben lesbar) */
export const GEBURTSMODI = {
  spontan: "Spontangeburt",
  vaginal_operativ: "Vaginal-operativ (Saugglocke/Zange)",
  sectio_primaer: "Primäre Sectio (geplant)",
  sectio_sekundaer: "Sekundäre Sectio",
  sectio_not: "Notsectio",
} as const;
export type Geburtsmodus = keyof typeof GEBURTSMODI;
export const geburtsmodusLabel = (m: string | null | undefined) => (m ? ((GEBURTSMODI as Record<string, string>)[m] ?? m) : null);
/** Kaiserschnitt? (auch für ältere Freitexte wie „Sectio“) */
export const istSectio = (m: string | null | undefined) => Boolean(m && (m.startsWith("sectio_") || /sectio|kaiserschnitt/i.test(m)));

export const betreuungSchema = z.object({
  status: z.enum(BETREUUNG_STATUS),
  et: optDatum,
  gravida: optZahl(1, 20),
  para: optZahl(0, 20),
  geburtsort: optText(120),
  geburtsmodus: optText(80),
  zustaendigeHebammeId: z.preprocess(leerZuNull, z.string().uuid().nullable()),
  vertretungHebammeId: z.preprocess(leerZuNull, z.string().uuid().nullable()).optional(),
  notizen: optText(2000),
});
export type BetreuungEingabe = z.infer<typeof betreuungSchema>;

export const neueKlientinSchema = klientinSchema.extend({ et: optDatum });

export const GESCHLECHTER = ["weiblich", "maennlich", "divers"] as const;
export const GESCHLECHT_LABEL: Record<(typeof GESCHLECHTER)[number], string> = { weiblich: "weiblich", maennlich: "männlich", divers: "divers" };

export const kindSchema = z.object({
  vorname: z.string().trim().min(1, "Bitte Vornamen angeben.").max(80),
  nachname: optText(80),
  geburtsdatum: z.iso.date("Bitte Geburtsdatum angeben."),
  geburtszeit: z.preprocess(leerZuNull, uhrzeit.nullable()),
  geschlecht: z.preprocess(leerZuNull, z.enum(GESCHLECHTER).nullable()),
  geburtsgewicht: optZahl(300, 7000),
  laenge: optZahl(20, 70),
  kopfumfang: optZahl(15, 50),
  /** Art der Geburt – wird an der Betreuung gespeichert (beim Erfassen der Geburt bequem mit angeben) */
  geburtsmodus: optText(80).optional(),
});
export type KindEingabe = z.infer<typeof kindSchema>;

/** Dokumentation eines Besuchs (strukturierte Felder, alle optional). */
export const dokuMutterSchema = z
  .object({
    rrSys: optZahl(50, 250),
    rrDia: optZahl(30, 150),
    puls: optZahl(30, 220),
    temperatur: optZahl(34, 42),
    fundus: optText(120),
    lochien: optText(300),
    brust: optText(300),
    wunde: optText(300),
    sectionarbe: optText(300),
    befinden: optText(300),
  })
  .partial();

export const dokuKindSchema = z
  .object({
    gewicht: optZahl(300, 15000),
    laenge: optZahl(20, 110),
    kopfumfang: optZahl(15, 60),
    temperatur: optZahl(34, 42),
    haut: optText(300),
    nabel: optText(300),
    stillen: optText(300),
    ausscheidung: optText(300),
    notiz: optText(500),
  })
  .partial();

export const dokumentationSchema = z.object({
  mutter: dokuMutterSchema.default({}),
  kinder: z.record(z.string(), dokuKindSchema).default({}),
  notiz: optText(5000),
});
export type Dokumentation = z.infer<typeof dokumentationSchema>;

export const unterschriftSchema = z.discriminatedUnion("art", [
  z.object({ art: z.literal("keine") }),
  z.object({ art: z.literal("papier"), zeitpunkt: z.iso.datetime() }),
  z.object({
    art: z.literal("tablet"),
    zeitpunkt: z.iso.datetime(),
    bild: z.string().startsWith("data:image/png;base64,").max(400_000, "Unterschrift zu groß"),
    name: optText(120),
  }),
]);
export type Unterschrift = z.infer<typeof unterschriftSchema>;

export const besuchSchema = z.object({
  datum: z.iso.date(),
  von: uhrzeit,
  bis: uhrzeit,
  typ: z.enum(LEISTUNGSTYPEN as [string, ...string[]]),
  art: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  material: z.array(z.string().regex(/^\d{5}$/)).max(10).default([]),
  dokumentation: dokumentationSchema,
  unterschrift: unterschriftSchema.default({ art: "keine" }),
  abschliessen: z.boolean().default(false),
  /** Vom Gerät vergebene Kennung (offline angelegte Besuche): eine wiederholte Übertragung legt keinen zweiten Besuch an */
  id: z.string().uuid().optional(),
  /** Stand (geaendertAm), auf dem die Änderung beruht: Konflikterkennung zwischen zwei Geräten */
  stand: z.iso.datetime({ offset: true }).optional(),
});
export type BesuchFormular = z.infer<typeof besuchSchema>;

/** Auswahllisten für die schnelle Dokumentation auf dem Tablet. */
export const AUSWAHL = {
  lochien: ["rubra", "fusca", "flava", "alba", "unauffällig", "vermehrt", "übelriechend"],
  fundus: ["Nabelhöhe", "1 QF unter Nabel", "2 QF unter Nabel", "3 QF unter Nabel", "Symphyse", "nicht tastbar"],
  brust: ["weich", "gefüllt", "Milcheinschuss", "gerötet", "verhärtet", "wunde Mamillen"],
  wunde: ["reizlos", "gerötet", "geschwollen", "Naht intakt", "Hämatom", "schmerzhaft"],
  sectionarbe: ["reizlos", "trocken", "gerötet", "geschwollen", "nässend", "Hämatom", "schmerzhaft", "Fäden/Klammern liegen", "Fäden/Klammern entfernt"],
  haut: ["rosig", "leicht ikterisch", "deutlich ikterisch", "blass", "trocken", "Ausschlag"],
  nabel: ["trocken", "feucht", "abgefallen", "gerötet", "riecht"],
  stillen: ["voll gestillt", "teilgestillt", "Flasche", "Saugen gut", "Anlegeprobleme", "Zufüttern"],
  ausscheidung: ["Urin unauffällig", "Mekonium", "Übergangsstuhl", "Muttermilchstuhl", "Ziegelmehl"],
} as const;

// ------------------------------------------------------------------ Merkmale, Kontakte, Einwilligungen (M2)
export const FLAGGEN = {
  risiko: "Risiko",
  sozialdienst: "Sozialdienst / Jugendamt",
  dolmetscherin: "Dolmetscherin nötig",
  psyche: "Psychische Belastung",
  erstgebaerend: "Erstgebärend",
} as const;
export type Flagge = keyof typeof FLAGGEN;

export const merkmaleSchema = z.object({
  flaggen: z.array(z.enum(Object.keys(FLAGGEN) as [Flagge, ...Flagge[]])).max(10),
  sprache: optText(80),
  allergien: optText(300),
});

export const KONTAKT_ARTEN = {
  partner: "Partner/in, Begleitperson",
  gynaekologin: "Gynäkologin/Gynäkologe",
  kinderaerztin: "Kinderärztin/Kinderarzt",
  klinik: "Klinik",
  notfall: "Notfallkontakt",
  sonstige: "Sonstige",
} as const;
export type KontaktArt = keyof typeof KONTAKT_ARTEN;

export const kontaktSchema = z.object({
  art: z.enum(Object.keys(KONTAKT_ARTEN) as [KontaktArt, ...KontaktArt[]]),
  name: z.string().trim().min(2, "Bitte Namen angeben.").max(120),
  telefon: optText(40),
  email: z.preprocess(leerZuNull, z.email("Ungültige E-Mail-Adresse").nullable()),
  anschrift: optText(200),
  notiz: optText(300),
});

export const EINWILLIGUNG_ARTEN = {
  foto: { titel: "Fotos zur Dokumentation", text: "Fotos (z. B. Nabel, Naht, Haut) dürfen zur Dokumentation in der Akte gespeichert werden." },
  urkunde: { titel: "Kinderurkunde", text: "Daten aus der Betreuung (Geburtsdaten, Gewichtsverlauf) und ggf. ein Foto dürfen für die Kinderurkunde verwendet werden." },
  email: { titel: "Kontakt per E-Mail", text: "Die Hebamme darf per E-Mail Kontakt aufnehmen und Unterlagen (z. B. die Kinderurkunde) senden." },
  austausch: { titel: "Austausch mit Ärztinnen", text: "Die Hebamme darf sich mit der Gynäkologin bzw. Kinderärztin über die Betreuung austauschen." },
} as const;
export type EinwilligungArt = keyof typeof EINWILLIGUNG_ARTEN;
export const EINWILLIGUNG_FORM = { papier: "schriftlich (Papier)", muendlich: "mündlich", tablet: "auf dem Tablet unterschrieben" } as const;

export const einwilligungSchema = z
  .object({
    erteilt: z.boolean(),
    form: z.enum(["papier", "muendlich", "tablet"]),
    datum: z.iso.date(),
    unterschrift: z
      .object({ bild: z.string().startsWith("data:image/png;base64,").max(400_000, "Unterschrift zu groß"), zeitpunkt: z.iso.datetime() })
      .nullable()
      .default(null),
    notiz: optText(300),
  })
  .refine((e) => !e.erteilt || e.form !== "tablet" || e.unterschrift, { message: "Bitte auf dem Tablet unterschreiben lassen.", path: ["unterschrift"] });
