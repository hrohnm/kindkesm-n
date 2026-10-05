/**
 * M11 – Betreuungsanfragen und Belegungsplan nach Entbindungstermin.
 *
 * Belegung je Hebamme und ET-Monat: Jede laufende Betreuung zählt in dem Monat ihres Geburtsdatums (bzw. ET).
 * Kapazität = „Wochenbetten pro Monat“ der Hebamme, anteilig gekürzt um Urlaub, Fortbildung und Babypause.
 * Die öffentliche Ampel fasst die freien Plätze der ganzen Praxis zusammen – ohne Personendaten.
 */
import { z } from "zod";

export const ANFRAGE_LEISTUNGEN = {
  vorsorge: "Schwangerschaftsvorsorge",
  wochenbett: "Wochenbettbetreuung",
  stillen: "Stillberatung",
  geburtsvorbereitung: "Geburtsvorbereitungskurs",
  rueckbildung: "Rückbildungskurs",
  sonstiges: "Sonstiges",
} as const;
export type AnfrageLeistung = keyof typeof ANFRAGE_LEISTUNGEN;
const LEISTUNG_KEYS = Object.keys(ANFRAGE_LEISTUNGEN) as [AnfrageLeistung, ...AnfrageLeistung[]];

export const ANFRAGE_STATUS = {
  neu: "Neu",
  in_pruefung: "In Prüfung",
  warteliste: "Warteliste",
  zugesagt: "Zugesagt",
  abgesagt: "Abgesagt",
  weitergeleitet: "Weitergeleitet",
} as const;
export type AnfrageStatus = keyof typeof ANFRAGE_STATUS;
/** Abgeschlossene Anfragen werden nach dieser Frist automatisch gelöscht (Datensparsamkeit). */
export const ANFRAGE_AUFBEWAHRUNG_TAGE = 180;

export const ABWESENHEIT_ARTEN = { urlaub: "Urlaub", fortbildung: "Fortbildung", krank: "Krankheit", sonstiges: "Sonstiges" } as const;
export type AbwesenheitArt = keyof typeof ABWESENHEIT_ARTEN;

const leer = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const textOderNull = (max: number) => z.preprocess(leer, z.string().trim().max(max).nullable().default(null));

const anfrageBasis = {
  vorname: z.string().trim().min(1, "Bitte Vornamen angeben.").max(80),
  nachname: z.string().trim().min(1, "Bitte Nachnamen angeben.").max(80),
  email: z.preprocess(leer, z.email("Bitte eine gültige E-Mail-Adresse angeben.").max(200).nullable().default(null)),
  telefon: textOderNull(60),
  et: z.iso.date({ message: "Bitte den (voraussichtlichen) Entbindungstermin angeben." }),
  strasse: textOderNull(120),
  plz: z.preprocess(leer, z.string().trim().regex(/^\d{5}$/, "Bitte eine 5-stellige PLZ angeben.").nullable().default(null)),
  ort: z.string().trim().min(2, "Bitte den Wohnort angeben.").max(80),
  erstesKind: z.boolean().nullable().default(null),
  leistungen: z.array(z.enum(LEISTUNG_KEYS)).max(LEISTUNG_KEYS.length).default([]),
  nachricht: textOderNull(1500),
};

/** Anfrage über die Website (ohne Konto) */
export const oeffentlicheAnfrageSchema = z
  .object({
    ...anfrageBasis,
    einwilligung: z.literal(true, { message: "Bitte der Verarbeitung deiner Angaben zustimmen." }),
    /** Honigtopf gegen Formular-Spam: muss leer bleiben */
    webseite: z.string().max(0).optional(),
  })
  .refine((a) => a.email || a.telefon, { message: "Bitte E-Mail oder Telefon angeben, damit wir antworten können.", path: ["email"] });
export type OeffentlicheAnfrage = z.infer<typeof oeffentlicheAnfrageSchema>;

/** Anfrage in der App erfassen (z. B. nach einem Anruf) */
export const anfrageSchema = z.object({ ...anfrageBasis, quelle: z.enum(["telefon", "manuell"]).default("telefon") });
export type AnfrageEingabe = z.infer<typeof anfrageSchema>;

export const anfrageAktionSchema = z.discriminatedUnion("aktion", [
  z.object({ aktion: z.literal("pruefen") }),
  z.object({ aktion: z.literal("warteliste"), notiz: textOderNull(1000) }),
  z.object({ aktion: z.literal("absagen"), notiz: textOderNull(1000) }),
  z.object({ aktion: z.literal("weiterleiten"), notiz: z.string().trim().min(2, "An wen weitergeleitet?").max(1000) }),
  z.object({ aktion: z.literal("zusagen"), hebammeId: z.string().uuid() }),
  z.object({ aktion: z.literal("notiz"), notiz: textOderNull(2000) }),
]);
export type AnfrageAktion = z.infer<typeof anfrageAktionSchema>;

