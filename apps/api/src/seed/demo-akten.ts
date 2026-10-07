/**
 * Fiktive Demo-Familien für Test-Umgebungen. Alle Namen, Anschriften und Versichertendaten sind ausgedacht.
 * Daten werden relativ zum heutigen Tag angelegt, damit Lebenstage und SSW immer plausibel sind.
 * Die Besuche laufen über die API, damit Leistungen genauso berechnet werden wie im Betrieb.
 */
import { appBauen } from "../app";
import type { Datenbank } from "../db/client";
import { and, eq } from "drizzle-orm";
import { besuch, klientin, termin } from "../db/schema";

const tag = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const papier = (datum: string, bis: string) => ({ art: "papier", zeitpunkt: new Date(`${datum}T${bis}:00`).toISOString() });
/** Fiktive Unterschrift (gezeichnete Linie) für Demo-Besuche mit Tablet-Unterschrift. */
const DEMO_UNTERSCHRIFT = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAaQAAAB4CAYAAAC9x4bVAAAFIUlEQVR42u3dO3LbShBAUVHlLShRrP2viLESLQKOXLZcIgkC8+mePid+pWcOgbkY4nfZtu0FAGZ7NQQACBIACBIAggQAggSAIAGAIAEgSAAgSAAIEgAIEgCCBACCBIAgAYAgASBIACBIAAgSAAgSAIIEAIIEgCABgCABIEgAIEgACBIACBIAggQAggSAIAHAJL8MwXzvH2/bnv/u8/p1MVrAqi7bthmF4CESJ0CQCBciUQIEiRAREidAkOgao0dBafE3AARJjJpG5N7fFCVAkBgejlt/X5QAQeJuLHqFYuT/C6AXN8YuEIif/nbviygABEmMRAkQJGLGSJQAQSJMjEQJECRe3j/etv9DMPOiAlECBMkKaXqMRAkQJCEKEyNRAgSpeIwiEiVAkArEKNJ5o2ei9Hn9uogSIEiLrpCiPxnh33+fGAGCtGCIMsTo1r9TmIBIvML8ZIxW+Dyee3f++zaGcJ6Hqx6YvDP9VPfMJGtSbXPAYRxBkIZPVpknHlHqv/IVJniOc0gFY2Sy/P699voZ1jk6sEIaMrGsNKGvFtuWsdgzFl4vD4IkRj5jlxid+exeLw+CZKJu+Fn/XLix4mcdFQzn6ECQmk5cK1xRd2YSXflnyRGf02oJBMnk7HOHWq1YLcE+rrITo8NH+WK0z63/l6vwQJAeTmCVA7TS08EjrUw+r18XT16H+/xkZ3W0ezLPMBYZzttUu6oRrJDEqNxKKctFBFZKIEgPJzNHqXknzmxXtIkSCNLuSU2c8kycWS+vFiX4zjmkFz/VHZ30I4zTCudjqtyUDFZIJ46uiXs0f+uhqBkncm/zBUH68byRI9P4UVrxRlNv8wUrJOeNkkWp0lMPRAlBKrIjOW+UK0r33lu0ynf302pdlKh0wNT8ooYMKw43JvbfIFuNZ8UHlDpYIsv22XrbbBqkDBN9xad4zzxKOjq2Pd9ZJEq208rbVuQ5vusKKeIXbEefs7PvHWdvX7WKnxEhcTo+nqGDFHlnEqP4E4DJQZSibn+Vx3/UttjtxthoJ6Dt3HknBq//+DsObpqdF6Oq2+TIubPrkxqiREmMck4SviMr+5bb2J5xe3abrXYus/dn7v7ooIhv67RDx9iofTei1DtEZ8ep8jnNGfvnkGfZzYiS10ZTYQKuuD3PuhWg0pWfsw4Whz5cddSHtPMiSmK08r9hxRgND1LvnariTZSIUtXL4Gd//hXnm9nb15TXT/SIkqNHKodp5e088r69UpQiHOxMex9Sq99jrYoQpHW39ywHmtnnoSjb09QX9B25ZHPU1TWQaRJZ8R6lbL96ZI1SpIObEG+MbXlTmxBReaW0yvafeQWY6Wq8aOMc4n1IrQZAjKhmxRf7Zf858tG/Ncp3FHGcQ6yQzn5hQoRV0hr7xGrnxqKulqKOc8ggVflZAkzkNS5Mcv/UQkFq/aUIGqJkoq70ebOMc8kgtf6bAocoiVGrOajlZ8/2uCNBCkjgaLWNR70c3P2DfWOR9aGw5YIkcFTcLl1qnH/+aHH1XvRxFiSBEzhREqMC+32GcRYkG7ogFfvuZ3x/njVpfxUkuuwwJhFREqP4Yco4voIEoiRGiwQq+7gKEojS0AlUjBAkoHsohAhBAppE42g4st2AiSABSaL0KCIt758BQQK63v8iRAgSMDVMQoQgAVPDJEQIEjAlTAKEIAGwpFdDAIAgAYAgASBIACBIAAgSAAgSAIIEAIIEgCABgCABIEgAIEgACBIACBIAggQAJ/0Gkk/OXxSPtAUAAAAASUVORK5CYII=";
const tablet = (datum: string, bis: string, name: string) => ({ art: "tablet", zeitpunkt: new Date(`${datum}T${bis}:00`).toISOString(), bild: DEMO_UNTERSCHRIFT, name });

