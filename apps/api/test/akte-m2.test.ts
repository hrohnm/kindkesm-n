import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

const req = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown, cookie = johanna) => t.app.inject({ method, url, payload: payload as object, headers: { cookie } });
const krueger = async () => (await req("GET", "/api/klientinnen?q=Krüger")).json()[0].id as string;
const heute = new Date().toISOString().slice(0, 10);

describe("Akte: Merkmale, Kontakte, Einwilligungen, Vertretung", () => {
  it("speichert Flaggen, Sprache und Allergien und zeigt sie im Besuch", async () => {
    const id = await krueger();
    const r = await req("PUT", `/api/klientinnen/${id}/merkmale`, { flaggen: ["risiko", "dolmetscherin"], sprache: "Polnisch", allergien: "Penicillin" });
    expect(r.json()).toEqual({ flaggen: ["risiko", "dolmetscherin"], sprache: "Polnisch", allergien: "Penicillin" });
    expect((await req("PUT", `/api/klientinnen/${id}/merkmale`, { flaggen: ["unbekannt"], sprache: "", allergien: "" })).statusCode).toBe(400);
    const akte = (await req("GET", `/api/klientinnen/${id}`)).json();
    const b = (await req("GET", `/api/betreuungen/${akte.betreuungen[0].id}`)).json();
    expect(b.klientin).toMatchObject({ allergien: "Penicillin", flaggen: ["risiko", "dolmetscherin"] });
    const liste = (await req("GET", "/api/klientinnen?q=Krüger")).json();
    expect(liste[0].flaggen).toContain("risiko");
  });

  it("verwaltet Kontakte", async () => {
    const id = await krueger();
    const k = (await req("POST", `/api/klientinnen/${id}/kontakte`, { art: "kinderaerztin", name: "Dr. Beispiel", telefon: "038203 12345", email: "", anschrift: "Markt 1, Bad Doberan", notiz: "" })).json();
    expect(k).toMatchObject({ art: "kinderaerztin", name: "Dr. Beispiel", email: null });
    expect((await req("POST", `/api/klientinnen/${id}/kontakte`, { art: "partner", name: "" })).statusCode).toBe(400);
    expect((await req("PUT", `/api/kontakte/${k.id}`, { art: "kinderaerztin", name: "Dr. Beispiel-Neu" })).json().name).toBe("Dr. Beispiel-Neu");
    expect((await req("GET", `/api/klientinnen/${id}`)).json().kontakte.map((x: { name: string }) => x.name)).toContain("Dr. Beispiel-Neu");
    expect((await req("DELETE", `/api/kontakte/${k.id}`)).statusCode).toBe(200);
    expect((await req("GET", `/api/klientinnen/${id}`)).json().kontakte.some((x: { id: string }) => x.id === k.id)).toBe(false);
  });

  it("erfasst und widerruft Einwilligungen", async () => {
    const id = await krueger();
    expect((await req("PUT", `/api/klientinnen/${id}/einwilligungen/foto`, { erteilt: true, form: "tablet", datum: heute })).statusCode).toBe(400); // Unterschrift fehlt
    const png = "data:image/png;base64,iVBORw0KGgo=";
    const e = (await req("PUT", `/api/klientinnen/${id}/einwilligungen/foto`, { erteilt: true, form: "tablet", datum: heute, unterschrift: { bild: png, zeitpunkt: new Date().toISOString() } })).json();
    expect(e).toMatchObject({ art: "foto", erteilt: true, form: "tablet", widerrufenAm: null });
    const w = (await req("PUT", `/api/klientinnen/${id}/einwilligungen/foto`, { erteilt: false, form: "muendlich", datum: heute })).json();
    expect(w).toMatchObject({ erteilt: false, form: "tablet", widerrufenAm: heute }); // ursprüngliche Erteilung bleibt nachvollziehbar
    expect(w.unterschrift.bild).toBe(png);
    expect((await req("PUT", `/api/klientinnen/${id}/einwilligungen/werbung`, { erteilt: true, form: "papier", datum: heute })).statusCode).toBe(404);
    const akte = (await req("GET", `/api/klientinnen/${id}`)).json();
    expect(akte.einwilligungen.find((x: { art: string }) => x.art === "foto").erteilt).toBe(false);
  });

  it("Art der Geburt beim Erfassen des Kindes und Kaiserschnittnarbe in der Dokumentation", async () => {
    const id = await krueger();
    const akte = (await req("GET", `/api/klientinnen/${id}`)).json();
    const b = akte.betreuungen[0];
    const kind = b.kinder[0];
    await req("PUT", `/api/kinder/${kind.id}`, { ...kind, geburtsmodus: "sectio_sekundaer" });
    expect((await req("GET", `/api/betreuungen/${b.id}`)).json().geburtsmodus).toBe("sectio_sekundaer");
    const r = await req("POST", `/api/betreuungen/${b.id}/besuche`, {
      datum: heute, von: "16:00", bis: "16:40", typ: "wochenbett", art: 1, material: [],
      dokumentation: { mutter: { sectionarbe: "reizlos, Fäden/Klammern liegen", brust: "gefüllt, wunde Mamillen" }, kinder: {}, notiz: null },
      unterschrift: { art: "keine" }, abschliessen: false,
    });
    expect(r.statusCode).toBe(200);
    const besuch = (await req("GET", `/api/besuche/${r.json().besuch.id}`)).json();
    expect(besuch.dokumentation.mutter).toMatchObject({ sectionarbe: "reizlos, Fäden/Klammern liegen", brust: "gefüllt, wunde Mamillen" });
  });

  it("Vertretung: Fall erscheint bei der vertretenden Hebamme unter „Meine“", async () => {
    const id = await krueger();
    const vorher = (await req("GET", "/api/klientinnen?nur=meine", undefined, marielena)).json();
    expect(vorher.some((k: { id: string }) => k.id === id)).toBe(false);
    const akte = (await req("GET", `/api/klientinnen/${id}`)).json();
    const b = akte.betreuungen[0];
    await req("PUT", `/api/betreuungen/${b.id}`, { status: b.status, et: b.et, gravida: b.gravida, para: b.para, geburtsort: b.geburtsort, geburtsmodus: b.geburtsmodus, zustaendigeHebammeId: b.zustaendigeHebammeId, notizen: b.notizen, vertretungHebammeId: marielenaId });
    const nachher = (await req("GET", "/api/klientinnen?nur=meine", undefined, marielena)).json();
    const k = nachher.find((x: { id: string }) => x.id === id);
    expect(k.betreuung.vertretungHebammeId).toBe(marielenaId);
    // ohne Angabe bleibt die Vertretung erhalten
    await req("PUT", `/api/betreuungen/${b.id}`, { status: b.status, et: b.et, zustaendigeHebammeId: b.zustaendigeHebammeId });
    expect((await req("GET", `/api/klientinnen/${id}`)).json().betreuungen[0].vertretungHebammeId).toBe(marielenaId);
  });
});