export const abwesenheitSchema = z
  .object({
    von: z.iso.date(),
    bis: z.iso.date(),
    art: z.enum(Object.keys(ABWESENHEIT_ARTEN) as [AbwesenheitArt, ...AbwesenheitArt[]]),
    notiz: textOderNull(200),
  })
  .refine((a) => a.bis >= a.von, { message: "Das Ende liegt vor dem Beginn.", path: ["bis"] });
export type AbwesenheitEingabe = z.infer<typeof abwesenheitSchema>;

export const kapazitaetSchema = z.object({ wochenbettenProMonat: z.number().int().min(0).max(20) });

// ------------------------------------------------------------------ Datumshilfen
const TAG = 86_400_000;
const nr = (iso: string) => Math.round(Date.parse(`${iso}T12:00:00Z`) / TAG);
const iso = (n: number) => new Date(n * TAG).toISOString().slice(0, 10);

/** „2027-03“ → erster und letzter Tag */
export function monatsGrenzen(monat: string): [string, string] {
  const [j, m] = monat.split("-").map(Number) as [number, number];
  const ende = new Date(Date.UTC(j, m, 0)).toISOString().slice(0, 10);
  return [`${monat}-01`, ende];
}
/** Folge von Monaten ab einem Monat: monate("2026-11", 3) → ["2026-11", "2026-12", "2027-01"] */
export function monate(start: string, anzahl: number): string[] {
  const [j, m] = start.split("-").map(Number) as [number, number];
  return Array.from({ length: anzahl }, (_, i) => {
    const d = new Date(Date.UTC(j, m - 1 + i, 1));
    return d.toISOString().slice(0, 7);
  });
}
const MONATSNAMEN = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
export const monatsName = (monat: string) => `${MONATSNAMEN[Number(monat.slice(5, 7)) - 1]} ${monat.slice(0, 4)}`;

/** Überlappende Tage zweier Zeiträume (inklusive) */
export function ueberlappung(a: [string, string], b: [string, string]): number {
  const von = Math.max(nr(a[0]), nr(b[0]));
  const bis = Math.min(nr(a[1]), nr(b[1]));
  return Math.max(0, bis - von + 1);
}

// ------------------------------------------------------------------ Belegungsplan
export type HebammeKapazitaet = {
  id: string;
  name: string;
  kuerzel: string;
  status: "aktiv" | "babypause" | "ausgeschieden";
  babypauseBis: string | null;
  wochenbettenProMonat: number;
  abwesenheiten: Array<{ von: string; bis: string }>;
};
export type Stufe = "frei" | "knapp" | "voll" | "abwesend";
export type ZelleBelegung = { hebammeId: string; belegt: number; kapazitaet: number; frei: number; abwesendTage: number; stufe: Stufe };
export type MonatBelegung = {
  monat: string;
  je: ZelleBelegung[];
  gesamt: { belegt: number; kapazitaet: number; frei: number; stufe: Exclude<Stufe, "abwesend"> };
  /** noch offene Anfragen (neu, in Prüfung, Warteliste) mit ET in diesem Monat */
  offen: number;
};

/** Tage im Monat, an denen die Hebamme nicht verfügbar ist (Abwesenheiten und Babypause, ohne Doppelzählung) */
export function abwesendeTage(h: HebammeKapazitaet, monat: string): number {
  const [von, bis] = monatsGrenzen(monat);
  if (h.status === "ausgeschieden") return nr(bis) - nr(von) + 1;
  const tage = new Set<number>();
  const markieren = (a: string, b: string) => {
    for (let t = Math.max(nr(a), nr(von)); t <= Math.min(nr(b), nr(bis)); t++) tage.add(t);
  };
  for (const a of h.abwesenheiten) markieren(a.von, a.bis);
  if (h.status === "babypause") markieren(von, h.babypauseBis ?? bis);
  return tage.size;
}

export function effektiveKapazitaet(h: HebammeKapazitaet, monat: string): number {
  const [von, bis] = monatsGrenzen(monat);
  const tageImMonat = nr(bis) - nr(von) + 1;
  const anteil = 1 - abwesendeTage(h, monat) / tageImMonat;
  return Math.round(h.wochenbettenProMonat * anteil);
}

const stufeHebamme = (frei: number, kapazitaet: number): Stufe => (kapazitaet <= 0 ? "abwesend" : frei >= 2 ? "frei" : frei === 1 ? "knapp" : "voll");
const stufeGesamt = (frei: number): Exclude<Stufe, "abwesend"> => (frei >= 3 ? "frei" : frei >= 1 ? "knapp" : "voll");