type Familie = {
  hebamme: string;
  klientin: Record<string, string | null>;
  et: string | null;
  kinder?: Array<Record<string, string | number | null>>;
  besuche?: Array<{ datum: string; von: string; bis: string; typ: string; art: 1 | 2 | 3 | 4; material?: string[]; doku?: Record<string, unknown>; kindDoku?: Array<Record<string, unknown>>; beratung?: string[]; offen?: boolean; tablet?: boolean }>;
};

const FAMILIEN: Familie[] = [
  {
    hebamme: "johanna@kindkesmoeoen.test",
    klientin: { vorname: "Lena", nachname: "Krüger", geburtsdatum: "1994-05-12", strasse: "Lindenweg 4", plz: "18209", ort: "Bad Doberan", telefon: "0170 0000101", email: null, krankenkasse: "Musterkasse Nord", kassenIk: "109900001", versichertennummer: "K123456789", hinweise: "Hund (freundlich). Parken im Hof." },
    et: tag(-2),
    kinder: [{ vorname: "Ole", nachname: "Krüger", geburtsdatum: tag(-5), geburtszeit: "04:12", geschlecht: "maennlich", geburtsgewicht: 3480, laenge: 52, kopfumfang: 35, geburtsmodus: "spontan" }],
    besuche: [
      { datum: tag(-3), von: "10:00", bis: "11:30", typ: "wochenbett", art: 1, doku: { temperatur: 36.9, fundus: "Nabelhöhe", lochien: "rubra", brust: "Milcheinschuss", befinden: "müde, glücklich" }, kindDoku: [{ gewicht: 3290, temperatur: 37.0, haut: "rosig", nabel: "feucht", stillen: "voll gestillt" }], beratung: ["Stillen/Anlegen", "Vitamin K/D, Fluorid"] },
      { datum: tag(-2), von: "09:30", bis: "10:15", typ: "wochenbett", art: 1, material: ["61400"], doku: { temperatur: 36.7, fundus: "1 QF unter Nabel", lochien: "rubra", brust: "gefüllt" }, kindDoku: [{ gewicht: 3240, haut: "leicht ikterisch", nabel: "feucht", stillen: "voll gestillt" }] },
      { datum: tag(-1), von: "17:40", bis: "18:20", typ: "wochenbett", art: 1, doku: { fundus: "2 QF unter Nabel", lochien: "fusca", brust: "weich", befinden: "stabil" }, kindDoku: [{ gewicht: 3270, haut: "leicht ikterisch", nabel: "trocken", stillen: "voll gestillt" }] },
      { datum: tag(0), von: "09:00", bis: "09:45", typ: "wochenbett", art: 1, offen: true, doku: { fundus: "2 QF unter Nabel" }, kindDoku: [{ gewicht: 3310 }] },
    ],
  },
  {
    hebamme: "johanna@kindkesmoeoen.test",
    klientin: { vorname: "Sophie", nachname: "Berger", geburtsdatum: "1997-11-03", strasse: "Am Markt 9", plz: "18236", ort: "Kröpelin", telefon: "0170 0000102", email: "sophie.berger@example.org", krankenkasse: "Musterkasse Ost", kassenIk: "109900002", versichertennummer: "B987654321", hinweise: null },
    et: tag(45),
    besuche: [{ datum: tag(-7), von: "14:00", bis: "14:40", typ: "vorsorge", art: 2, material: ["60200"], doku: { rrSys: 118, rrDia: 74, befinden: "gut, leichte Rückenschmerzen" } }],
  },
  {
    hebamme: "marielena@kindkesmoeoen.test",
    klientin: { vorname: "Maria", nachname: "Hansen", geburtsdatum: "1991-02-20", strasse: "Strandstraße 15", plz: "18230", ort: "Rerik", telefon: "0170 0000103", email: null, krankenkasse: "Musterkasse Nord", kassenIk: "109900001", versichertennummer: "H555666777", hinweise: "Zwillinge, 2. OG ohne Aufzug." },
    et: tag(-18),
    kinder: [
      { vorname: "Paul", nachname: "Hansen", geburtsdatum: tag(-20), geburtszeit: "11:05", geschlecht: "maennlich", geburtsgewicht: 2650, laenge: 47, kopfumfang: 33, geburtsmodus: "sectio_primaer" },
      { vorname: "Emma", nachname: "Hansen", geburtsdatum: tag(-20), geburtszeit: "11:21", geschlecht: "weiblich", geburtsgewicht: 2480, laenge: 46, kopfumfang: 32.5 },
    ],
    besuche: [
      { datum: tag(-17), von: "10:00", bis: "12:10", typ: "wochenbett", art: 1, tablet: true, material: ["61400"], kindDoku: [{ gewicht: 2510 }, { gewicht: 2350 }] },
      { datum: tag(-12), von: "15:30", bis: "15:40", typ: "wochenbett", art: 4 },
      { datum: tag(-3), von: "11:00", bis: "12:00", typ: "wochenbett", art: 1, tablet: true, kindDoku: [{ gewicht: 2790 }, { gewicht: 2610 }] },
    ],
  },
  {
    hebamme: "marielena@kindkesmoeoen.test",
    klientin: { vorname: "Jana", nachname: "Wolff", geburtsdatum: "2000-07-08", strasse: "Ostseeallee 30", plz: "18225", ort: "Kühlungsborn", telefon: "0170 0000104", email: null, krankenkasse: "Musterkasse West", kassenIk: "109900003", versichertennummer: "W111222333", hinweise: "Erstgebärende, Anfrage über die Website." },
    et: tag(120),
  },
];

