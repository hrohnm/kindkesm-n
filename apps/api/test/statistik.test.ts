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

const req = (method: "GET" | "POST", url: string, payload?: unknown, cookie = johanna) => t.app.inject({ method, url, payload: payload as object, headers: { cookie } });
type Statistik = {
  jahr: number;
  summen: { besuche: number; familien: number; geburten: number; kurse: number };
  monate: Array<{ monat: string; besuche: number; geburten: number; eigeneBesuche: number }>;
  jeHebamme: Array<{ id: string; name: string; besuche: number }>;
  orte: Array<{ ort: string; familien: number }>;
  meins: { umsatzKasse: number; nichtVersendet: number; monate: Array<{ monat: string; umsatzKasse: number }> };
};

describe("M22 Statistik", () => {
  it("zählt Besuche fürs Team und Umsatz nur für die eigene Hebamme", async () => {
    const heute = new Date().toISOString().slice(0, 10);
    const jahr = Number(heute.slice(0, 4));
    const vorher = (await req("GET", `/api/statistik?jahr=${jahr}`)).json() as Statistik;
    const vorherM = (await req("GET", `/api/statistik?jahr=${jahr}`, undefined, marielena)).json() as Statistik;
    expect(vorher.monate).toHaveLength(12);

    const k = (await req("GET", "/api/klientinnen?q=Berger")).json()[0];
    const betreuungId = (await req("GET", `/api/klientinnen/${k.id}`)).json().betreuungen[0].id;
    const r = await req("POST", `/api/betreuungen/${betreuungId}/besuche`, {
      datum: heute, von: "07:00", bis: "07:40", typ: "vorsorge", art: 1, material: [],
      dokumentation: { mutter: {}, kinder: {}, notiz: null }, unterschrift: { art: "papier", zeitpunkt: new Date().toISOString() }, abschliessen: true,
    });
    expect(r.statusCode).toBe(200);
    // ein Entwurf zählt nicht
    await req("POST", `/api/betreuungen/${betreuungId}/besuche`, { datum: heute, von: "08:00", bis: "08:30", typ: "vorsorge", art: 1, material: [], dokumentation: { mutter: {}, kinder: {}, notiz: null }, unterschrift: { art: "keine" }, abschliessen: false });

    const nachher = (await req("GET", `/api/statistik?jahr=${jahr}`)).json() as Statistik;
    expect(nachher.summen.besuche).toBe(vorher.summen.besuche + 1);
    const m = heute.slice(0, 7);
    expect(nachher.monate.find((x) => x.monat === m)!.eigeneBesuche).toBe(vorher.monate.find((x) => x.monat === m)!.eigeneBesuche + 1);
    expect(nachher.jeHebamme.find((h) => h.id === johannaId)!.besuche).toBe(vorher.jeHebamme.find((h) => h.id === johannaId)!.besuche + 1);
    expect(nachher.orte.some((o) => o.familien > 0)).toBe(true);
    expect(nachher.meins.umsatzKasse).toBeGreaterThan(vorher.meins.umsatzKasse);
    expect(nachher.meins.nichtVersendet).toBeGreaterThan(vorher.meins.nichtVersendet);

    // Marielena sieht den Besuch im Team, aber nicht Johannas Umsatz
    const nachherM = (await req("GET", `/api/statistik?jahr=${jahr}`, undefined, marielena)).json() as Statistik;
    expect(nachherM.summen.besuche).toBe(vorherM.summen.besuche + 1);
    expect(nachherM.meins.umsatzKasse).toBe(vorherM.meins.umsatzKasse);

    // anderes Jahr: leer
    const alt = (await req("GET", "/api/statistik?jahr=2001")).json() as Statistik;
    expect(alt).toMatchObject({ jahr: 2001, summen: { besuche: 0, familien: 0 } });
    expect((await t.app.inject({ method: "GET", url: "/api/statistik" })).statusCode).toBe(401);
  });
});