export function belegungsplan(
  hebammen: HebammeKapazitaet[],
  betreuungen: Array<{ hebammeId: string | null; datum: string | null }>,
  offeneAnfragen: Array<{ et: string }>,
  startMonat: string,
  anzahl: number,
): MonatBelegung[] {
  return monate(startMonat, anzahl).map((monat) => {
    const imMonat = (datum: string | null) => datum?.slice(0, 7) === monat;
    const je = hebammen.map((h): ZelleBelegung => {
      const belegt = betreuungen.filter((b) => b.hebammeId === h.id && imMonat(b.datum)).length;
      const kapazitaet = effektiveKapazitaet(h, monat);
      const frei = Math.max(0, kapazitaet - belegt);
      return { hebammeId: h.id, belegt, kapazitaet, frei, abwesendTage: abwesendeTage(h, monat), stufe: stufeHebamme(frei, kapazitaet) };
    });
    const gesamt = { belegt: je.reduce((s, z) => s + z.belegt, 0), kapazitaet: je.reduce((s, z) => s + z.kapazitaet, 0), frei: je.reduce((s, z) => s + z.frei, 0) };
    return { monat, je, gesamt: { ...gesamt, stufe: stufeGesamt(gesamt.frei) }, offen: offeneAnfragen.filter((a) => imMonat(a.et)).length };
  });
}

/** Öffentliche Ampel je ET-Monat (nur Stufe, keine Zahlen) */
export type OeffentlicheKapazitaet = { monat: string; name: string; stufe: "frei" | "knapp" | "ausgebucht" };
export const oeffentlicheKapazitaet = (plan: MonatBelegung[]): OeffentlicheKapazitaet[] =>
  plan.map((m) => ({ monat: m.monat, name: monatsName(m.monat), stufe: m.gesamt.stufe === "voll" ? "ausgebucht" : m.gesamt.stufe }));

// ------------------------------------------------------------------ Vorschlag
/** Luftlinie in km (Haversine) */
export function luftlinieKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export type Vorschlag = { hebammeId: string; frei: number; kapazitaet: number; entfernungKm: number | null; abwesendUmEt: boolean; punkte: number; gruende: string[] };

/**
 * Welche Hebamme passt? Kriterien: freie Kapazität im ET-Monat, keine Abwesenheit rund um den ET
 * (2 Wochen vorher bis 4 Wochen danach) und Entfernung vom Wohnort der Hebamme.
 */
export function vorschlagen(
  anfrage: { et: string; position: { lat: number; lon: number } | null },
  hebammen: HebammeKapazitaet[],
  plan: MonatBelegung[],
  wohnorte: Record<string, { lat: number; lon: number } | null>,
): Vorschlag[] {
  const monat = plan.find((m) => m.monat === anfrage.et.slice(0, 7));
  const fenster: [string, string] = [iso(nr(anfrage.et) - 14), iso(nr(anfrage.et) + 28)];
  return hebammen
    .filter((h) => h.status !== "ausgeschieden")
    .map((h): Vorschlag => {
      const zelle = monat?.je.find((z) => z.hebammeId === h.id);
      const frei = zelle?.frei ?? 0;
      const kapazitaet = zelle?.kapazitaet ?? effektiveKapazitaet(h, anfrage.et.slice(0, 7));
      const abwesenheiten = [...h.abwesenheiten, ...(h.status === "babypause" ? [{ von: "1900-01-01", bis: h.babypauseBis ?? "9999-12-31" }] : [])];
      const abwesendUmEt = abwesenheiten.some((a) => ueberlappung([a.von, a.bis], fenster) > 0);
      const wohnort = wohnorte[h.id];
      const entfernungKm = anfrage.position && wohnort ? Math.round(luftlinieKm(anfrage.position, wohnort) * 10) / 10 : null;
      const gruende: string[] = [];
      if (kapazitaet <= 0) gruende.push(h.status === "babypause" ? "in Babypause" : "im ET-Monat nicht verfügbar");
      else gruende.push(frei > 0 ? `${frei} von ${kapazitaet} Plätzen frei im ET-Monat` : `ET-Monat ausgebucht (${kapazitaet} Plätze)`);
      if (abwesendUmEt && kapazitaet > 0) gruende.push("abwesend rund um den ET");
      if (entfernungKm !== null) gruende.push(`ca. ${entfernungKm.toLocaleString("de-DE")} km Luftlinie`);
      const punkte = (kapazitaet <= 0 ? -1000 : 0) + Math.min(frei, 3) * 30 - (frei === 0 ? 60 : 0) - (abwesendUmEt ? 50 : 0) - (entfernungKm ?? 15);
      return { hebammeId: h.id, frei, kapazitaet, entfernungKm, abwesendUmEt, punkte: Math.round(punkte), gruende };
    })
    .sort((a, b) => b.punkte - a.punkte);
}
