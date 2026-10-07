import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anmelden, testAppStarten } from "./hilfen";

let t: Awaited<ReturnType<typeof testAppStarten>>;
let johanna: string;
let marielena: string;
let johannaId: string;
let marielenaId: string;

beforeAll(async () => {
  t = await testAppStarten();
  const j = await anmelden(t.app, "johanna@kindkesmoeoen.test");
  johanna = j.cookie;
  johannaId = j.daten.id;
  const m = await anmelden(t.app, "marielena@kindkesmoeoen.test");
  marielena = m.cookie;
  marielenaId = m.daten.id;
});
afterAll(async () => t?.schliessen());

const req = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown, cookie: string | null = johanna) =>
  t.app.inject({ method, url, payload: payload as object, headers: cookie ? { cookie } : {} });
const tag = (d: number) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
};
type Eintrag = { id: string; art: string; hebammeId: string; datum: string; bisDatum?: string; von?: string; bis?: string; titel: string; ort?: string; link?: string };

describe("M5 Teamkalender und Kalender-Abo", () => {
  let kursId: string;

  it("zeigt Termine, Kurse, Abwesenheiten und Rufbereitschaft aller Hebammen", async () => {
    const k = (await req("POST", "/api/klientinnen", { vorname: "Kalla", nachname: "Kalender", zustaendigeHebammeId: johannaId, et: tag(20) })).json();
    const betreuungId = (await req("GET", `/api/klientinnen/${k.id}`)).json().betreuungen[0].id;
    expect((await req("POST", `/api/touren/${tag(2)}/termine`, { betreuungId, zeit: "fix", uhrzeit: "09:30", dauerMin: 45, typ: "vorsorge", notiz: "Blutdruck kontrollieren" })).statusCode).toBe(200);
    kursId = (await req("POST", "/api/kurse", { titel: "Kalenderkurs", art: "geburtsvorbereitung", abrechnung: "kasse", maxTeilnehmer: 8, leitung: [marielenaId] })).json().id;
    await req("POST", `/api/kurse/${kursId}/termine`, { datum: tag(3), von: "18:00", bis: "20:00", format: 2, hebammeId: marielenaId, wiederholungen: 1, abstandTage: 7 }, marielena);
    await req("POST", "/api/abwesenheiten", { von: tag(4), bis: tag(6), art: "fortbildung" }, marielena);
    await req("POST", "/api/rufbereitschaft", { hebammeId: johannaId, von: tag(5), bis: tag(5), notiz: "Wochenende" });

    expect((await req("GET", "/api/kalender", undefined, null)).statusCode).toBe(401);
    const d = (await req("GET", `/api/kalender?von=${tag(0)}&tage=7`, undefined, marielena)).json() as { von: string; bis: string; hebammen: Array<{ name: string; status: string }>; eintraege: Eintrag[] };
    expect(d.bis).toBe(tag(6));
    expect(d.hebammen.map((h) => h.name)).toEqual(expect.arrayContaining(["Johanna Mede", "Marielena Pontus", "Lorina Gosemann"]));
    const termin = d.eintraege.find((e) => e.titel === "Vorsorge: Kalla Kalender");
    expect(termin).toMatchObject({ art: "termin", hebammeId: johannaId, datum: tag(2), von: "09:30", bis: "10:15", link: `/klientinnen/${k.id}` });
    expect(d.eintraege.find((e) => e.art === "kurs" && e.titel === "Kalenderkurs")).toMatchObject({ hebammeId: marielenaId, datum: tag(3), von: "18:00", ort: "Praxis" });
    expect(d.eintraege.find((e) => e.art === "abwesenheit" && e.hebammeId === marielenaId)).toMatchObject({ titel: "Fortbildung", datum: tag(4), bisDatum: tag(6) });
    expect(d.eintraege.find((e) => e.art === "rufbereitschaft" && e.hebammeId === johannaId && e.datum === tag(5))).toMatchObject({ titel: "Rufbereitschaft (Wochenende)" });
    // höchstens 42 Tage
    expect((await req("GET", `/api/kalender?von=${tag(0)}&tage=400`)).json().bis).toBe(tag(41));
  });

  it("liefert das private Abo nur mit gültigem Token, ohne Gesundheitsdaten", async () => {
    expect((await req("GET", "/api/ich/kalender-abo")).json()).toEqual({ aktiv: false });
    const { pfad } = (await req("POST", "/api/ich/kalender-abo")).json() as { pfad: string };
    expect(pfad).toMatch(/^\/api\/abo\/[A-Za-z0-9_-]{32}\.ics$/);
    expect((await req("GET", "/api/ich/kalender-abo")).json()).toEqual({ aktiv: true });

    const abo = await req("GET", pfad, undefined, null);
    expect(abo.statusCode).toBe(200);
    expect(abo.headers["content-type"]).toContain("text/calendar");
    expect(abo.body).toContain("SUMMARY:Besuch K. K.");
    expect(abo.body).toContain(`DTSTART;TZID=Europe/Berlin:${tag(2).replaceAll("-", "")}T093000`);
    expect(abo.body).toContain("SUMMARY:Rufbereitschaft (Wochenende)");
    for (const geheim of ["Kalla", "Kalender", "Vorsorge", "Blutdruck"]) expect(abo.body).not.toContain(geheim);
    // Kurs von Marielena gehört nicht in Johannas Abo
    expect(abo.body).not.toContain("Kalenderkurs");

    // Token steht nicht im Datenexport
    expect((await req("GET", "/api/export")).body).not.toContain(pfad.slice(9, 41));

    // neuer Link macht den alten ungültig, Abschalten ebenso
    const neu = (await req("POST", "/api/ich/kalender-abo")).json().pfad as string;
    expect((await req("GET", pfad, undefined, null)).statusCode).toBe(404);
    expect((await req("GET", neu, undefined, null)).statusCode).toBe(200);
    await req("DELETE", "/api/ich/kalender-abo");
    expect((await req("GET", neu, undefined, null)).statusCode).toBe(404);
    expect((await req("GET", "/api/abo/kaputt.ics", undefined, null)).statusCode).toBe(404);
  });

  it("bietet Kurstermine mit offener Anmeldung als öffentliches Abo an", async () => {
    expect((await req("GET", "/api/oeffentlich/kurse.ics", undefined, null)).body).not.toContain("Kalenderkurs");
    const k = (await req("GET", `/api/kurse/${kursId}`)).json().kurs;
    await req("PUT", `/api/kurse/${kursId}`, { ...k, anmeldungOffen: true, preis: null, partnerPreis: null, beschreibung: null }, marielena);
    const ics = await t.app.inject({ method: "GET", url: "/api/oeffentlich/kurse.ics", headers: { origin: "http://localhost:4321" } });
    expect(ics.statusCode).toBe(200);
    expect(ics.body).toContain("SUMMARY:Kalenderkurs");
    expect(ics.body).toContain("LOCATION:Praxis");
    expect(ics.body).not.toMatch(/Marielena|Pontus/);
  });
});
