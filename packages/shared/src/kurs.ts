/**
 * Kurse (M12): Kursarten, Formate und die Abrechnung von Kurseinheiten nach dem Hebammenhilfevertrag
 * (Geburtsvorbereitung 401/402, Rückbildung 403/404; je Versicherte in 5-Minuten-Einheiten, Formular 3.4).
 */
import { z } from "zod";
import { LEISTUNGSART_LABEL, LEISTUNGSTYP_LABEL, type Ergebnis, type Hinweis, type RegelwerkDaten, type RwFormularSpalte, type Zeile } from "./plausi";

export const KURS_ARTEN = {
  geburtsvorbereitung: "Geburtsvorbereitung",
  rueckbildung: "Rückbildung",
  babymassage: "Babymassage",
  eltern_kind: "Eltern-Kind-Kurs",
  sonstiges: "Sonstiger Kurs",
} as const;
export type KursArt = keyof typeof KURS_ARTEN;
/** Kurse, die mit der Krankenkasse abgerechnet werden können */
export const KASSEN_KURSE: KursArt[] = ["geburtsvorbereitung", "rueckbildung"];

/** Kursformat = Endziffer der GPOS bzw. Eintrag auf Formular 3.4 */
export const KURS_FORMATE = { 2: "Live in Präsenz", 3: "Live digital", 6: "Selbstlerneinheit (Video)" } as const;
export type KursFormat = 2 | 3 | 6;

/** Besuchstypen, unter denen Kurseinheiten je Versicherte gespeichert werden */
export type KursBesuchTyp = "geburtsvorbereitung" | "rueckbildung";
export const besuchTypLabel = (typ: string) =>
  (LEISTUNGSTYP_LABEL as Record<string, string>)[typ] ?? (typ === "geburtsvorbereitung" ? "Geburtsvorbereitungskurs" : typ === "rueckbildung" ? "Rückbildungskurs" : typ);
export const besuchArtLabel = (typ: string, art: number) =>
  typ === "geburtsvorbereitung" || typ === "rueckbildung" ? (KURS_FORMATE as Record<number, string>)[art] ?? String(art) : (LEISTUNGSART_LABEL as Record<number, string>)[art] ?? String(art);
export const istKursBesuch = (typ: string) => typ === "geburtsvorbereitung" || typ === "rueckbildung";

/** Leistungsgruppe (Stamm) einer Kurseinheit */
export const kursStamm = (art: KursBesuchTyp, einzel: boolean) => (art === "geburtsvorbereitung" ? (einzel ? "402" : "401") : einzel ? "404" : "403");

export type KursEingabe = { datum: string; von: string; bis: string; art: KursBesuchTyp; einzel: boolean; format: KursFormat };
/** Frühere Kurseinheiten der Versicherten (für Kontingent und Selbstlern-Anteil) */
export type KursKontext = { geburtsdatum: string | null; frueher: Array<{ stamm: string | null; art: number; einheiten: number }> };

