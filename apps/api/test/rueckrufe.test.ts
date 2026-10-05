import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rueckruf } from "../src/db/schema";
import { anmelden, testAppStarten } from "./hilfen";

let t: Awaited<ReturnType<typeof testAppStarten>>;
let johanna: string;
let marielena: string;
let marielenaId: string;

beforeAll(async () => {
  t = await testAppStarten();
  johanna = (await anmelden(t.app, "johanna@kindkesmoeoen.test")).cookie;
  const m = await anmelden(t.app, "marielena@kindkesmoeoen.test");
  marielena = m.cookie;
  marielenaId = m.daten.id;
});
afterAll(async () => t?.schliessen());

const req = (method: "GET" | "POST" | "DELETE", url: string, payload?: unknown, cookie: string | null = johanna) =>
  t.app.inject({ method, url, payload: payload as object, headers: cookie ? { cookie } : {} });

const wunsch = { name: "Ronja Rückruf", telefon: "0381 123 456", anliegen: "stillen", zeitfenster: "vormittag", hebamme: "Marielena Pontus", nachricht: "Baby trinkt schlecht", einwilligung: true };

describe("Rückrufwunsch von der Website", () => {
  let id: string;

  it("nimmt Rückrufwünsche ohne Konto an – mit Einwilligung, Telefonnummer und Spam-Schutz", async () => {
    expect((await req("POST", "/api/oeffentlich/rueckruf", { ...wunsch, einwilligung: false }, null)).statusCode).toBe(400);
    expect((await req("POST", "/api/oeffentlich/rueckruf", { ...wunsch, telefon: "" }, null)).statusCode).toBe(400);
    expect((await req("POST", "/api/oeffentlich/rueckruf", { ...wunsch, webseite: "spam" }, null)).statusCode).toBe(400);
    const r = await t.app.inject({ method: "POST", url: "/api/oeffentlich/rueckruf", payload: wunsch, headers: { origin: "http://localhost:4321" } });
    expect(r.statusCode).toBe(200);
    expect(r.headers["access-control-allow-origin"]).toBe("http://localhost:4321");
    expect(r.json()).toEqual({ ok: true });
    // Unbekannte Wunsch-Hebamme wird ignoriert
    expect((await req("POST", "/api/oeffentlich/rueckruf", { ...wunsch, name: "Zweite Mutter", hebamme: "Gibt es nicht" }, null)).statusCode).toBe(200);
  });

  it("zeigt Rückrufwünsche im Cockpit (mit Wunsch-Hebamme) und in der Liste – nur für Hebammen", async () => {
    expect((await req("GET", "/api/rueckrufe", undefined, null)).statusCode).toBe(401);
    const hj = (await req("GET", "/api/hinweise")).json().find((h: { id: string }) => h.id === "rueckrufe");
    expect(hj).toMatchObject({ titel: "2 Rückrufwünsche", link: "/anfragen#rueckrufe", stufe: "info" });
    const hm = (await req("GET", "/api/hinweise", undefined, marielena)).json().find((h: { id: string }) => h.id === "rueckrufe");
    expect(hm.titel).toBe("2 Rückrufwünsche (1 für dich)");
    const liste = (await req("GET", "/api/rueckrufe")).json();
    expect(liste).toHaveLength(2);
    const r = liste.find((x: { name: string }) => x.name === "Ronja Rückruf");
    expect(r).toMatchObject({ status: "offen", telefon: "0381 123 456", anliegen: "stillen", zeitfenster: "vormittag", hebammeId: marielenaId, versuche: 0, hebamme: { name: "Marielena Pontus" } });
    expect(liste.find((x: { name: string }) => x.name === "Zweite Mutter").hebammeId).toBeNull();
    id = r.id;
  });

  it("vermerkt Anrufversuche, erledigt und öffnet wieder", async () => {
    expect((await req("POST", `/api/rueckrufe/${id}/aktion`, { aktion: "nicht_erreicht", notiz: "Mailbox" })).statusCode).toBe(200);
    expect((await req("POST", `/api/rueckrufe/${id}/aktion`, { aktion: "nicht_erreicht" })).statusCode).toBe(200);
    let r = (await req("GET", "/api/rueckrufe")).json().find((x: { id: string }) => x.id === id);
    expect(r).toMatchObject({ status: "offen", versuche: 2, notiz: "Mailbox" });
    expect(r.letzterVersuchAm).toBeTruthy();

    expect((await req("POST", `/api/rueckrufe/${id}/aktion`, { aktion: "erreicht", notiz: "Stillberatung am Do vereinbart" })).statusCode).toBe(200);
    r = (await req("GET", "/api/rueckrufe")).json().find((x: { id: string }) => x.id === id);
    expect(r).toMatchObject({ status: "erledigt", notiz: "Mailbox\nStillberatung am Do vereinbart", erledigtVonName: "Johanna Mede" });
    expect((await req("GET", "/api/hinweise")).json().find((h: { id: string }) => h.id === "rueckrufe").titel).toBe("1 Rückrufwunsch");

    expect((await req("POST", `/api/rueckrufe/${id}/aktion`, { aktion: "wieder_oeffnen" })).statusCode).toBe(200);
    expect((await req("GET", "/api/rueckrufe")).json().find((x: { id: string }) => x.id === id)).toMatchObject({ status: "offen", erledigtAm: null });
    expect((await req("POST", `/api/rueckrufe/${id}/aktion`, { aktion: "unbekannt" })).statusCode).toBe(400);
    expect((await req("POST", "/api/rueckrufe/00000000-0000-0000-0000-000000000000/aktion", { aktion: "erreicht" })).statusCode).toBe(404);
  });

  it("löscht erledigte Rückrufwünsche nach 30 Tagen und auf Wunsch sofort", async () => {
    await req("POST", `/api/rueckrufe/${id}/aktion`, { aktion: "erreicht" });
    await t.db.update(rueckruf).set({ geaendertAm: new Date(Date.now() - 31 * 86_400_000) }).where(eq(rueckruf.id, id));
    const liste = (await req("GET", "/api/rueckrufe")).json();
    expect(liste.some((x: { id: string }) => x.id === id)).toBe(false);
    const rest = liste[0].id;
    expect((await req("DELETE", `/api/rueckrufe/${rest}`)).statusCode).toBe(200);
    expect((await req("GET", "/api/rueckrufe")).json()).toHaveLength(0);
    expect((await req("GET", "/api/hinweise")).json().some((h: { id: string }) => h.id === "rueckrufe")).toBe(false);
  });
});