/**
 * Zusätzliche Familien für die Test-Umgebung (Codespace, VPS mit DEMO_MODUS):
 * längere Gewichtsverläufe, eine frische Geburt (heute wichtig), eine Schwangere, volle Touren.
 * Die automatischen Tests verwenden nur den Grunddatensatz oben.
 */
const papierBesuch = (offset: number, von: string, bis: string, gewicht: number, mutter: Record<string, unknown> = {}, kind: Record<string, unknown> = {}) => ({
  datum: tag(offset), von, bis, typ: "wochenbett", art: 1 as const, doku: mutter, kindDoku: [{ gewicht, ...kind }],
});
const tabletBesuch = (offset: number, von: string, bis: string, gewicht: number, mutter: Record<string, unknown> = {}, kind: Record<string, unknown> = {}) => ({
  ...papierBesuch(offset, von, bis, gewicht, mutter, kind), tablet: true,
});

const FAMILIEN_ERWEITERT: Familie[] = [
  {
    hebamme: "johanna@kindkesmoeoen.test",
    klientin: { vorname: "Anna", nachname: "Schulz", geburtsdatum: "1993-08-21", strasse: "Am Kamp 5", plz: "18209", ort: "Bad Doberan", telefon: "0170 0000105", email: null, krankenkasse: "Musterkasse Nord", kassenIk: "109900001", versichertennummer: "S246813579", hinweise: "Zweites Kind, große Schwester Lotta (4)." },
    et: tag(-13),
    kinder: [{ vorname: "Mats", nachname: "Schulz", geburtsdatum: tag(-12), geburtszeit: "22:40", geschlecht: "maennlich", geburtsgewicht: 3620, laenge: 53, kopfumfang: 35.5 }],
    besuche: [
      { ...papierBesuch(-11, "10:30", "11:50", 3480, { temperatur: 37.0, fundus: "Nabelhöhe", lochien: "rubra", brust: "weich", rrSys: 124, rrDia: 78 }, { temperatur: 37.1, haut: "rosig", nabel: "feucht", stillen: "voll gestillt" }), beratung: ["Stillen/Anlegen", "Nabelpflege", "Vitamin K/D, Fluorid"] },
      { ...papierBesuch(-10, "11:00", "11:50", 3390, { temperatur: 36.9, fundus: "1 QF unter Nabel", lochien: "rubra", brust: "Milcheinschuss" }, { haut: "rosig", stillen: "Saugen gut" }), material: ["61400"] },
      papierBesuch(-9, "10:15", "11:00", 3350, { temperatur: 36.8, fundus: "2 QF unter Nabel", lochien: "fusca", brust: "gefüllt" }, { haut: "leicht ikterisch", nabel: "trocken" }),
      { ...papierBesuch(-7, "14:00", "14:40", 3420, { fundus: "3 QF unter Nabel", lochien: "fusca", brust: "weich", befinden: "gut erholt" }, { haut: "leicht ikterisch", nabel: "abgefallen", ausscheidung: "Muttermilchstuhl" }), beratung: ["Schlafen/sicherer Schlafplatz (SIDS)", "U-Untersuchungen"] },
      papierBesuch(-5, "09:30", "10:10", 3530, { fundus: "Symphyse", lochien: "flava" }, { haut: "rosig", stillen: "voll gestillt" }),
      papierBesuch(-2, "15:00", "15:40", 3660, { fundus: "nicht tastbar", lochien: "flava", befinden: "gut" }, { haut: "rosig", stillen: "voll gestillt", ausscheidung: "Muttermilchstuhl" }),
    ],
  },
  {
    hebamme: "johanna@kindkesmoeoen.test",
    klientin: { vorname: "Katrin", nachname: "Lange", geburtsdatum: "1996-03-14", strasse: "Haffstraße 3", plz: "18230", ort: "Rerik", telefon: "0170 0000106", email: null, krankenkasse: "Musterkasse Ost", kassenIk: "109900002", versichertennummer: "L135792468", hinweise: "Ambulante Geburt, Erstgebärende." },
    et: tag(1),
    kinder: [{ vorname: "Ella", nachname: "Lange", geburtsdatum: tag(-2), geburtszeit: "06:15", geschlecht: "weiblich", geburtsgewicht: 3150, laenge: 50, kopfumfang: 34 }],
    besuche: [papierBesuch(-1, "16:00", "17:30", 2830, { temperatur: 37.2, fundus: "Nabelhöhe", lochien: "rubra", brust: "weich", rrSys: 118, rrDia: 72 }, { temperatur: 36.9, haut: "rosig", nabel: "feucht", stillen: "Anlegeprobleme" })],
  },
  {
    hebamme: "johanna@kindkesmoeoen.test",
    klientin: { vorname: "Mia", nachname: "Neumann", geburtsdatum: "1998-12-02", strasse: "Bahnhofstraße 12", plz: "18236", ort: "Kröpelin", telefon: "0170 0000107", email: "mia.neumann@example.org", krankenkasse: "Musterkasse West", kassenIk: "109900003", versichertennummer: "N975318642", hinweise: null },
    et: tag(28),
    besuche: [{ datum: tag(-14), von: "09:00", bis: "09:30", typ: "vorsorge", art: 2, material: ["60200"], doku: { rrSys: 112, rrDia: 70, puls: 82, befinden: "gut, Sodbrennen" }, beratung: ["Beschwerden", "Geburtsvorbereitung"] }],
  },
  {
    hebamme: "marielena@kindkesmoeoen.test",
    klientin: { vorname: "Laura", nachname: "Becker", geburtsdatum: "1990-06-30", strasse: "Ostseeallee 14", plz: "18225", ort: "Kühlungsborn", telefon: "0170 0000108", email: null, krankenkasse: "Musterkasse Nord", kassenIk: "109900001", versichertennummer: "B864209753", hinweise: "Sectio, Hausaufgang über Hof." },
    et: tag(-38),
    kinder: [{ vorname: "Frieda", nachname: "Becker", geburtsdatum: tag(-40), geburtszeit: "13:02", geschlecht: "weiblich", geburtsgewicht: 3300, laenge: 51, kopfumfang: 34.5, geburtsmodus: "sectio_sekundaer" }],
    besuche: [
      tabletBesuch(-38, "10:00", "11:30", 3150, { temperatur: 37.0, fundus: "Nabelhöhe", lochien: "rubra", sectionarbe: "reizlos, Fäden/Klammern liegen" }, { haut: "rosig", stillen: "teilgestillt, Zufüttern" }),
      tabletBesuch(-37, "11:15", "12:00", 3080, { fundus: "1 QF unter Nabel", lochien: "rubra", sectionarbe: "reizlos", brust: "Milcheinschuss, gefüllt" }),
      tabletBesuch(-36, "10:45", "11:30", 3060, { fundus: "2 QF unter Nabel", lochien: "fusca", sectionarbe: "gerötet, schmerzhaft" }, { haut: "leicht ikterisch, trocken" }),
      tabletBesuch(-34, "14:30", "15:10", 3120, { fundus: "3 QF unter Nabel", lochien: "fusca" }, { haut: "leicht ikterisch", nabel: "abgefallen" }),
      { ...tabletBesuch(-31, "09:30", "10:10", 3250, { lochien: "flava" }), material: ["61700"] },
      tabletBesuch(-27, "15:00", "15:40", 3390, { lochien: "flava", befinden: "gut" }, { stillen: "voll gestillt", laenge: 52.5, kopfumfang: 35.3 }),
      tabletBesuch(-23, "10:00", "10:40", 3560, { lochien: "alba" }),
      tabletBesuch(-16, "11:00", "11:40", 3820, { lochien: "alba" }, { stillen: "voll gestillt", laenge: 54, kopfumfang: 36.4 }),
      { ...tabletBesuch(-9, "14:00", "14:40", 4050, { befinden: "erschöpft, weint oft", epds: "1,1,2,1,1,1,1,1,1,0" }, { stillen: "voll gestillt" }), beratung: ["Babyblues/Stimmung", "Rückbildung"] },
      tabletBesuch(-2, "10:00", "10:40", 4290, { befinden: "sehr gut" }, { stillen: "voll gestillt", ausscheidung: "Muttermilchstuhl", laenge: 55.5, kopfumfang: 37.4 }),
    ],
  },
  {
    hebamme: "marielena@kindkesmoeoen.test",
    klientin: { vorname: "Svenja", nachname: "Koch", geburtsdatum: "1995-01-17", strasse: "Neue Reihe 40", plz: "18209", ort: "Bad Doberan", telefon: "0170 0000109", email: null, krankenkasse: "Musterkasse Ost", kassenIk: "109900002", versichertennummer: "K112233445", hinweise: null },
    et: tag(-6),
    kinder: [{ vorname: "Jonas", nachname: "Koch", geburtsdatum: tag(-8), geburtszeit: "03:50", geschlecht: "maennlich", geburtsgewicht: 3900, laenge: 54, kopfumfang: 36, geburtsmodus: "vaginal_operativ" }],
    besuche: [
      tabletBesuch(-7, "14:00", "15:30", 3760, { temperatur: 36.9, fundus: "Nabelhöhe", lochien: "rubra", rrSys: 130, rrDia: 82 }, { haut: "rosig", nabel: "feucht", stillen: "voll gestillt" }),
      tabletBesuch(-6, "15:00", "15:50", 3650, { fundus: "1 QF unter Nabel", lochien: "rubra", brust: "Milcheinschuss" }, { haut: "rosig" }),
      { ...tabletBesuch(-5, "14:30", "15:15", 3620, { fundus: "2 QF unter Nabel", lochien: "fusca", brust: "wunde Mamillen" }, { haut: "leicht ikterisch", stillen: "Anlegeprobleme" }), beratung: ["Stillen/Anlegen", "Babyblues/Stimmung"] },
      tabletBesuch(-4, "16:00", "16:40", 3680, { fundus: "2 QF unter Nabel", lochien: "fusca", brust: "gefüllt" }, { haut: "leicht ikterisch", stillen: "Saugen gut" }),
      tabletBesuch(-2, "15:30", "16:10", 3790, { fundus: "3 QF unter Nabel", lochien: "fusca", brust: "weich" }, { haut: "rosig", nabel: "abgefallen", stillen: "voll gestillt" }),
    ],
  },
];

