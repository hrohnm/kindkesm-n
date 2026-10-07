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
const tag = (d: number) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
};
type Hinweis = { id: string; titel: string; erledigbar?: boolean; link?: string };
const hinweise = async (cookie = johanna) => (await req("GET", "/api/hinweise", undefined, cookie)).json() as Hinweis[];

async function klientinMitBetreuung(nachname: string, et: string) {
  const k = (await req("POST", "/api/klientinnen", { vorname: "Auto", nachname, zustaendigeHebammeId: johannaId, et })).json();
  return { klientinId: k.id as string, betreuungId: (await req("GET", `/api/klientinnen/${k.id}`)).json().betreuungen[0].id as string };
}

describe("M23 Erinnerungen", () => {
  it("erinnert an den ET in den nächsten zwei Wochen und lässt sich abhaken", async () => {
    const { betreuungId, klientinId } = await klientinMitBetreuung("Bald", tag(9));
    const h = (await hinweise()).find((x) => x.id === `auto-et-${betreuungId}`);
    expect(h).toMatchObject({ titel: "ET von Auto Bald in 9 Tagen – Wochenbett vorbereiten", erledigbar: true, link: `/klientinnen/${klientinId}` });
    expect((await hinweise(marielena)).some((x) => x.id === `auto-et-${betreuungId}`)).toBe(false);
    expect((await req("POST", `/api/hinweise/auto-et-${betreuungId}/erledigt`)).statusCode).toBe(200);
    expect((await req("POST", `/api/hinweise/auto-et-${betreuungId}/erledigt`)).statusCode).toBe(200); // doppelt egal
    expect((await hinweise()).some((x) => x.id === `auto-et-${betreuungId}`)).toBe(false);
    expect((await req("POST", "/api/hinweise/vorjahr-offen/erledigt")).statusCode).toBe(400);
  });

  it("erinnert an die U3 und an den Rückbildungskurs", async () => {
    const a = await klientinMitBetreuung("Ufrau", tag(-30));
    const kindA = (await req("POST", `/api/betreuungen/${a.betreuungId}/kinder`, { vorname: "Uli", geburtsdatum: tag(-27), geburtsgewicht: 3400, laenge: "", kopfumfang: "" })).json().id;
    const b = await klientinMitBetreuung("Rueck", tag(-60));
    await req("POST", `/api/betreuungen/${b.betreuungId}/kinder`, { vorname: "Rike", geburtsdatum: tag(-55), geburtsgewicht: 3400, laenge: "", kopfumfang: "" });
    const liste = await hinweise();
    expect(liste.find((x) => x.id === `auto-u3-${kindA}`)?.titel).toBe("U3 für Uli steht an (4.–5. Lebenswoche) – Eltern erinnern");
    expect(liste.find((x) => x.id === `auto-rueckbildung-${b.betreuungId}`)?.titel).toBe("Rückbildungskurs anbieten: Auto Rueck (Kind in der 8. Lebenswoche)");
    expect(liste.some((x) => x.id === `auto-rueckbildung-${a.betreuungId}`)).toBe(false);
  });
});
