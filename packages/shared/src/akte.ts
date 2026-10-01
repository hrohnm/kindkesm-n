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

export const betreuungSchema = z.object({
  status: z.enum(BETREUUNG_STATUS),
  et: optDatum,
  gravida: optZahl(1, 20),
  para: optZahl(0, 20),
  geburtsort: optText(120),
  geburtsmodus: optText(80),
  zustaendigeHebammeId: z.preprocess(leerZuNull, z.string().uuid().nullable()),
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
    lochien: optText(120),
    brust: optText(200),
    wunde: optText(200),
    befinden: optText(300),
  })
  .partial();

export const dokuKindSchema = z
  .object({
    gewicht: optZahl(300, 15000),
    laenge: optZahl(20, 110),
    kopfumfang: optZahl(15, 60),
    temperatur: optZahl(34, 42),
    haut: optText(80),
    nabel: optText(120),
    stillen: optText(200),
    ausscheidung: optText(120),
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
});
export type BesuchFormular = z.infer<typeof besuchSchema>;

/** Auswahllisten für die schnelle Dokumentation auf dem Tablet. */
export const AUSWAHL = {
  lochien: ["rubra", "fusca", "flava", "alba", "unauffällig", "vermehrt"],
  fundus: ["Nabelhöhe", "1 QF unter Nabel", "2 QF unter Nabel", "3 QF unter Nabel", "Symphyse", "nicht tastbar"],
  brust: ["weich", "gefüllt", "Milcheinschuss", "gerötet", "wunde Mamillen"],
  wunde: ["reizlos", "gerötet", "geschwollen", "Naht intakt", "Sectio reizlos"],
  haut: ["rosig", "leicht ikterisch", "deutlich ikterisch", "blass"],
  nabel: ["trocken", "feucht", "abgefallen", "gerötet"],
  stillen: ["voll gestillt", "teilgestillt", "Flasche", "Saugen gut", "Anlegeprobleme"],
  ausscheidung: ["Urin unauffällig", "Mekonium", "Übergangsstuhl", "Muttermilchstuhl"],
} as const;
