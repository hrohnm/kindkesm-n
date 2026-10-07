import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anfrage } from "../src/db/schema";
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

// ET in drei Monaten (Monatsmitte), damit der Monat sicher in der Zukunft liegt
const etDatum = (() => {
  const d = new Date();
  d.setUTCDate(15);
  d.setUTCMonth(d.getUTCMonth() + 3);
  return d.toISOString().slice(0, 10);
})();
const etMonat = etDatum.slice(0, 7);
const webAnfrage = { vorname: "Lea", nachname: "Website", email: "lea@example.org", et: etDatum, plz: "18236", ort: "Kröpelin", erstesKind: true, leistungen: ["vorsorge", "wochenbett"], nachricht: "Wir freuen uns!", einwilligung: true };

describe("M11 Betreuungsanfragen und Belegungsplan", () => {
  let anfrageId: string;

  it("nimmt Anfragen von der Website ohne Konto an – mit Einwilligung und Spam-Schutz", async () => {
    expect((await req("POST", "/api/oeffentlich/anfrage", { ...webAnfrage, einwilligung: false }, null)).statusCode).toBe(400);
    expect((await req("POST", "/api/oeffentlich/anfrage", { ...webAnfrage, webseite: "http://spam" }, null)).statusCode).toBe(400);
    expect((await req("POST", "/api/oeffentlich/anfrage", { ...webAnfrage, email: "", telefon: "" }, null)).statusCode).toBe(400);
    const r = await t.app.inject({ method: "POST", url: "/api/oeffentlich/anfrage", payload: webAnfrage, headers: { origin: "http://localhost:4321" } });
    expect(r.statusCode).toBe(200);
    expect(r.headers["access-control-allow-origin"]).toBe("http://localhost:4321");
    expect(r.json()).toEqual({ ok: true }); // keine Daten zurück
  });

  it("erlaubt den Preflight nur für die Website", async () => {
    const ok = await t.app.inject({ method: "OPTIONS", url: "/api/oeffentlich/anfrage", headers: { origin: "http://localhost:4321", "access-control-request-method": "POST" } });
    expect(ok.statusCode).toBe(204);
    expect(ok.headers["access-control-allow-origin"]).toBe("http://localhost:4321");
    expect(ok.headers["access-control-allow-headers"]).toContain("Content-Type");
    const fremd = await t.app.inject({ method: "OPTIONS", url: "/api/oeffentlich/anfrage", headers: { origin: "https://fremd.example" } });
    expect(fremd.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("zeigt neue Anfragen im Cockpit und in der Liste – nur angemeldet", async () => {
    expect((await req("GET", "/api/anfragen", undefined, null)).statusCode).toBe(401);
    const hinweise = (await req("GET", "/api/hinweise")).json();
    expect(hinweise.find((h: { id: string }) => h.id === "anfragen-neu")).toMatchObject({ titel: "1 neue Betreuungsanfrage", link: "/anfragen" });
    const liste = (await req("GET", "/api/anfragen")).json();
    expect(liste).toHaveLength(1);
    expect(liste[0]).toMatchObject({ status: "neu", quelle: "website", vorname: "Lea", leistungen: ["vorsorge", "wochenbett"] });
    expect(liste[0].einwilligungAm).toBeTruthy();
    anfrageId = liste[0].id;
  });

  it("schlägt Hebammen nach Kapazität vor; Urlaub und Babypause zählen", async () => {
    const vorher = (await req("GET", `/api/anfragen/${anfrageId}`)).json();
    expect(vorher.vorschlag).toHaveLength(3);
    // Lorina ist in Babypause bis 01.03.2027 → im ET-Monat (in drei Monaten) nur teilweise bzw. gar nicht verfügbar
    expect(vorher.vorschlag[0].name).not.toBe("Lorina Gosemann");

    // Johanna nimmt im ganzen ET-Monat Urlaub → Marielena passt am besten
    const [j, m] = etMonat.split("-").map(Number) as [number, number];
    const letzter = new Date(Date.UTC(j, m, 0)).toISOString().slice(0, 10);
    expect((await req("POST", "/api/abwesenheiten", { von: `${etMonat}-01`, bis: letzter, art: "urlaub" })).statusCode).toBe(200);
    expect((await req("POST", "/api/abwesenheiten", { von: "2027-02-10", bis: "2027-02-01", art: "urlaub" })).statusCode).toBe(400);
    const nachher = (await req("GET", `/api/anfragen/${anfrageId}`)).json();
    expect(nachher.vorschlag[0].name).toBe("Marielena Pontus");
    expect(nachher.vorschlag.find((v: { name: string }) => v.name === "Johanna Mede").gruende[0]).toBe("im ET-Monat nicht verfügbar");

    const belegung = (await req("GET", `/api/belegung?start=${etMonat}&monate=1`)).json();
    const zelle = belegung.plan[0].je.find((z: { hebammeId: string }) => z.hebammeId === johannaId);
    expect(zelle).toMatchObject({ kapazitaet: 0, stufe: "abwesend" });
    expect(belegung.plan[0].offen).toBe(1);
  });

  it("legt bei der Zusage Akte und Betreuung an", async () => {
    const r = (await req("POST", `/api/anfragen/${anfrageId}/aktion`, { aktion: "zusagen", hebammeId: marielenaId })).json();
    expect(r.klientinId).toBeTruthy();
    const akte = (await req("GET", `/api/klientinnen/${r.klientinId}`)).json();
    expect(akte).toMatchObject({ vorname: "Lea", nachname: "Website", ort: "Kröpelin", zustaendigeHebammeId: marielenaId, flaggen: ["erstgebaerend"] });
    expect(akte.betreuungen[0]).toMatchObject({ status: "schwangerschaft", et: etDatum, para: 0 });
    expect(akte.betreuungen[0].notizen).toContain("Wünsche: Schwangerschaftsvorsorge, Wochenbettbetreuung");
    expect((await req("POST", `/api/anfragen/${anfrageId}/aktion`, { aktion: "absagen" })).statusCode).toBe(409);
    // jetzt im Belegungsplan bei Marielena belegt, nicht mehr offen
    const belegung = (await req("GET", `/api/belegung?start=${etMonat}&monate=1`)).json();
    expect(belegung.plan[0].je.find((z: { hebammeId: string }) => z.hebammeId === marielenaId).belegt).toBe(1);
    expect(belegung.plan[0].offen).toBe(0);
  });

  it("erfasst telefonische Anfragen, Warteliste, Absage und Löschen", async () => {
    const neu = (await req("POST", "/api/anfragen", { vorname: "Tina", nachname: "Telefon", telefon: "0381 1", et: etDatum, ort: "Rostock", leistungen: ["wochenbett"] })).json();
    expect(neu).toMatchObject({ status: "in_pruefung", quelle: "telefon" });
    await req("POST", `/api/anfragen/${neu.id}/aktion`, { aktion: "warteliste", notiz: "Rückruf im Januar" });
    expect((await req("GET", `/api/anfragen/${neu.id}`)).json()).toMatchObject({ status: "warteliste", notiz: "Rückruf im Januar" });
    expect((await req("POST", `/api/anfragen/${neu.id}/aktion`, { aktion: "weiterleiten", notiz: "" })).statusCode).toBe(400);
    await req("POST", `/api/anfragen/${neu.id}/aktion`, { aktion: "absagen", notiz: "Kapazität erschöpft" });
    expect((await req("GET", `/api/anfragen/${neu.id}`)).json()).toMatchObject({ status: "abgesagt", notiz: "Rückruf im Januar\nKapazität erschöpft" });
    // Abgeschlossene Anfragen werden nach der Aufbewahrungsfrist automatisch gelöscht
    await t.db.update(anfrage).set({ geaendertAm: new Date("2020-01-01") }).where(eq(anfrage.id, neu.id));
    const liste = (await req("GET", "/api/anfragen")).json();
    expect(liste.some((a: { id: string }) => a.id === neu.id)).toBe(false);
  });

  it("liefert der Website Kapazitätsampel und Team-Status ohne Zahlen und Klientinnen", async () => {
    const r = (await req("GET", "/api/oeffentlich/praxis", undefined, null)).json();
    expect(r.kapazitaet).toHaveLength(12);
    expect(Object.keys(r.kapazitaet[0])).toEqual(["monat", "name", "stufe"]);
    expect(["frei", "knapp", "ausgebucht"]).toContain(r.kapazitaet[0].stufe);
    expect(r.team.find((h: { name: string }) => h.name === "Lorina Gosemann")).toEqual({ name: "Lorina Gosemann", status: "babypause", babypauseBis: "2027-03", abwesendBis: null });
    expect(JSON.stringify(r)).not.toContain("Lea");
  });

  it("Kapazität je Hebamme im Profil einstellbar", async () => {
    const profil = (await req("GET", "/api/ich/profil")).json();
    expect(profil.wochenbettenProMonat).toBe(4);
    expect((await req("PUT", "/api/ich/profil", { ...profil, wochenbettenProMonat: 2 })).statusCode).toBe(200);
    const start = new Date().toISOString().slice(0, 7);
    const belegung = (await req("GET", `/api/belegung?start=${start}&monate=1`)).json();
    expect(belegung.hebammen.find((h: { id: string }) => h.id === johannaId).wochenbettenProMonat).toBe(2);
  });
});