const DEMO_TERMINE_ERWEITERT: Array<{ hebamme: string; familie: string; termin: Record<string, unknown> }> = [
  { hebamme: "johanna@kindkesmoeoen.test", familie: "Schulz", termin: { zeit: "vormittags", dauerMin: 45, typ: "wochenbett", notiz: "Gewicht, Rückbildung" } },
  { hebamme: "johanna@kindkesmoeoen.test", familie: "Neumann", termin: { zeit: "fix", uhrzeit: "13:30", dauerMin: 40, typ: "vorsorge", notiz: "Vorsorge 36. SSW" } },
  { hebamme: "marielena@kindkesmoeoen.test", familie: "Koch", termin: { zeit: "fix", uhrzeit: "10:30", dauerMin: 45, typ: "wochenbett", notiz: "Stillberatung (wunde Mamillen)" } },
  { hebamme: "marielena@kindkesmoeoen.test", familie: "Becker", termin: { zeit: "nachmittags", dauerMin: 40, typ: "wochenbett" } },
];

const DEMO_TERMINE: Array<{ hebamme: string; familie: string; termin: Record<string, unknown> }> = [
  { hebamme: "johanna@kindkesmoeoen.test", familie: "Krüger", termin: { zeit: "fix", uhrzeit: "09:00", dauerMin: 45, typ: "wochenbett", notiz: "Gewichtskontrolle Ole" } },
  { hebamme: "johanna@kindkesmoeoen.test", familie: "Berger", termin: { zeit: "nachmittags", dauerMin: 40, typ: "vorsorge" } },
  { hebamme: "marielena@kindkesmoeoen.test", familie: "Hansen", termin: { zeit: "vormittags", dauerMin: 60, typ: "wochenbett", wichtig: true, notiz: "Zwillinge, Stillberatung" } },
  { hebamme: "marielena@kindkesmoeoen.test", familie: "Wolff", termin: { zeit: "fenster", fruehestens: "13:00", spaetestens: "15:00", dauerMin: 45, typ: "schwangerschaft", notiz: "Vorgespräch" } },
];

