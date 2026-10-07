import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anmelden, testAppStarten } from "./hilfen";

let t: Awaited<ReturnType<typeof testAppStarten>>;
let johanna: string;
let marielena: string;
let johannaId: string;

beforeAll(async () => {
  t = await testAppStarten();
  const j = await anmelden(t.app, "johanna@kindkesmoeoen.test");
  johanna = j.cookie;
  johannaId = j.daten.id;
  marielena = (await anmelden(t.app, "marielena@kindkesmoeoen.test")).cookie;
});
afterAll(async () => t?.schliessen());

const req = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown, cookie = johanna) => t.app.inject({ method, url, payload: payload as object, headers: { cookie } });
const tag = (d: number) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
};
type Baustein = { id: string; titel: string; text: string; praxis: boolean };
const liste = async (cookie = johanna) => (await req("GET", "/api/textbausteine", undefined, cookie)).json() as Baustein[];

describe("M3 Textbausteine", () => {
  it("trennt eigene und Praxis-Bausteine", async () => {
    expect((await t.app.inject({ method: "GET", url: "/api/textbausteine" })).statusCode).toBe(401);
    expect((await req("POST", "/api/textbausteine", { titel: "", text: "x" })).statusCode).toBe(400);
    const eigen = (await req("POST", "/api/textbausteine", { titel: "Anlegen", text: "Anlegen in Wiegehaltung geübt." })).json() as Baustein;
    expect(eigen).toMatchObject({ titel: "Anlegen", praxis: false });
    const praxis = (await req("POST", "/api/textbausteine", { titel: "Nabel", text: "Nabel trocken, reizlos.", praxis: true })).json() as Baustein;
    expect(praxis.praxis).toBe(true);

    expect((await liste()).map((b) => b.titel)).toEqual(["Anlegen", "Nabel"]);
    // Marielena sieht nur den Praxis-Baustein und kann Johannas eigenen weder ändern noch löschen
    expect((await liste(marielena)).map((b) => b.id)).toEqual([praxis.id]);
    expect((await req("PUT", `/api/textbausteine/${eigen.id}`, { titel: "x", text: "y" }, marielena)).statusCode).toBe(404);
    expect((await req("DELETE", `/api/textbausteine/${eigen.id}`, undefined, marielena)).statusCode).toBe(404);

    // Praxis-Bausteine darf jede Hebamme ändern
    expect((await req("PUT", `/api/textbausteine/${praxis.id}`, { titel: "Nabelpflege", text: "Nabel trocken.", praxis: true }, marielena)).json()).toMatchObject({ titel: "Nabelpflege", praxis: true });
    expect((await req("DELETE", `/api/textbausteine/${eigen.id}`)).statusCode).toBe(200);
    expect((await liste()).map((b) => b.titel)).toEqual(["Nabelpflege"]);
  });
});

describe("M3 EPDS und Beratungsthemen", () => {
  const hinweise = async (cookie = johanna) => (await req("GET", "/api/hinweise", undefined, cookie)).json() as Array<{ id: string; titel: string; stufe: string; link?: string }>;
  let betreuungId: string;

  const besuch = (epds: string, von: string) => ({ datum: tag(0), von, bis: von.replace(":00", ":40"), typ: "wochenbett", art: 1, material: [], dokumentation: { mutter: { epds }, kinder: {}, notiz: "", beratung: ["Stillen/Anlegen", "Babyblues/Stimmung"] }, unterschrift: { art: "keine" }, abschliessen: false });

  it("speichert EPDS-Punkte und Beratungsthemen und meldet erhöhte Werte im Cockpit", async () => {
    const k = (await req("POST", "/api/klientinnen", { vorname: "Stimmung", nachname: "Test", zustaendigeHebammeId: johannaId, et: tag(-10) })).json();
    betreuungId = (await req("GET", `/api/klientinnen/${k.id}`)).json().betreuungen[0].id;
    expect((await req("POST", `/api/betreuungen/${betreuungId}/besuche`, besuch("4,4,4,,,,,,,", "08:00"))).statusCode).toBe(400);

    const id = (await req("POST", `/api/betreuungen/${betreuungId}/besuche`, besuch("1,1,1,1,1,1,1,1,2,0", "08:00"))).json().besuch.id;
    const b = (await req("GET", `/api/besuche/${id}`)).json();
    expect(b.dokumentation.mutter.epds).toBe("1,1,1,1,1,1,1,1,2,0");
    expect(b.dokumentation.beratung).toEqual(["Stillen/Anlegen", "Babyblues/Stimmung"]);
    let h = (await hinweise()).find((x) => x.id === `epds-${betreuungId}`);
    expect(h).toMatchObject({ stufe: "info", titel: "Stimmung Test: EPDS 10 Punkte", link: `/besuche/${id}` });
    expect((await hinweise(marielena)).some((x) => x.id === `epds-${betreuungId}`)).toBe(false);

    // späterer Besuch: Frage 10 positiv → dringend, auch bei niedriger Summe
    const id2 = (await req("POST", `/api/betreuungen/${betreuungId}/besuche`, besuch("0,0,0,0,0,0,0,0,0,1", "11:00"))).json().besuch.id;
    h = (await hinweise()).find((x) => x.id === `epds-${betreuungId}`);
    expect(h).toMatchObject({ stufe: "dringend", titel: "Stimmung Test: EPDS 1 Punkt – Frage 10 positiv", link: `/besuche/${id2}` });

    // unauffällige Auswertung → kein Hinweis mehr
    await req("POST", `/api/betreuungen/${betreuungId}/besuche`, besuch("0,0,1,0,0,0,0,0,0,0", "14:00"));
    expect((await hinweise()).some((x) => x.id === `epds-${betreuungId}`)).toBe(false);
  });
});
