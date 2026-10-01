/**
 * Fiktive Demo-Familien für Test-Umgebungen. Alle Namen, Anschriften und Versichertendaten sind ausgedacht.
 * Daten werden relativ zum heutigen Tag angelegt, damit Lebenstage und SSW immer plausibel sind.
 * Die Besuche laufen über die API, damit Leistungen genauso berechnet werden wie im Betrieb.
 */
import { appBauen } from "../app";
import type { Datenbank } from "../db/client";
import { klientin } from "../db/schema";

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
  besuche?: Array<{ datum: string; von: string; bis: string; typ: string; art: 1 | 2 | 3 | 4; material?: string[]; doku?: Record<string, unknown>; kindDoku?: Array<Record<string, unknown>>; offen?: boolean; tablet?: boolean }>;
};

const FAMILIEN: Familie[] = [
  {
    hebamme: "johanna@kindkesmoeoen.test",
    klientin: { vorname: "Lena", nachname: "Krüger", geburtsdatum: "1994-05-12", strasse: "Lindenweg 4", plz: "18209", ort: "Bad Doberan", telefon: "0170 0000101", email: null, krankenkasse: "Musterkasse Nord", kassenIk: "109900001", versichertennummer: "K123456789", hinweise: "Hund (freundlich). Parken im Hof." },
    et: tag(-2),
    kinder: [{ vorname: "Ole", nachname: "Krüger", geburtsdatum: tag(-5), geburtszeit: "04:12", geschlecht: "maennlich", geburtsgewicht: 3480, laenge: 52, kopfumfang: 35 }],
    besuche: [
      { datum: tag(-3), von: "10:00", bis: "11:30", typ: "wochenbett", art: 1, doku: { temperatur: 36.9, fundus: "Nabelhöhe", lochien: "rubra", brust: "Milcheinschuss", befinden: "müde, glücklich" }, kindDoku: [{ gewicht: 3290, temperatur: 37.0, haut: "rosig", nabel: "feucht", stillen: "voll gestillt" }] },
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
      { vorname: "Paul", nachname: "Hansen", geburtsdatum: tag(-20), geburtszeit: "11:05", geschlecht: "maennlich", geburtsgewicht: 2650, laenge: 47, kopfumfang: 33 },
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

export async function demoAktenAnlegen(db: Datenbank, passwort: string) {
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

  for (const f of FAMILIEN) {
    const ich = await anfrage(f.hebamme, "GET", "/api/auth/ich");
    const k = await anfrage(f.hebamme, "POST", "/api/klientinnen", { ...f.klientin, zustaendigeHebammeId: ich.id, et: f.et });
    const akte = await anfrage(f.hebamme, "GET", `/api/klientinnen/${k.id}`);
    const betreuungId = akte.betreuungen[0].id as string;
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
        dokumentation: { mutter: b.doku ?? {}, kinder, notiz: null },
        unterschrift: b.offen || b.art >= 3 ? { art: "keine" } : b.tablet ? tablet(b.datum, b.bis, `${f.klientin.vorname} ${f.klientin.nachname}`) : papier(b.datum, b.bis),
        abschliessen: !b.offen,
      });
    }
  }
  await app.close();
  return FAMILIEN.length;
}