export async function demoAktenAnlegen(db: Datenbank, passwort: string, erweitert = true) {
  const familien = erweitert ? [...FAMILIEN, ...FAMILIEN_ERWEITERT] : FAMILIEN;
  const termine = erweitert ? [...DEMO_TERMINE, ...DEMO_TERMINE_ERWEITERT] : DEMO_TERMINE;
  if ((await db.select({ id: klientin.id }).from(klientin).limit(1)).length) return 0;
  const app = await appBauen(db);
  const cookies: Record<string, string> = {};
  const anmelden = async (email: string) => {
    if (!cookies[email]) {
      const res = await app.inject({ method: "POST", url: "/api/auth/anmelden", payload: { email, passwort } });
      cookies[email] = `kk_sitzung=${res.cookies.find((c) => c.name === "kk_sitzung")!.value}`;
    }
    return cookies[email]!;
  };
  const anfrage = async (email: string, method: "GET" | "POST" | "PUT", url: string, payload?: unknown) => {
    const res = await app.inject({ method, url, payload: payload as object, headers: { cookie: await anmelden(email) } });
    if (res.statusCode >= 300) throw new Error(`${method} ${url}: ${res.body}`);
    return res.json();
  };

  const betreuungen: Record<string, string> = {};
  for (const f of familien) {
    const ich = await anfrage(f.hebamme, "GET", "/api/auth/ich");
    const k = await anfrage(f.hebamme, "POST", "/api/klientinnen", { ...f.klientin, zustaendigeHebammeId: ich.id, et: f.et });
    const akte = await anfrage(f.hebamme, "GET", `/api/klientinnen/${k.id}`);
    const betreuungId = akte.betreuungen[0].id as string;
    betreuungen[f.klientin.nachname!] = betreuungId;
    if (f.klientin.vorname === "Jana") {
      await anfrage(f.hebamme, "PUT", `/api/betreuungen/${betreuungId}`, { status: "anfrage", et: f.et, gravida: 1, para: 0, geburtsort: null, geburtsmodus: null, zustaendigeHebammeId: ich.id, notizen: "Wunsch: Wochenbettbetreuung und Geburtsvorbereitungskurs" });
    }
    const kindIds: string[] = [];
    for (const kd of f.kinder ?? []) kindIds.push((await anfrage(f.hebamme, "POST", `/api/betreuungen/${betreuungId}/kinder`, kd)).id);
    for (const b of f.besuche ?? []) {
      const kinder = Object.fromEntries((b.kindDoku ?? []).map((d, i) => [kindIds[i], d]));
      await anfrage(f.hebamme, "POST", `/api/betreuungen/${betreuungId}/besuche`, {
        datum: b.datum,
        von: b.von,
        bis: b.bis,
        typ: b.typ,
        art: b.art,
        material: b.material ?? [],
        dokumentation: { mutter: b.doku ?? {}, kinder, notiz: null, beratung: b.beratung ?? [] },
        unterschrift: b.offen || b.art >= 3 ? { art: "keine" } : b.tablet ? tablet(b.datum, b.bis, `${f.klientin.vorname} ${f.klientin.nachname}`) : papier(b.datum, b.bis),
        abschliessen: !b.offen,
      });
    }
  }

  // Tour für heute: Termine anlegen und optimieren lassen
  const heute = tag(0);
  for (const t of termine) {
    const neu = await anfrage(t.hebamme, "POST", `/api/touren/${heute}/termine`, { ...t.termin, betreuungId: betreuungen[t.familie] });
    // Der offene Besuch von heute gehört zu diesem Termin
    const [offen] = await db.select({ id: besuch.id }).from(besuch).where(and(eq(besuch.betreuungId, betreuungen[t.familie]!), eq(besuch.datum, heute), eq(besuch.status, "entwurf")));
    if (offen) await db.update(termin).set({ besuchId: offen.id }).where(eq(termin.id, neu.id));
  }
  for (const h of [...new Set(termine.map((t) => t.hebamme))]) await anfrage(h, "POST", `/api/touren/${heute}/planen`, { modus: "optimieren" });

  await demoAktenErgaenzen(db, anfrage, erweitert);
  const offen: OffeneAnfrage = async (email, method, url, payload) => {
    const res = await app.inject({ method, url, payload: payload as object, headers: email ? { cookie: await anmelden(email) } : {} });
    if (res.statusCode >= 300) throw new Error(`${method} ${url}: ${res.body}`);
    return res.json();
  };
  if (erweitert) await demoKurseAnlegen(db, anfrage, offen);
  if (erweitert) await demoAnfragenAnlegen(anfrage, offen);

  await app.close();
  return familien.length;
}

