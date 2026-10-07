import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anmelden, testAppStarten } from "./hilfen";

let t: Awaited<ReturnType<typeof testAppStarten>>;
let johanna: string;
let marielena: string;
let johannaId: string;
let marielenaId: string;
let lorinaId: string;

beforeAll(async () => {
  t = await testAppStarten();
  const j = await anmelden(t.app, "johanna@kindkesmoeoen.test");
  johanna = j.cookie;
  johannaId = j.daten.id;
  const m = await anmelden(t.app, "marielena@kindkesmoeoen.test");
  marielena = m.cookie;
  marielenaId = m.daten.id;
  lorinaId = (await anmelden(t.app, "lorina@kindkesmoeoen.test")).daten.id;
});
afterAll(async () => t?.schliessen());

const req = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown, cookie: string | null = johanna) =>
  t.app.inject({ method, url, payload: payload as object, headers: cookie ? { cookie } : {} });
const heute = new Date().toISOString().slice(0, 10);
const tag = (d: number) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
};
type Hinweis = { id: string; titel: string; erledigbar?: boolean; link?: string };

describe("M19 Übergabe und Rufbereitschaft", () => {
  it("speichert eine Kurzübergabe und meldet sie der Vertretung", async () => {
    const k = (await req("POST", "/api/klientinnen", { vorname: "Ueber", nachname: "Gabe", zustaendigeHebammeId: johannaId, et: tag(20) })).json();
    const b = (await req("GET", `/api/klientinnen/${k.id}`)).json().betreuungen[0];
    const basis = { status: b.status, et: b.et, gravida: "", para: "", geburtsort: "", geburtsmodus: "", zustaendigeHebammeId: johannaId, vertretungHebammeId: marielenaId, notizen: "" };
    expect((await req("PUT", `/api/betreuungen/${b.id}`, { ...basis, uebergabe: "Hund bellt, bitte vorher anrufen. Mamillen wund." })).statusCode).toBe(200);
    const akte = (await req("GET", `/api/klientinnen/${k.id}`)).json().betreuungen[0];
    expect(akte).toMatchObject({ uebergabe: "Hund bellt, bitte vorher anrufen. Mamillen wund.", uebergabeVon: johannaId });
    expect(akte.uebergabeAm).toBeTruthy();
    // Ohne Änderung der Übergabe bleibt der Zeitpunkt
    await req("PUT", `/api/betreuungen/${b.id}`, { ...basis, notizen: "neu", uebergabe: "Hund bellt, bitte vorher anrufen. Mamillen wund." });
    expect((await req("GET", `/api/klientinnen/${k.id}`)).json().betreuungen[0].uebergabeAm).toBe(akte.uebergabeAm);
    // Marielena (Vertretung) bekommt den Hinweis, kann ihn abhaken
    const h = ((await req("GET", "/api/hinweise", undefined, marielena)).json() as Hinweis[]).find((x) => x.id.startsWith(`auto-uebergabe-${b.id}`));
    expect(h).toMatchObject({ titel: "Übergabe für dich: Ueber Gabe (von Johanna)", erledigbar: true, link: `/klientinnen/${k.id}` });
    expect((await req("POST", `/api/hinweise/${h!.id}/erledigt`, undefined, marielena)).statusCode).toBe(200);
    expect(((await req("GET", "/api/hinweise", undefined, marielena)).json() as Hinweis[]).some((x) => x.id === h!.id)).toBe(false);
    // Neue Übergabe → neuer Hinweis
    await req("PUT", `/api/betreuungen/${b.id}`, { ...basis, uebergabe: "Jetzt auch Stillprobleme." });
    expect(((await req("GET", "/api/hinweise", undefined, marielena)).json() as Hinweis[]).some((x) => x.id.startsWith(`auto-uebergabe-${b.id}`))).toBe(true);
    expect(((await req("GET", "/api/hinweise")).json() as Hinweis[]).some((x) => x.id.startsWith(`auto-uebergabe-${b.id}`))).toBe(false);
  });

  it("plant die Rufbereitschaft für das Team", async () => {
    expect((await req("POST", "/api/rufbereitschaft", { hebammeId: marielenaId, von: tag(1), bis: heute })).statusCode).toBe(400);
    expect((await req("POST", "/api/rufbereitschaft", { hebammeId: lorinaId, von: heute, bis: heute })).json().felder.hebammeId).toMatch(/aktive/);
    const r = (await req("POST", "/api/rufbereitschaft", { hebammeId: marielenaId, von: heute, bis: tag(1), notiz: "Wochenende" })).json();
    const liste = (await req("GET", "/api/rufbereitschaft", undefined, marielena)).json();
    expect(liste.find((x: { id: string }) => x.id === r.id)).toMatchObject({ name: "Marielena Pontus", notiz: "Wochenende" });
    const hj = ((await req("GET", "/api/hinweise")).json() as Hinweis[]).find((x) => x.id === `rufbereitschaft-${r.id}`);
    expect(hj?.titel).toBe("Rufbereitschaft heute: Marielena Pontus");
    const hm = ((await req("GET", "/api/hinweise", undefined, marielena)).json() as Hinweis[]).find((x) => x.id === `rufbereitschaft-${r.id}`);
    expect(hm?.titel).toMatch(/^Du hast heute Rufbereitschaft \(bis \d{2}\.\d{2}\.\d{4}\)$/);
    // Öffentlich: nur der Name, keine Notiz
    const p = (await req("GET", "/api/oeffentlich/praxis", undefined, null)).json();
    expect(p.rufbereitschaft).toEqual(["Marielena Pontus"]);
    expect(JSON.stringify(p)).not.toContain("Wochenende");
    expect((await req("DELETE", `/api/rufbereitschaft/${r.id}`)).statusCode).toBe(200);
    expect((await req("GET", "/api/oeffentlich/praxis", undefined, null)).json().rufbereitschaft).toEqual([]);
  });

  it("zeigt auf der Website, bis wann eine Hebamme abwesend ist – ohne Grund", async () => {
    await req("POST", "/api/abwesenheiten", { von: tag(-1), bis: tag(6), art: "krank", notiz: "Grippe" });
    const p = (await req("GET", "/api/oeffentlich/praxis", undefined, null)).json();
    expect(p.team.find((x: { name: string }) => x.name === "Johanna Mede")).toMatchObject({ abwesendBis: tag(6) });
    expect(p.team.find((x: { name: string }) => x.name === "Marielena Pontus").abwesendBis).toBeNull();
    expect(JSON.stringify(p)).not.toMatch(/krank|Grippe/);
  });
});