const minuten = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
};
/** Letzter Tag, an dem Rückbildung abrechenbar ist: Ende des 9. Monats nach der Geburt */
export function rueckbildungBis(geburtsdatum: string): string {
  const [j, m, t] = geburtsdatum.split("-").map(Number);
  const d = new Date(Date.UTC(j!, m! - 1 + 9, t!));
  // Monatsüberlauf (z. B. 31.05. + 9 Monate) auf den Monatsletzten begrenzen
  if (d.getUTCDate() !== t) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

/** Abrechnung einer Kurseinheit für eine Versicherte. */
export function kursAbrechnen(e: KursEingabe, k: KursKontext, rw: RegelwerkDaten): Ergebnis {
  const hinweise: Hinweis[] = [];
  const stamm = kursStamm(e.art, e.einzel);
  const dauer = (minuten(e.bis) - minuten(e.von) + 1440) % 1440;
  const einheiten = Math.floor(dauer / 5);
  const ergebnis: Ergebnis = { stamm, lebenstag: null, ssw: null, einheiten, einheitenAbrechenbar: 0, zeilen: [], summe: 0, hinweise, formularzeile: null, materialAbgerechnet: [] };
  if (einheiten < 1) {
    hinweise.push({ stufe: "fehler", text: "Die Dauer muss mindestens 5 Minuten betragen." });
    return ergebnis;
  }
  if (e.art === "geburtsvorbereitung" && k.geburtsdatum && e.datum >= k.geburtsdatum) {
    hinweise.push({ stufe: "fehler", text: "Geburtsvorbereitung ist nach der Geburt nicht mehr abrechenbar." });
    return ergebnis;
  }
  if (e.art === "rueckbildung") {
    if (!k.geburtsdatum || e.datum < k.geburtsdatum) {
      hinweise.push({ stufe: "fehler", text: "Rückbildung ist erst nach der Geburt abrechenbar (Kind mit Geburtsdatum in der Akte erfassen)." });
      return ergebnis;
    }
    if (e.datum > rueckbildungBis(k.geburtsdatum)) {
      hinweise.push({ stufe: "fehler", text: `Rückbildung nur bis Ende des 9. Monats nach der Geburt (bis ${rueckbildungBis(k.geburtsdatum).split("-").reverse().join(".")}).` });
      return ergebnis;
    }
  }
  const gpos = `${stamm}0${e.format}`;
  const p = rw.positionen.find((x) => x.gpos === gpos);
  if (!p || p.betrag == null) {
    hinweise.push({ stufe: "fehler", text: `Position ${gpos} ist im Regelwerk nicht vorhanden.` });
    return ergebnis;
  }

  // Kontingent je Versicherte (z. B. Geburtsvorbereitung Gruppe 14 Stunden) und höchstens die Hälfte als Selbstlerneinheit
  let abrechenbar = einheiten;
  const kont = rw.kontingente.find((x) => x.id === stamm);
  const bisher = k.frueher.filter((f) => f.stamm === stamm);
  if (kont?.einheiten_gesamt) {
    const rest = Math.max(0, kont.einheiten_gesamt - bisher.reduce((n, f) => n + f.einheiten, 0));
    if (abrechenbar > rest) {
      hinweise.push({ stufe: rest ? "warnung" : "fehler", text: `${kont.name}: höchstens ${(kont.einheiten_gesamt * 5) / 60} Stunden je Versicherte – noch ${rest * 5} Minuten abrechenbar.` });
      abrechenbar = rest;
    }
    if (e.format === 6 && kont.selbstlern_max_anteil) {
      const maxSelbst = Math.floor(kont.einheiten_gesamt * kont.selbstlern_max_anteil);
      const restSelbst = Math.max(0, maxSelbst - bisher.filter((f) => f.art === 6).reduce((n, f) => n + f.einheiten, 0));
      if (abrechenbar > restSelbst) {
        hinweise.push({ stufe: restSelbst ? "warnung" : "fehler", text: `Selbstlerneinheiten höchstens ${(maxSelbst * 5) / 60} Stunden – noch ${restSelbst * 5} Minuten abrechenbar.` });
        abrechenbar = restSelbst;
      }
    }
  }
  if (e.einzel) hinweise.push({ stufe: "warnung", text: "Einzelunterweisung nur mit Begründung (Gründe 1–5 laut Vertrag) – im Vermerk angeben." });
  if (e.format === 6) hinweise.push({ stufe: "info", text: "Selbstlerneinheit: auf dem Formular Datum der Bereitstellung, keine „Uhrzeit von“, Dauer des Videos bei „Uhrzeit bis“." });

  ergebnis.einheitenAbrechenbar = abrechenbar;
  if (abrechenbar > 0) {
    const zeile: Zeile = {
      gpos,
      bezeichnung: p.bezeichnung,
      menge: abrechenbar,
      einheit: "5min",
      einzelbetrag: p.betrag,
      betrag: Math.round(abrechenbar * p.betrag * 100) / 100,
      zuschlag: false,
      formular: p.formular ?? "3.4",
      quittierungspflichtig: p.quittierungspflichtig ?? true,
    };
    ergebnis.zeilen.push(zeile);
    ergebnis.summe = zeile.betrag;
  }
  const f = rw.formulare["3.4"] as { spalten: RwFormularSpalte[] } | undefined;
  const spalte = f?.spalten.find((s) => s.gruppen.some((g) => g.startsWith(stamm)));
  if (spalte) ergebnis.formularzeile = { formular: "3.4", spalte: spalte.label, eintrag: String(e.format) };
  return ergebnis;
}

// ------------------------------------------------------------------ Eingaben
const uhrzeit = z.string().regex(/^\d{2}:\d{2}$/, "Uhrzeit HH:MM");
export const kursSchema = z.object({
  titel: z.string().trim().min(3).max(80),
  art: z.enum(Object.keys(KURS_ARTEN) as [KursArt, ...KursArt[]]),
  einzel: z.boolean().default(false),
  abrechnung: z.enum(["kasse", "selbstzahler"]),
  ort: z.string().trim().max(120).default("Praxis"),
  maxTeilnehmer: z.number().int().min(1).max(30),
  preis: z.number().min(0).max(9999).nullable().default(null),
  partnerPreis: z.number().min(0).max(9999).nullable().default(null),
  beschreibung: z.string().trim().max(1000).nullable().default(null),
  leitung: z.array(z.string().uuid()).min(1, "Mindestens eine Kursleitung"),
  anmeldungOffen: z.boolean().default(false),
  status: z.enum(["geplant", "laufend", "abgeschlossen", "abgesagt"]).default("geplant"),
});
export type KursEingabeDaten = z.infer<typeof kursSchema>;

export const kursterminSchema = z.object({
  datum: z.iso.date(),
  von: uhrzeit,
  bis: uhrzeit,
  format: z.union([z.literal(2), z.literal(3), z.literal(6)]),
  hebammeId: z.string().uuid(),
  thema: z.string().trim().max(120).nullable().default(null),
});

export const teilnahmeSchema = z.object({
  klientinId: z.string().uuid().nullable().default(null),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(200).nullable().default(null),
  telefon: z.string().trim().max(60).nullable().default(null),
  /** ET (Geburtsvorbereitung) bzw. Geburtsdatum des Kindes (Rückbildung, Babymassage) */
  stichtag: z.iso.date().nullable().default(null),
  partner: z.boolean().default(false),
  status: z.enum(["angemeldet", "bestaetigt", "warteliste", "storniert"]).default("bestaetigt"),
  bezahlt: z.boolean().default(false),
  notiz: z.string().trim().max(500).nullable().default(null),
});

/** Öffentliche Anmeldung über die Website (ohne Konto) */
export const onlineAnmeldungSchema = z.object({
  name: z.string().trim().min(3).max(120),
  email: z.email().max(200),
  telefon: z.string().trim().max(60).nullable().default(null),
  stichtag: z.iso.date().nullable().default(null),
  krankenkasse: z.string().trim().max(120).nullable().default(null),
  partner: z.boolean().default(false),
  nachricht: z.string().trim().max(1000).nullable().default(null),
  einwilligung: z.literal(true, { message: "Bitte der Verarbeitung der Angaben zustimmen." }),
  /** Honigtopf gegen Formular-Spam: muss leer bleiben */
  webseite: z.string().max(0).optional(),
});

export const anwesenheitSchema = z.object({
  eintraege: z.array(
    z.object({
      teilnahmeId: z.string().uuid(),
      anwesend: z.boolean(),
      unterschrift: z.union([
        z.object({ art: z.literal("keine") }),
        z.object({ art: z.literal("papier"), zeitpunkt: z.string() }),
        z.object({ art: z.literal("tablet"), zeitpunkt: z.string(), bild: z.string().startsWith("data:image/png;base64,").max(200_000), name: z.string().nullable().optional() }),
      ]),
    }),
  ),
  abschliessen: z.boolean().default(false),
});
