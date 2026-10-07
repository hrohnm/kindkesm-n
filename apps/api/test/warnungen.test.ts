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

const req = (method: "GET" | "POST" | "PUT", url: string, payload?: unknown, cookie = johanna) => t.app.inject({ method, url, payload: payload as object, headers: { cookie } });
const tag = (d: number) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
};
const hinweise = async (cookie = johanna) => (await req("GET", "/api/hinweise", undefined, cookie)).json() as Array<{ id: string; titel: string; stufe: string; link?: string }>;

describe("M1/M7 Warnungen im Cockpit", () => {
  let betreuungId: string;
  let kindId: string;
  let langerBesuch: string;

  it("warnt bei mehr als 10 % Gewichtsabnahme", async () => {
    const k = (await req("POST", "/api/klientinnen", { vorname: "Wiegen", nachname: "Test", zustaendigeHebammeId: johannaId, et: tag(-5) })).json();
    betreuungId = (await req("GET", `/api/klientinnen/${k.id}`)).json().betreuungen[0].id;
    kindId = (await req("POST", `/api/betreuungen/${betreuungId}/kinder`, { vorname: "Lotte", geburtsdatum: tag(-3), geburtsgewicht: 3500, laenge: "", kopfumfang: "" })).json().id;
    const besuch = (gewicht: string, von: string, bis: string) => ({ datum: tag(0), von, bis, typ: "wochenbett", art: 1, material: [], dokumentation: { mutter: {}, kinder: { [kindId]: { gewicht } }, notiz: "" }, unterschrift: { art: "keine" }, abschliessen: false });
    await req("POST", `/api/betreuungen/${betreuungId}/besuche`, besuch("3250", "08:00", "08:30"));
    let h = (await hinweise()).find((x) => x.id === `gewicht-${kindId}`);
    expect(h).toMatchObject({ stufe: "info", link: `/kinder/${kindId}/gewicht` });
    expect(h!.titel).toBe("Lotte: 7,1 % unter dem Geburtsgewicht (4. Lebenstag)");
    // zweiter, langer Besuch am selben Tag mit 3120 g → über 10 %; die Dauer verlangt eine ärztliche Anordnung
    langerBesuch = (await req("POST", `/api/betreuungen/${betreuungId}/besuche`, besuch("3120", "12:00", "15:30"))).json().besuch.id;
    h = (await hinweise()).find((x) => x.id === `gewicht-${kindId}`);
    expect(h).toMatchObject({ stufe: "dringend" });
    expect(h!.titel).toContain("10,9 %");
    // Marielena (nicht zuständig) sieht die Warnung nicht
    expect((await hinweise(marielena)).some((x) => x.id === `gewicht-${kindId}`)).toBe(false);
  });

  it("meldet Besuche, für die eine ärztliche Anordnung fehlt, bis sie vermerkt ist", async () => {
    const b = (await req("GET", `/api/besuche/${langerBesuch}`)).json();
    expect(b.hinweise.some((x: { text: string }) => /ärztlicher Anordnung/.test(x.text))).toBe(true);
    const h = (await hinweise()).find((x) => x.id.startsWith("anordnung-") && x.titel.includes("Wiegen Test"));
    expect(h).toMatchObject({ stufe: "warnung", link: `/besuche/${langerBesuch}` });
    expect(h!.titel).toBe("Ärztliche Anordnung fehlt: Wiegen Test (1 Besuch)");
    // nur die Hebamme des Besuchs darf vermerken
    expect((await req("PUT", `/api/besuche/${langerBesuch}/anordnung`, { vorhanden: true, notiz: "x" }, marielena)).statusCode).toBe(403);
    expect((await req("PUT", `/api/besuche/${langerBesuch}/anordnung`, { vorhanden: true, notiz: "Dr. Muster, heute" })).statusCode).toBe(200);
    expect((await req("GET", `/api/besuche/${langerBesuch}`)).json()).toMatchObject({ anordnungVorhanden: true, anordnungNotiz: "Dr. Muster, heute" });
    expect((await hinweise()).some((x) => x.id.startsWith("anordnung-") && x.titel.includes("Wiegen Test"))).toBe(false);
  });
});
