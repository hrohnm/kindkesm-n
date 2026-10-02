/**
 * Kinderurkunde (M10): Textvorlagen mit Platzhaltern, Tabelle aus der Hebammenzeit, Sternzeichen.
 * Die Urkunde ist ein Geschenk an die Familie – nur Anzeige, keine medizinische Bewertung.
 */
import { z } from "zod";

export const URKUNDE_DESIGNS = { ostsee: "Ostsee (Wellen)", leuchtturm: "Leuchtturm", schlicht: "Schlicht" } as const;
export type UrkundeDesign = keyof typeof URKUNDE_DESIGNS;

/** Platzhalter: {liebe} (Lieber/Liebe) {vorname} {datum} {uhrzeit} {ort} {gewicht} {laenge} {hebamme} {geschwister} */
export const URKUNDE_TEXTE: ReadonlyArray<{ id: string; name: string; text: string }> = [
  {
    id: "warm",
    name: "Warm",
    text:
      "{liebe} {vorname}, am {datum}{uhrzeit} bist du{ort} auf die Welt gekommen und hast deine Familie zur glücklichsten der Welt gemacht. " +
      "In den ersten Wochen durfte ich dich und deine Eltern begleiten: Du hast tapfer getrunken, fleißig zugenommen und uns mit deinem ersten Lächeln beschenkt. " +
      "Nun bist du groß genug, und meine Zeit als deine Kindkes-Möön ist vorbei. Ich wünsche dir eine wunderbare Zukunft!\n– Deine Hebamme {hebamme}",
  },
  {
    id: "kurz",
    name: "Kurz",
    text: "Willkommen auf der Welt, {vorname}! Geboren am {datum}{uhrzeit}{ort}. Es war mir eine Freude, dich und deine Familie in den ersten Wochen zu begleiten.\n– {hebamme}",
  },
  {
    id: "platt",
    name: "Mit plattdeutschem Gruß",
    text:
      "Moin, lütt {vorname}! Am {datum}{uhrzeit} büst du{ort} op de Welt kamen. " +
      "In dien ersten Weken heff ik di un dien Öllern begleiten dörft – du hest fein drunken un düchtig tonahmen. Allens Gode för di!\n– Dien Hebamm {hebamme}",
  },
  {
    id: "mehrlinge",
    name: "Für Mehrlinge",
    text:
      "{liebe} {vorname}, am {datum}{uhrzeit} bist du{ort} gemeinsam mit {geschwister} auf die Welt gekommen – doppeltes Glück für deine Familie! " +
      "Ich durfte euch in den ersten Wochen begleiten und habe gesehen, wie ihr jeden Tag ein Stückchen gewachsen seid. Alles Liebe für euren gemeinsamen Weg!\n– Deine Hebamme {hebamme}",
  },
  {
    id: "geschwister",
    name: "Für Geschwisterkinder",
    text:
      "{liebe} {vorname}, am {datum}{uhrzeit} bist du{ort} auf die Welt gekommen und hast deine Familie größer und noch fröhlicher gemacht. " +
      "Schön, dass ich nun auch dich in deinen ersten Wochen begleiten durfte. Alles Gute für dich und deine großen Geschwister!\n– Deine Hebamme {hebamme}",
  },
];

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
/** „20. September 2026“ */
export const datumLang = (iso: string) => `${Number(iso.slice(8, 10))}. ${MONATE[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

export type UrkundeWerte = {
  vorname: string;
  geburtsdatum: string;
  geburtszeit?: string | null;
  ort?: string | null;
  geburtsgewicht?: number | null;
  laenge?: number | null;
  hebamme: string;
  geschwister?: string[];
  geschlecht?: string | null;
};

/** Setzt die Platzhalter einer Textvorlage ein; fehlende Angaben (Uhrzeit, Ort) fallen samt Füllwort weg. */
export function urkundeText(vorlage: string, w: UrkundeWerte): string {
  const geschwister = w.geschwister?.length ? w.geschwister.join(" und ") : "deinem Geschwisterchen";
  return vorlage
    .replaceAll("{liebe}", w.geschlecht === "maennlich" ? "Lieber" : w.geschlecht === "weiblich" ? "Liebe" : "Liebe/r")
    .replaceAll("{vorname}", w.vorname)
    .replaceAll("{datum}", datumLang(w.geburtsdatum))
    .replaceAll("{uhrzeit}", w.geburtszeit ? ` um ${w.geburtszeit.slice(0, 5)} Uhr` : "")
    .replaceAll("{ort}", w.ort ? ` in ${w.ort}` : "")
    .replaceAll("{gewicht}", w.geburtsgewicht ? `${w.geburtsgewicht.toLocaleString("de-DE")} g` : "")
    .replaceAll("{laenge}", w.laenge ? `${w.laenge.toLocaleString("de-DE")} cm` : "")
    .replaceAll("{hebamme}", w.hebamme)
    .replaceAll("{geschwister}", geschwister);
}

/** Beginn je Sternzeichen (MM-TT, übliche tropische Einteilung) */
const STERNZEICHEN: Array<[string, string]> = [
  ["01-20", "Wassermann"], ["02-19", "Fische"], ["03-21", "Widder"], ["04-20", "Stier"], ["05-21", "Zwillinge"], ["06-21", "Krebs"],
  ["07-23", "Löwe"], ["08-23", "Jungfrau"], ["09-23", "Waage"], ["10-23", "Skorpion"], ["11-22", "Schütze"], ["12-22", "Steinbock"],
];
export function sternzeichen(iso: string): string {
  const md = iso.slice(5, 10);
  let ergebnis = "Steinbock"; // 01.01.–19.01.
  for (const [ab, name] of STERNZEICHEN) if (md >= ab) ergebnis = name;
  return ergebnis;
}

export const urkundeZeileSchema = z.object({
  datum: z.iso.date(),
  lebenstag: z.number().int(),
  gewicht: z.number().positive().nullable().optional(),
  laenge: z.number().positive().nullable().optional(),
  kopfumfang: z.number().positive().nullable().optional(),
  besonderes: z.string().max(80).nullable().optional(),
});
export type UrkundeZeile = z.infer<typeof urkundeZeileSchema>;

export const urkundeSchema = z.object({
  design: z.enum(["ostsee", "leuchtturm", "schlicht"]),
  textVorlage: z.string().max(40),
  titel: z.string().trim().min(1).max(60),
  text: z.string().trim().min(1).max(1500),
  zeilen: z.array(urkundeZeileSchema).max(30),
  meilensteine: z.array(z.object({ datum: z.iso.date().nullable().optional(), text: z.string().trim().min(1).max(80) })).max(10),
  optionen: z.object({
    kurve: z.boolean(),
    perzentilen: z.boolean(),
    sternzeichen: z.boolean(),
    unterschrift: z.boolean(),
    kursHinweis: z.boolean(),
  }),
  status: z.enum(["entwurf", "fertig"]),
});
export type Urkunde = z.infer<typeof urkundeSchema>;

export type MessungTag = { datum: string; gewicht?: number; laenge?: number; kopfumfang?: number };

/**
 * Tabelle aus der Hebammenzeit: Geburt, je Besuchstag die Messwerte, markante Ereignisse.
 * Mehrere Werte am selben Tag werden zusammengefasst (der letzte gewinnt).
 */
export function urkundeZeilenVorschlag(
  geburt: { datum: string; gewicht?: number | null; laenge?: number | null; kopfumfang?: number | null },
  messungen: MessungTag[],
  abschluss?: string | null,
): UrkundeZeile[] {
  const tagNr = (iso: string) => Math.round(Date.parse(`${iso}T12:00:00Z`) / 86_400_000);
  const jeTag = new Map<string, UrkundeZeile>();
  const zeile = (datum: string) => {
    let z = jeTag.get(datum);
    if (!z) jeTag.set(datum, (z = { datum, lebenstag: tagNr(datum) - tagNr(geburt.datum) + 1, gewicht: null, laenge: null, kopfumfang: null, besonderes: null }));
    return z;
  };
  const g = zeile(geburt.datum);
  Object.assign(g, { gewicht: geburt.gewicht ?? null, laenge: geburt.laenge ?? null, kopfumfang: geburt.kopfumfang ?? null, besonderes: "Geburt" });
  for (const m of [...messungen].filter((x) => x.datum >= geburt.datum).sort((a, b) => a.datum.localeCompare(b.datum))) {
    const z = zeile(m.datum);
    if (m.gewicht) z.gewicht = m.gewicht;
    if (m.laenge) z.laenge = m.laenge;
    if (m.kopfumfang) z.kopfumfang = m.kopfumfang;
  }
  const liste = [...jeTag.values()].filter((z) => z.gewicht || z.laenge || z.kopfumfang || z.besonderes).sort((a, b) => a.datum.localeCompare(b.datum));
  if (geburt.gewicht) {
    const wieder = liste.find((z) => z.datum > geburt.datum && z.gewicht && z.gewicht >= geburt.gewicht!);
    if (wieder && !wieder.besonderes) wieder.besonderes = "Geburtsgewicht wieder erreicht";
  }
  const letzte = liste.at(-1);
  if (abschluss && letzte && letzte.datum === abschluss && !letzte.besonderes) letzte.besonderes = "Abschluss";
  return liste;
}

/** Auswahl „nur Wochenwerte“: Geburt, besondere Zeilen und je Lebenswoche der letzte Messwert. */
export function nurWochenwerte(zeilen: UrkundeZeile[]): UrkundeZeile[] {
  const jeWoche = new Map<number, UrkundeZeile>();
  for (const z of zeilen) if (!z.besonderes) jeWoche.set(Math.floor((z.lebenstag - 1) / 7), z);
  const behalten = new Set([...zeilen.filter((z) => z.besonderes), ...jeWoche.values()]);
  return zeilen.filter((z) => behalten.has(z));
}