type Anfrage = (email: string, method: "GET" | "POST" | "PUT", url: string, payload?: unknown) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type OffeneAnfrage = (email: string | null, method: "GET" | "POST" | "PUT", url: string, payload?: unknown) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Demo-Kurse: Geburtsvorbereitung (Kasse, zu zweit geleitet, ein Termin schon abgerechnet) und Babymassage (Selbstzahler). */
async function demoKurseAnlegen(db: Datenbank, anfrage: Anfrage, offen: OffeneAnfrage) {
  const johanna = (await anfrage("johanna@kindkesmoeoen.test", "GET", "/api/auth/ich")).id as string;
  const marielena = (await anfrage("marielena@kindkesmoeoen.test", "GET", "/api/auth/ich")).id as string;
  const kid = async (nachname: string) => (await db.select({ id: klientin.id }).from(klientin).where(eq(klientin.nachname, nachname)))[0]!.id;
  const J = "johanna@kindkesmoeoen.test";

  const gv = await anfrage(J, "POST", "/api/kurse", {
    titel: "Geburtsvorbereitung am Wochenende",
    art: "geburtsvorbereitung",
    abrechnung: "kasse",
    ort: "Praxis, Neue Reihe 46b",
    maxTeilnehmer: 8,
    partnerPreis: 60,
    beschreibung: "Zwei Samstage für werdende Eltern: Ablauf der Geburt, Atmung und Positionen, Wochenbett und Stillen.",
    leitung: [johanna, marielena],
    anmeldungOffen: true,
    status: "laufend",
  });
  const t1 = (await anfrage(J, "POST", `/api/kurse/${gv.id}/termine`, { datum: tag(-7), von: "10:00", bis: "13:00", format: 2, hebammeId: johanna, thema: "Ablauf der Geburt, Atmung" }))[0];
  await anfrage(J, "POST", `/api/kurse/${gv.id}/termine`, { datum: tag(7), von: "10:00", bis: "13:00", format: 2, hebammeId: marielena, thema: "Wochenbett und Stillen" });
  await anfrage(J, "POST", `/api/kurse/${gv.id}/termine`, { datum: tag(10), von: "00:00", bis: "00:45", format: 6, hebammeId: johanna, thema: "Video: Rückbildung und erste Tage zu Hause" });
  const berger = await anfrage(J, "POST", `/api/kurse/${gv.id}/teilnahmen`, { klientinId: await kid("Berger"), name: "Sophie Berger", stichtag: tag(45), partner: true });
  const neumann = await anfrage(J, "POST", `/api/kurse/${gv.id}/teilnahmen`, { klientinId: await kid("Neumann"), name: "Mia Neumann", stichtag: tag(28) });
  await anfrage(J, "PUT", `/api/kurstermine/${t1.id}/anwesenheit`, {
    abschliessen: true,
    eintraege: [berger, neumann].map((t) => ({ teilnahmeId: t.id, anwesend: true, unterschrift: { art: "papier", zeitpunkt: `${tag(-7)}T13:00:00.000Z` } })),
  });
  // Eine Anmeldung über die Website, noch nicht bestätigt
  await offen(null, "POST", `/api/oeffentlich/kurse/${gv.id}/anmeldung`, { name: "Paula Beispiel", email: "paula@example.org", stichtag: tag(60), krankenkasse: "Musterkasse Nord", partner: true, nachricht: "Wir kommen aus Kühlungsborn – gibt es Parkplätze?", einwilligung: true });

  const M = "marielena@kindkesmoeoen.test";
  const bm = await anfrage(M, "POST", "/api/kurse", {
    titel: "Babymassage dienstags",
    art: "babymassage",
    abrechnung: "selbstzahler",
    ort: "Praxis, Neue Reihe 46b",
    maxTeilnehmer: 6,
    preis: 85,
    beschreibung: "Fünf Termine für Babys ab etwa 6 Wochen. Bitte ein großes Handtuch mitbringen.",
    leitung: [marielena],
    anmeldungOffen: true,
    status: "geplant",
  });
  await anfrage(M, "POST", `/api/kurse/${bm.id}/termine`, { datum: tag(5), von: "10:00", bis: "11:00", format: 2, hebammeId: marielena, wiederholungen: 5, abstandTage: 7 });
  await anfrage(M, "POST", `/api/kurse/${bm.id}/teilnahmen`, { klientinId: await kid("Becker"), name: "Laura Becker", stichtag: tag(-40), bezahlt: true });
  await anfrage(M, "POST", `/api/kurse/${bm.id}/teilnahmen`, { name: "Sarah Muster", email: "sarah@example.org", telefon: "0170 0000199", stichtag: tag(-50) });
}

