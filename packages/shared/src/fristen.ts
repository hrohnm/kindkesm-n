import { VERSANDMONATE, type Versandrhythmus } from "./einstellungen";

/** Datumsangaben als ISO-Strings (JJJJ-MM-TT) in lokaler Zeit, ohne Uhrzeit. */
export function isoDatum(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const t = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${t}`;
}

function datum(jahr: number, monat: number, tag: number): Date {
  return new Date(jahr, monat - 1, tag);
}

export function tageZwischen(von: Date, bis: Date): number {
  const a = datum(von.getFullYear(), von.getMonth() + 1, von.getDate()).getTime();
  const b = datum(bis.getFullYear(), bis.getMonth() + 1, bis.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Nächster Versandstichtag (heute eingeschlossen) für Rhythmus und Tag im Monat. */
export function naechsterVersandtermin(heute: Date, rhythmus: Versandrhythmus, tag: number): Date {
  const monate = VERSANDMONATE[rhythmus];
  for (let i = 0; i < 25; i++) {
    const kandidat = datum(heute.getFullYear(), heute.getMonth() + 1 + i, tag);
    if (monate.includes(kandidat.getMonth() + 1) && tageZwischen(heute, kandidat) >= 0) return kandidat;
  }
  throw new Error("Kein Versandtermin gefunden");
}

export type FristHinweis = {
  id: string;
  titel: string;
  datum: string;
  tage: number;
  stufe: "info" | "warnung" | "dringend";
  quelle: string;
};

/**
 * Abrechnungsfristen aus Anlage 2 des Hebammenhilfevertrags, die unabhängig von einzelnen Fällen gelten.
 * Fallbezogene Fristen (Wochenbett, Anordnung, Video-Signatur) kommen mit der Akte (Meilenstein 2/3).
 */
export function abrechnungsfristen(heute: Date, opts?: { rhythmus?: Versandrhythmus; versandTag?: number; vorlaufTage?: number }): FristHinweis[] {
  const jahr = heute.getFullYear();
  const hinweise: FristHinweis[] = [];

  // Ausschlussfrist 30.06. für Leistungen des Vorjahres, Erinnerungen ab 01.04.
  const ausschluss = datum(jahr, 6, 30);
  const tageAusschluss = tageZwischen(heute, ausschluss);
  if (tageAusschluss >= 0 && heute >= datum(jahr, 4, 1)) {
    hinweise.push({
      id: "ausschlussfrist",
      titel: `Ausschlussfrist: Leistungen aus ${jahr - 1} bis 30.06. abrechnen (Urbelege bis 07.07.)`,
      datum: isoDatum(ausschluss),
      tage: tageAusschluss,
      stufe: tageAusschluss <= 15 ? "dringend" : tageAusschluss <= 30 ? "warnung" : "info",
      quelle: "Anlage 2 § 2",
    });
  }

  // Beanstandungen der Kassen bis 30.09. für das Vorjahr
  const beanstandung = datum(jahr, 9, 30);
  const tageBeanstandung = tageZwischen(heute, beanstandung);
  if (tageBeanstandung >= 0 && tageBeanstandung <= 60) {
    hinweise.push({
      id: "beanstandung",
      titel: `Kassen können Leistungen aus ${jahr - 1} noch bis 30.09. beanstanden – Belege griffbereit halten`,
      datum: isoDatum(beanstandung),
      tage: tageBeanstandung,
      stufe: "info",
      quelle: "Anlage 2 § 5",
    });
  }

  // Persönlicher Versandstichtag
  if (opts?.rhythmus && opts.versandTag) {
    const termin = naechsterVersandtermin(heute, opts.rhythmus, opts.versandTag);
    const tage = tageZwischen(heute, termin);
    hinweise.push({
      id: "versand",
      titel: "Nächster Abrechnungsversand",
      datum: isoDatum(termin),
      tage,
      stufe: tage <= (opts.vorlaufTage ?? 2) ? "warnung" : "info",
      quelle: "Einstellung (Anlage 2 § 2: höchstens 1× je Monat, mindestens 2× je Jahr)",
    });
  }

  return hinweise.sort((a, b) => a.tage - b.tage);
}
