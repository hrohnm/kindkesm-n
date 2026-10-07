import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anmelden, testAppStarten } from "./hilfen";

let t: Awaited<ReturnType<typeof testAppStarten>>;
let johanna: string;
let marielena: string;
let lorina: string;
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
  lorina = (await anmelden(t.app, "lorina@kindkesmoeoen.test")).cookie;
});
afterAll(async () => t?.schliessen());

const req = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown, cookie = johanna) => t.app.inject({ method, url, payload: payload as object, headers: { cookie } });
const tag = (d: number) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
};
const hinweise = async (cookie: string) => (await req("GET", "/api/hinweise", undefined, cookie)).json() as Array<{ id: string; titel: string; stufe: string; link?: string }>;

describe("M20 Team-Nachrichten", () => {
  let klientinId: string;

  it("schickt Nachrichten ans Team und direkt, mit Bezug zur Akte", async () => {
    klientinId = (await req("POST", "/api/klientinnen", { vorname: "Nora", nachname: "Nachricht", zustaendigeHebammeId: johannaId })).json().id;
    expect((await req("POST", "/api/nachrichten", { text: " " })).statusCode).toBe(400);
    expect((await req("POST", "/api/nachrichten", { text: "x", anId: "00000000-0000-0000-0000-000000000000" })).statusCode).toBe(400);
    expect((await req("POST", "/api/nachrichten", { text: "Wer kann Samstag?" })).statusCode).toBe(200);
    expect((await req("POST", "/api/nachrichten", { text: "Bitte morgen bei Nora vorbeischauen.", anId: marielenaId, klientinId })).statusCode).toBe(200);

    // Lorina sieht nur die Team-Nachricht, Marielena beide
    expect((await req("GET", "/api/nachrichten", undefined, lorina)).json().map((n: { text: string }) => n.text)).toEqual(["Wer kann Samstag?"]);
    const fuerM = (await req("GET", "/api/nachrichten", undefined, marielena)).json();
    expect(fuerM[0]).toMatchObject({ text: "Bitte morgen bei Nora vorbeischauen.", vonName: "Johanna Mede", anName: "Marielena Pontus", klientinName: "Nora Nachricht", gelesen: false });
    expect((await req("GET", `/api/nachrichten?klientinId=${klientinId}`, undefined, marielena)).json()).toHaveLength(1);

    // Cockpit: ungelesen, eine direkt → Warnung
    expect((await hinweise(marielena)).find((h) => h.id === "nachrichten")).toMatchObject({ titel: "2 neue Team-Nachrichten (1 an dich)", stufe: "warnung", link: "/nachrichten" });
    expect((await hinweise(johanna)).some((h) => h.id === "nachrichten")).toBe(false);
    await req("POST", "/api/nachrichten/gelesen", {}, marielena);
    expect((await hinweise(marielena)).some((h) => h.id === "nachrichten")).toBe(false);
    expect((await hinweise(lorina)).find((h) => h.id === "nachrichten")).toMatchObject({ titel: "1 neue Team-Nachricht", stufe: "info" });

    // Löschen nur eigene
    const id = fuerM[0].id;
    expect((await req("DELETE", `/api/nachrichten/${id}`, undefined, marielena)).statusCode).toBe(404);
    expect((await req("DELETE", `/api/nachrichten/${id}`)).statusCode).toBe(200);
  });

  it("verwaltet Aufgaben mit Fälligkeit und meldet fällige im Cockpit", async () => {
    expect((await req("POST", "/api/aufgaben", { titel: "" })).statusCode).toBe(400);
    const team = (await req("POST", "/api/aufgaben", { titel: "Kursraum aufräumen", faelligAm: tag(-1) })).json();
    const fuerJ = (await req("POST", "/api/aufgaben", { titel: "Anordnung holen", zustaendigId: johannaId, klientinId, faelligAm: tag(0) }, marielena)).json();
    await req("POST", "/api/aufgaben", { titel: "Später", zustaendigId: johannaId, faelligAm: tag(10) });

    const liste = (await req("GET", "/api/aufgaben")).json() as Array<{ titel: string; zustaendigName: string | null; klientinName: string | null }>;
    expect(liste.map((a) => a.titel)).toEqual(["Kursraum aufräumen", "Anordnung holen", "Später"]);
    expect(liste[1]).toMatchObject({ zustaendigName: "Johanna Mede", klientinName: "Nora Nachricht" });

    const hj = await hinweise(johanna);
    expect(hj.find((h) => h.id === `aufgabe-${team.id}`)).toMatchObject({ titel: "Aufgabe (Team): Kursraum aufräumen", stufe: "dringend" });
    expect(hj.find((h) => h.id === `aufgabe-${fuerJ.id}`)).toMatchObject({ titel: "Aufgabe: Anordnung holen – Nora Nachricht", stufe: "warnung" });
    expect(hj.some((h) => h.titel.includes("Später"))).toBe(false);
    // Marielena: nur die Teamaufgabe
    const hm = await hinweise(marielena);
    expect(hm.some((h) => h.id === `aufgabe-${fuerJ.id}`)).toBe(false);
    expect(hm.some((h) => h.id === `aufgabe-${team.id}`)).toBe(true);

    // erledigen (jede Hebamme), wieder öffnen, löschen nur Erstellerin
    expect((await req("POST", `/api/aufgaben/${team.id}/erledigt`, { erledigt: true }, marielena)).json().erledigtAm).toBeTruthy();
    expect((await hinweise(johanna)).some((h) => h.id === `aufgabe-${team.id}`)).toBe(false);
    expect((await req("GET", "/api/aufgaben")).json()).toHaveLength(2);
    expect((await req("GET", "/api/aufgaben?erledigt=ja")).json()).toHaveLength(3);
    expect((await req("POST", `/api/aufgaben/${team.id}/erledigt`, { erledigt: false })).json().erledigtAm).toBeNull();
    expect((await req("PUT", `/api/aufgaben/${fuerJ.id}`, { titel: "Anordnung bei Dr. Muster holen", zustaendigId: johannaId, klientinId, faelligAm: tag(1) })).json().titel).toBe("Anordnung bei Dr. Muster holen");
    expect((await req("DELETE", `/api/aufgaben/${fuerJ.id}`)).statusCode).toBe(404);
    expect((await req("DELETE", `/api/aufgaben/${fuerJ.id}`, undefined, marielena)).statusCode).toBe(200);
  });
});