/** Demo: Kontakte, Merkmale und Einwilligungen (M2) */
async function demoAktenErgaenzen(db: Datenbank, anfrage: Anfrage, erweitert: boolean) {
  const kid = async (nachname: string) => (await db.select({ id: klientin.id }).from(klientin).where(eq(klientin.nachname, nachname)))[0]?.id;
  const J = "johanna@kindkesmoeoen.test";
  const M = "marielena@kindkesmoeoen.test";
  const heute = tag(0);
  const krueger = (await kid("Krüger"))!;
  await anfrage(J, "POST", `/api/klientinnen/${krueger}/kontakte`, { art: "partner", name: "Tom Krüger", telefon: "0170 0000201" });
  await anfrage(J, "POST", `/api/klientinnen/${krueger}/kontakte`, { art: "kinderaerztin", name: "Dr. Anna Beispiel (Kinderarztpraxis am Markt)", telefon: "038203 0000", anschrift: "Am Markt 3, 18209 Bad Doberan" });
  await anfrage(J, "POST", `/api/klientinnen/${krueger}/kontakte`, { art: "gynaekologin", name: "Frauenarztpraxis Dr. Muster", telefon: "038203 0001" });
  await anfrage(J, "PUT", `/api/klientinnen/${krueger}/einwilligungen/email`, { erteilt: true, form: "papier", datum: tag(-3) });
  await anfrage(J, "PUT", `/api/klientinnen/${krueger}/einwilligungen/austausch`, { erteilt: true, form: "muendlich", datum: tag(-3), notiz: "Kinderärztin und Gynäkologin" });
  const hansen = await kid("Hansen");
  if (hansen) {
    await anfrage(M, "PUT", `/api/klientinnen/${hansen}/merkmale`, { flaggen: ["risiko"], sprache: null, allergien: "Latex" });
    await anfrage(M, "POST", `/api/klientinnen/${hansen}/kontakte`, { art: "klinik", name: "Universitätsfrauenklinik Rostock", telefon: "0381 0000" });
    await anfrage(M, "PUT", `/api/klientinnen/${hansen}/einwilligungen/urkunde`, { erteilt: true, form: "papier", datum: heute });
  }
  if (!erweitert) return;
  const koch = await kid("Koch");
  if (koch) await anfrage(M, "PUT", `/api/klientinnen/${koch}/merkmale`, { flaggen: ["erstgebaerend", "dolmetscherin"], sprache: "Englisch", allergien: null });
  const becker = await kid("Becker");
  if (becker) {
    await anfrage(M, "PUT", `/api/klientinnen/${becker}/einwilligungen/urkunde`, { erteilt: true, form: "papier", datum: tag(-30) });
    await anfrage(M, "PUT", `/api/klientinnen/${becker}/einwilligungen/foto`, { erteilt: false, form: "muendlich", datum: tag(-30), notiz: "Keine Fotos gewünscht" });
  }
}

