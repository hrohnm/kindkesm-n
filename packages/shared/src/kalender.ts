/**
 * M5: Teamkalender und Kalender-Abo (ICS). Für das Abo gilt: nur Initialen, keine Gesundheitsdaten
 * (keine Leistungsart, keine Notiz, keine Anschrift).
 */

import { TERMIN_FENSTER, type TerminZeit } from "./tour";

/** Uhrzeit „HH:MM“ plus Minuten */
export const uhrzeitPlus = (hhmm: string, minuten: number) => {
  const [h, m] = hhmm.split(":").map(Number);
  const gesamt = Math.min(24 * 60 - 1, (h ?? 0) * 60 + (m ?? 0) + minuten);
  return `${String(Math.floor(gesamt / 60)).padStart(2, "0")}:${String(gesamt % 60).padStart(2, "0")}`;
};

/** Zeitraum eines Termins für Kalender: feste Uhrzeit mit Dauer, Zeitfenster, Vormittag/Nachmittag oder ganztägig (null) */
export function terminZeitraum(t: { zeit: TerminZeit; uhrzeit?: string | null; fruehestens?: string | null; spaetestens?: string | null; dauerMin: number }): { von: string; bis: string } | null {
  if (t.zeit === "fix" && t.uhrzeit) return { von: t.uhrzeit, bis: uhrzeitPlus(t.uhrzeit, t.dauerMin) };
  if (t.zeit === "fenster" && t.fruehestens) return { von: t.fruehestens, bis: t.spaetestens ?? uhrzeitPlus(t.fruehestens, t.dauerMin) };
  if (t.zeit === "vormittags" || t.zeit === "nachmittags") return { von: TERMIN_FENSTER[t.zeit][0], bis: TERMIN_FENSTER[t.zeit][1] };
  return null;
}

/** „Sophie Berger“ → „S. B.“ */
export const initialen = (vorname: string, nachname: string) =>
  [vorname, nachname]
    .map((n) => n.trim())
    .filter(Boolean)
    .map((n) => `${n[0]!.toUpperCase()}.`)
    .join(" ");

export type IcsEintrag = {
  uid: string;
  titel: string;
  ort?: string | null;
  /** ISO-Datum; bei ganztägigen Einträgen erster Tag */
  datum: string;
  von?: string | null;
  bis?: string | null;
  /** ganztägig: letzter Tag (einschließlich) */
  bisDatum?: string | null;
};

const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const kompakt = (iso: string) => iso.replaceAll("-", "");
const zeit = (hhmm: string) => `${hhmm.replace(":", "")}00`;
const tagDanach = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
const utcStempel = (d: Date) => `${d.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;

/** Zeilen nach RFC 5545 auf 75 Bytes falten */
function falten(zeile: string) {
  const teile: string[] = [];
  let rest = zeile;
  let erste = true;
  while (new TextEncoder().encode(rest).length > (erste ? 75 : 74)) {
    let n = erste ? 75 : 74;
    while (new TextEncoder().encode(rest.slice(0, n)).length > (erste ? 75 : 74)) n--;
    teile.push(rest.slice(0, n));
    rest = rest.slice(n);
    erste = false;
  }
  teile.push(rest);
  return teile.join("\r\n ");
}

const ZEITZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Berlin",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

/** ICS-Datei (iCalendar) für ein Kalender-Abo */
export function icsErzeugen(name: string, eintraege: IcsEintrag[], jetzt = new Date()): string {
  const zeilen = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kindkesmoeoen//Praxis-App//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsText(name)}`, "X-WR-TIMEZONE:Europe/Berlin", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", ...ZEITZONE];
  for (const e of eintraege) {
    zeilen.push("BEGIN:VEVENT", `UID:${e.uid}@kindkesmoeoen`, `DTSTAMP:${utcStempel(jetzt)}`);
    if (e.von) {
      zeilen.push(`DTSTART;TZID=Europe/Berlin:${kompakt(e.datum)}T${zeit(e.von)}`, `DTEND;TZID=Europe/Berlin:${kompakt(e.datum)}T${zeit(e.bis ?? uhrzeitPlus(e.von, 60))}`);
    } else {
      zeilen.push(`DTSTART;VALUE=DATE:${kompakt(e.datum)}`, `DTEND;VALUE=DATE:${kompakt(tagDanach(e.bisDatum ?? e.datum))}`, "TRANSP:TRANSPARENT");
    }
    zeilen.push(`SUMMARY:${icsText(e.titel)}`);
    if (e.ort) zeilen.push(`LOCATION:${icsText(e.ort)}`);
    zeilen.push("END:VEVENT");
  }
  zeilen.push("END:VCALENDAR");
  return `${zeilen.map(falten).join("\r\n")}\r\n`;
}
