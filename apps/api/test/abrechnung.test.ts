import { PDFDocument } from "pdf-lib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anmelden, testAppStarten } from "./hilfen";

let t: Awaited<ReturnType<typeof testAppStarten>>;
let marielena: string;
let johanna: string;

beforeAll(async () => {
  t = await testAppStarten();
  marielena = (await anmelden(t.app, "marielena@kindkesmoeoen.test")).cookie;
  johanna = (await anmelden(t.app, "johanna@kindkesmoeoen.test")).cookie;
});
afterAll(async () => t?.schliessen());

const req = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown, cookie = marielena) =>
  t.app.inject({ method, url, payload: payload as object, headers: { cookie } });
const heute = new Date().toISOString().slice(0, 10);

describe("Abrechnung", () => {
  it("zeigt offene Fälle mit Vorabprüfung", async () => {
    const r = (await req("GET", "/api/abrechnung/offen")).json();
    expect(r.faelle).toHaveLength(1); // Hansen (Wolff hat keine Besuche)
    expect(r.faelle[0]).toMatchObject({ name: "Maria Hansen", anzahlBesuche: 3, belege: { tablet: 2, papier: 0 } });
    expect(r.faelle[0].pruefung).toEqual([]);
    expect(r.summe).toBeGreaterThan(250);
  });

  it("meldet fehlende Pflichtangaben und lässt den Fall aus", async () => {
    const liste = (await req("GET", "/api/klientinnen?q=Krüger", undefined, johanna)).json();
    const akte = (await req("GET", `/api/klientinnen/${liste[0].id}`, undefined, johanna)).json();
    const { betreuungen: _b, id, erstelltAm: _e, geaendertAm: _g, archiviert: _a, ...stamm } = akte;
    await req("PUT", `/api/klientinnen/${id}`, { ...stamm, versichertennummer: "" }, johanna);
    const r = (await req("GET", "/api/abrechnung/offen", undefined, johanna)).json();
    const krueger = r.faelle.find((f: { name: string }) => f.name === "Lena Krüger");
    expect(krueger.pruefung[0]).toMatchObject({ stufe: "fehler", text: "Versichertennummer fehlt" });
    const v = (await req("POST", "/api/abrechnung/versaende", { bis: heute }, johanna)).json();
    expect(v.ausgelassen.map((f: { name: string }) => f.name)).toContain("Lena Krüger");
    expect(v.versand.anzahlFaelle).toBe(1); // nur Berger
    await req("PUT", `/api/klientinnen/${id}`, { ...stamm }, johanna);
  });

  let versandId: string;
  it("bereitet einen Versand vor und erzeugt die Versandmappe", async () => {
    const r = await req("POST", "/api/abrechnung/versaende", { bis: heute });
    expect(r.statusCode).toBe(200);
    versandId = r.json().versand.id;
    expect(r.json().versand.nummer).toMatch(/^\d{4}-\d{2}-MP-1$/);

    const pdf = await req("GET", `/api/abrechnung/versaende/${versandId}/mappe.pdf`);
    expect(pdf.statusCode).toBe(200);
    expect(pdf.headers["content-type"]).toBe("application/pdf");
    const doc = await PDFDocument.load(pdf.rawPayload);
    // Deckblatt + Datenblatt + 1 Formularblatt 3.3 (zwei Tablet-Besuche, Telefon nicht auf dem Formular)
    expect(doc.getPageCount()).toBe(3);
  });

  it("sperrt Besuche, deren Leistungen im Versand sind", async () => {
    const d = (await req("GET", `/api/abrechnung/versaende/${versandId}`)).json();
    const fall = d.faelle[0];
    const besuche = (await req("GET", `/api/betreuungen/${fall.betreuungId}/besuche`)).json();
    const b = (await req("GET", `/api/besuche/${besuche[0].id}`)).json();
    const res = await req("PUT", `/api/besuche/${b.id}`, { datum: b.datum, von: b.von, bis: b.bis, typ: b.typ, art: b.art, material: b.material, dokumentation: b.dokumentation, unterschrift: b.unterschrift, abschliessen: true });
    expect(res.statusCode).toBe(409);
  });

  it("markiert versendet, verhindert Auflösen und erfasst Zahlung mit Kürzung", async () => {
    expect((await req("POST", `/api/abrechnung/versaende/${versandId}/versendet`, { einschreibenNr: "RR123456789DE" })).json().status).toBe("versendet");
    expect((await req("POST", `/api/abrechnung/versaende/${versandId}/aufloesen`)).statusCode).toBe(409);
    const d = (await req("GET", `/api/abrechnung/versaende/${versandId}`)).json();
    const l = d.faelle[0].leistungen[0];
    const bez = (await req("POST", `/api/abrechnung/versaende/${versandId}/bezahlt`, { bezahltAm: heute, kuerzungen: [{ leistungId: l.id, betrag: 12.38, grund: "Mehrlingszuschlag nicht anerkannt" }] })).json();
    expect(bez.status).toBe("bezahlt");
    expect(Number(bez.ausgezahlt)).toBeCloseTo(Number(d.summe) - 12.38, 2);
    const nachher = (await req("GET", `/api/abrechnung/versaende/${versandId}`)).json();
    expect(nachher.faelle[0].leistungen.find((x: { id: string }) => x.id === l.id)).toMatchObject({ status: "gekuerzt", kuerzungGrund: "Mehrlingszuschlag nicht anerkannt" });
  });

  it("löst einen vorbereiteten Versand wieder auf", async () => {
    const r = (await req("GET", "/api/abrechnung/versaende", undefined, johanna)).json();
    const v = r[0];
    expect((await req("POST", `/api/abrechnung/versaende/${v.id}/aufloesen`, undefined, johanna)).statusCode).toBe(200);
    const offen = (await req("GET", "/api/abrechnung/offen", undefined, johanna)).json();
    expect(offen.faelle.some((f: { name: string }) => f.name === "Sophie Berger")).toBe(true);
  });

  it("druckt ein Formular mit vorausgefülltem Kopf", async () => {
    const liste = (await req("GET", "/api/klientinnen?q=Berger", undefined, johanna)).json();
    const akte = (await req("GET", `/api/klientinnen/${liste[0].id}`, undefined, johanna)).json();
    const pdf = await req("GET", `/api/betreuungen/${akte.betreuungen[0].id}/formular/3.1.pdf`, undefined, johanna);
    expect(pdf.statusCode).toBe(200);
    expect((await PDFDocument.load(pdf.rawPayload)).getPageCount()).toBe(1);
    expect((await req("GET", `/api/betreuungen/${akte.betreuungen[0].id}/formular/3.5.pdf`, undefined, johanna)).statusCode).toBe(404);
  });

  it("lässt andere Hebammen keine fremden Versände sehen", async () => {
    expect((await req("GET", `/api/abrechnung/versaende/${versandId}`, undefined, johanna)).statusCode).toBe(404);
  });
});
