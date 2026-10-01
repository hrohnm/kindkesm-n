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

type Familie = {
  hebamme: string;
  klientin: Record<string, string | null>;
  et: string | null;
  kinder?: Array<Record<string, string | number | null>>;
  besuche?: Array<{ datum: string; von: string; bis: string; typ: string; art: 1 | 2 | 3 | 4; material?: string[]; doku?: Record<string, unknown>; kindDoku?: Array<Record<string, unknown>>; offen?: boolean }>;
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
      { datum: tag(-17), von: "10:00", bis: "12:10", typ: "wochenbett", art: 1, kindDoku: [{ gewicht: 2510 }, { gewicht: 2350 }] },
      { datum: tag(-3), von: "11:00", bis: "12:00", typ: "wochenbett", art: 1, kindDoku: [{ gewicht: 2790 }, { gewicht: 2610 }] },
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
        unterschrift: b.offen ? { art: "keine" } : papier(b.datum, b.bis),
        abschliessen: !b.offen,
      });
    }
  }
  await app.close();
  return FAMILIEN.length;
}
