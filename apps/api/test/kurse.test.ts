import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anmelden, testAppStarten } from "./hilfen";

let t: Awaited<ReturnType<typeof testAppStarten>>;
let johanna: string;
let johannaId: string;
let marielenaId: string;

beforeAll(async () => {
  t = await testAppStarten();
  const j = await anmelden(t.app, "johanna@kindkesmoeoen.test");
  johanna = j.cookie;
  johannaId = j.daten.id;
  marielenaId = (await anmelden(t.app, "marielena@kindkesmoeoen.test")).daten.id;
});
afterAll(async () => t?.schliessen());

const req = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown, cookie: string | null = johanna) =>
  t.app.inject({ method, url, payload: payload as object, headers: cookie ? { cookie } : {} });
const tag = (versatz: number) => {
  const d = new Date();
  d.setDate(d.getDate() + versatz);
  return d.toISOString().slice(0, 10);
};

let kursId: string;
let terminId: string;
let bergerTeilnahme: string;
let onlineTeilnahme: string;

describe("Kurse", () => {
  it("legt einen Kassenkurs mit zwei Kursleiterinnen und Terminserie an", async () => {
    const k = await req("POST", "/api/kurse", { titel: "Geburtsvorbereitung Herbst", art: "geburtsvorbereitung", abrechnung: "kasse", maxTeilnehmer: 2, leitung: [johannaId, marielenaId] });
    expect(k.statusCode).toBe(200);
    kursId = k.json().id;
    const termine = (await req("POST", `/api/kurse/${kursId}/termine`, { datum: tag(-3), von: "10:00", bis: "12:00", format: 2, hebammeId: johannaId, thema: "Ablauf der Geburt", wiederholungen: 3, abstandTage: 7 })).json();
    expect(termine.map((x: { datum: string }) => x.datum)).toEqual([tag(-3), tag(4), tag(11)]);
    terminId = termine[0].id;
    expect((await req("POST", "/api/kurse", { titel: "X", art: "babymassage", abrechnung: "selbstzahler", maxTeilnehmer: 5, leitung: [] })).statusCode).toBe(400);
  });

  it("verwaltet Teilnehmerinnen mit Warteliste", async () => {
    const berger = (await req("GET", "/api/klientinnen?q=Berger")).json()[0];
    bergerTeilnahme = (await req("POST", `/api/kurse/${kursId}/teilnahmen`, { klientinId: berger.id, name: "Sophie Berger", stichtag: tag(45) })).json().id;
    onlineTeilnahme = (await req("POST", `/api/kurse/${kursId}/teilnahmen`, { name: "Anna Ohneakte", email: "anna@example.org" })).json().id;
    const dritte = (await req("POST", `/api/kurse/${kursId}/teilnahmen`, { name: "Clara Später" })).json();
    expect(dritte.status).toBe("warteliste");
    // Nachrücken geht erst, wenn ein Platz frei ist
    expect((await req("PUT", `/api/kursteilnahmen/${dritte.id}`, { name: "Clara Später", status: "bestaetigt" })).statusCode).toBe(409);
    const d = (await req("GET", `/api/kurse/${kursId}`)).json();
    expect(d.belegt).toBe(2);
    expect(d.kasse).toBe(true);
    expect(d.leitung).toHaveLength(2);
  });

  it("rechnet anwesende Versicherte mit Unterschrift ab (Formular 3.4)", async () => {
    const vorher = (await req("GET", `/api/kurstermine/${terminId}`)).json();
    const b = vorher.teilnehmerinnen.find((x: { teilnahme: { id: string } }) => x.teilnahme.id === bergerTeilnahme);
    expect(b.ergebnis.zeilen[0]).toMatchObject({ gpos: "40102", menge: 24 });
    expect(vorher.teilnehmerinnen.find((x: { teilnahme: { id: string } }) => x.teilnahme.id === onlineTeilnahme).fehler).toContain("Akte");

    const r = (
      await req("PUT", `/api/kurstermine/${terminId}/anwesenheit`, {
        abschliessen: true,
        eintraege: [
          { teilnahmeId: bergerTeilnahme, anwesend: true, unterschrift: { art: "papier", zeitpunkt: new Date().toISOString() } },
          { teilnahmeId: onlineTeilnahme, anwesend: true, unterschrift: { art: "keine" } },
        ],
      })
    ).json();
    expect(r.hinweise.some((h: string) => h.includes("Anna Ohneakte"))).toBe(true);

    const nachher = (await req("GET", `/api/kurstermine/${terminId}`)).json();
    expect(nachher.termin.abgeschlossen).toBe(true);
    const besuchId = nachher.teilnehmerinnen.find((x: { teilnahme: { id: string } }) => x.teilnahme.id === bergerTeilnahme).besuchId;
    const besuch = (await req("GET", `/api/besuche/${besuchId}`)).json();
    expect(besuch).toMatchObject({ typ: "geburtsvorbereitung", art: 2, stamm: "401", status: "abgeschlossen", summe: "22.80" });
    // Kurseinheiten nur über den Kurs ändern
    expect((await req("DELETE", `/api/besuche/${besuchId}`)).statusCode).toBe(409);
    // Kontingentanzeige in der Akte
    const kont = (await req("GET", `/api/betreuungen/${besuch.betreuungId}/kontingente`)).json();
    expect(kont.find((x: { id: string }) => x.id === "401")).toMatchObject({ genutzt: 120, einheit: "Minuten" });

    // Versand mit Formular 3.4
    const v = (await req("POST", "/api/abrechnung/versaende", { bis: tag(0) })).json().versand;
    expect(v.id).toBeTruthy();
    const pdf = await req("GET", `/api/abrechnung/versaende/${v.id}/mappe.pdf`);
    expect(pdf.statusCode).toBe(200);
    // Termin mit versendeter Einheit nicht mehr änderbar
    expect((await req("PUT", `/api/kurstermine/${terminId}`, { datum: tag(-3), von: "10:00", bis: "11:00", format: 2, hebammeId: johannaId })).statusCode).toBe(409);
    expect((await req("DELETE", `/api/kurse/${kursId}`)).statusCode).toBe(409);
  });

  it("Online-Anmeldung ohne Konto, Warteliste wenn voll", async () => {
    expect((await req("GET", "/api/oeffentlich/kurse", undefined, null)).json().some((k: { id: string }) => k.id === kursId)).toBe(false);
    const k = (await req("GET", `/api/kurse/${kursId}`)).json().kurs;
    await req("PUT", `/api/kurse/${kursId}`, { ...k, anmeldungOffen: true, preis: null, partnerPreis: null, beschreibung: "Für Erstgebärende" });
    const liste = (await req("GET", "/api/oeffentlich/kurse", undefined, null)).json();
    const eintrag = liste.find((x: { id: string }) => x.id === kursId);
    expect(eintrag).toMatchObject({ titel: "Geburtsvorbereitung Herbst", freiePlaetze: 0, kasse: true });
    expect(JSON.stringify(eintrag)).not.toContain("Berger");

    const anmeldung = { name: "Neue Mutter", email: "neu@example.org", stichtag: tag(80), einwilligung: true };
    expect((await req("POST", `/api/oeffentlich/kurse/${kursId}/anmeldung`, { ...anmeldung, einwilligung: false }, null)).statusCode).toBe(400);
    expect((await req("POST", `/api/oeffentlich/kurse/${kursId}/anmeldung`, { ...anmeldung, webseite: "spam" }, null)).statusCode).toBe(400);
    const r = await req("POST", `/api/oeffentlich/kurse/${kursId}/anmeldung`, anmeldung, null);
    expect(r.json()).toEqual({ ok: true, warteliste: true });
    const d = (await req("GET", `/api/kurse/${kursId}`)).json();
    expect(d.teilnahmen.find((x: { name: string }) => x.name === "Neue Mutter")).toMatchObject({ quelle: "online", status: "warteliste" });
    // Andere Schnittstellen bleiben geschützt
    expect((await req("GET", "/api/kurse", undefined, null)).statusCode).toBe(401);
  });
});