/** Demo M11: Betreuungsanfragen (Website und Telefon) und ein Urlaub für den Belegungsplan */
async function demoAnfragenAnlegen(anfrage: Anfrage, offen: OffeneAnfrage) {
  const J = "johanna@kindkesmoeoen.test";
  const M = "marielena@kindkesmoeoen.test";
  await offen(null, "POST", "/api/oeffentlich/anfrage", {
    vorname: "Hannah", nachname: "Beispiel", email: "hannah@example.org", telefon: "0170 0000201", et: tag(150), plz: "18236", ort: "Kröpelin",
    erstesKind: true, leistungen: ["vorsorge", "wochenbett", "geburtsvorbereitung"], nachricht: "Wir sind gerade nach Kröpelin gezogen und suchen eine Hebamme für unser erstes Kind.", einwilligung: true,
  });
  await offen(null, "POST", "/api/oeffentlich/anfrage", {
    vorname: "Miriam", nachname: "Muster", email: "miriam@example.org", et: tag(95), strasse: "Mollistraße 5", plz: "18209", ort: "Bad Doberan",
    erstesKind: false, leistungen: ["wochenbett", "stillen"], einwilligung: true,
  });
  const tel = await anfrage(J, "POST", "/api/anfragen", { vorname: "Ronja", nachname: "Rückruf", telefon: "0170 0000202", et: tag(120), plz: "18211", ort: "Rethwisch", leistungen: ["wochenbett"], nachricht: "Anruf am Vormittag, möchte nur Wochenbett." });
  await anfrage(J, "POST", `/api/anfragen/${tel.id}/aktion`, { aktion: "warteliste", notiz: "Im ET-Monat voll – Rückruf, falls etwas frei wird." });
  // Kapazität 3 je Hebamme und weitere Schwangere, damit der Belegungsplan alle Stufen zeigt (frei, knapp, ausgebucht)
  for (const email of [J, M]) {
    const profil = await anfrage(email, "GET", "/api/ich/profil");
    await anfrage(email, "PUT", "/api/ich/profil", { ...profil, wochenbettenProMonat: 3 });
  }
  const planung: Array<[string, string, string, number]> = [
    [J, "Nele", "Hoffmann", 45], [J, "Pia", "Richter", 66], [J, "Lisa", "Wagner", 71], [J, "Greta", "Fischer", 76],
    [M, "Emma", "Schröder", 38], [M, "Frida", "Wolf", 44], [M, "Ida", "Zimmermann", 52], [M, "Mara", "Krause", 68], [M, "Rieke", "Lehmann", 79],
  ];
  for (const [email, vorname, nachname, et] of planung) {
    const ich = await anfrage(email, "GET", "/api/auth/ich");
    await anfrage(email, "POST", "/api/klientinnen", { vorname, nachname, et: tag(et), telefon: "", strasse: "", plz: "18209", ort: "Bad Doberan", zustaendigeHebammeId: ich.id });
  }
  // Marielena: zwei Wochen Urlaub in drei Monaten
  await anfrage(M, "POST", "/api/abwesenheiten", { von: tag(90), bis: tag(103), art: "urlaub", notiz: "Sommerurlaub" });

  // M19: Übergabe an Marielena (Vertretung) für Nele Hoffmann und Rufbereitschaft fürs Wochenende
  const mid = (await anfrage(M, "GET", "/api/auth/ich")).id as string;
  const jid = (await anfrage(J, "GET", "/api/auth/ich")).id as string;
  const nele = (await anfrage(J, "GET", "/api/klientinnen?q=Hoffmann"))[0];
  const neleB = (await anfrage(J, "GET", `/api/klientinnen/${nele.id}`)).betreuungen[0];
  await anfrage(J, "PUT", `/api/betreuungen/${neleB.id}`, {
    status: neleB.status, et: neleB.et, gravida: "", para: "", geburtsort: "", geburtsmodus: "", zustaendigeHebammeId: jid, vertretungHebammeId: mid, notizen: "",
    uebergabe: "Zweites Kind, erste Geburt war ein Kaiserschnitt. Wünscht Hausgeburt nicht – Klinik Südstadt angemeldet. Bitte vorher anrufen (Hund).",
  });
  await anfrage(M, "POST", "/api/rufbereitschaft", { hebammeId: mid, von: tag(0), bis: tag(2), notiz: "Wochenende" });

  // M3: Textbausteine (Praxis und eigene)
  for (const [email, titel, text, praxis] of [
    [J, "Stillberatung Anlegen", "Anlegen in Wiegehaltung und Rückengriff geübt, Kind saugt effektiv, Mutter sicher.", true],
    [J, "Nabelpflege", "Nabel trocken und reizlos, Pflege besprochen (trocken halten, Windel unterhalb).", true],
    [M, "Sicherer Schlaf", "Sicherer Schlafplatz besprochen: Rückenlage, eigenes Bett im Elternschlafzimmer, Schlafsack, rauchfreie Umgebung.", true],
    [J, "Gewichtskontrolle", "Gewicht kontrolliert, Verlauf mit den Eltern besprochen, nächste Kontrolle vereinbart.", false],
  ] as const) await anfrage(email, "POST", "/api/textbausteine", { titel, text, praxis });

  // M5: Termine der nächsten Tage für den Teamkalender und Johannas Fortbildung nächste Woche
  const bid = async (email: string, nachname: string) => {
    const k = (await anfrage(email, "GET", `/api/klientinnen?q=${encodeURIComponent(nachname)}`))[0];
    return (await anfrage(email, "GET", `/api/klientinnen/${k.id}`)).betreuungen[0].id as string;
  };
  const kommend: Array<[string, string, number, Record<string, unknown>]> = [
    [J, "Krüger", 1, { zeit: "fix", uhrzeit: "09:30", dauerMin: 45, typ: "wochenbett" }],
    [J, "Lange", 1, { zeit: "vormittags", dauerMin: 60, typ: "wochenbett", wichtig: true }],
    [J, "Schulz", 2, { zeit: "fenster", fruehestens: "14:00", spaetestens: "16:00", dauerMin: 45, typ: "wochenbett" }],
    [J, "Neumann", 3, { zeit: "fix", uhrzeit: "10:00", dauerMin: 30, typ: "vorsorge" }],
    [M, "Koch", 1, { zeit: "fix", uhrzeit: "11:00", dauerMin: 45, typ: "wochenbett" }],
    [M, "Hansen", 2, { zeit: "vormittags", dauerMin: 60, typ: "wochenbett" }],
    [M, "Wolff", 4, { zeit: "fix", uhrzeit: "15:00", dauerMin: 60, typ: "schwangerschaft" }],
  ];
  for (const [email, nachname, offset, t] of kommend) await anfrage(email, "POST", `/api/touren/${tag(offset)}/termine`, { ...t, betreuungId: await bid(email, nachname) });
  await anfrage(J, "POST", "/api/abwesenheiten", { von: tag(9), bis: tag(10), art: "fortbildung", notiz: "Fortbildung Stillberatung" });

  // Rückrufwünsche von der Website: einer mit Wunsch-Hebamme, einer zur Betreuung (→ „Als Betreuungsanfrage erfassen“)
  await offen(null, "POST", "/api/oeffentlich/rueckruf", { name: "Lotta Stillfrage", telefon: "0170 0000203", anliegen: "stillen", zeitfenster: "vormittag", hebamme: "Marielena Pontus", nachricht: "Unser Sohn ist 10 Tage alt und trinkt sehr unruhig.", einwilligung: true });
  await offen(null, "POST", "/api/oeffentlich/rueckruf", { name: "Svenja Neuhaus", telefon: "0170 0000204", anliegen: "betreuung", zeitfenster: "nachmittag", nachricht: "Bin in der 9. Woche und suche eine Hebamme in Bad Doberan.", einwilligung: true });
}
