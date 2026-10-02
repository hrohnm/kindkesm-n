import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anmelden, testAppStarten } from "./hilfen";

let t: Awaited<ReturnType<typeof testAppStarten>>;
let johanna: string;
let johannaId: string;

beforeAll(async () => {
  t = await testAppStarten();
  const j = await anmelden(t.app, "johanna@kindkesmoeoen.test");
  johanna = j.cookie;
  johannaId = j.daten.id;
});
afterAll(async () => t?.schliessen());

const req = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown, cookie = johanna) =>
  t.app.inject({ method, url, payload: payload as object, headers: { cookie } });

async function oleId() {
  const liste = (await req("GET", "/api/klientinnen?q=Krüger")).json();
  const akte = (await req("GET", `/api/klientinnen/${liste[0].id}`)).json();
  return akte.betreuungen[0].kinder[0].id as string;
}

describe("Kinderurkunde", () => {
  it("schlägt Text, Tabelle und Optionen vor", async () => {
    const r = (await req("GET", `/api/kinder/${await oleId()}/urkunde`)).json();
    expect(r.urkunde).toBeNull();
    expect(r.vorschlag.titel).toBe("Urkunde für Ole");
    expect(r.vorschlag.text).toContain("Ole");
    expect(r.vorschlag.text).toContain("Johanna");
    expect(r.vorschlag.zeilen[0]).toMatchObject({ lebenstag: 1, gewicht: 3480, laenge: 52, besonderes: "Geburt" });
    expect(r.vorschlag.zeilen.map((z: { gewicht: number }) => z.gewicht)).toEqual(expect.arrayContaining([3290, 3240, 3270]));
    expect(r.texte.length).toBeGreaterThanOrEqual(5);
    expect(r.vorschlag.optionen).toMatchObject({ kurve: true, kurveLaenge: true, kurveKopfumfang: true });
    expect(r.texte.find((x: { id: string }) => x.id === "platt").text).toContain("lütt Ole");
  });

  it("erzeugt eine PDF-Vorschau, speichert und liefert das PDF", async () => {
    const id = await oleId();
    const { vorschlag } = (await req("GET", `/api/kinder/${id}/urkunde`)).json();
    const u = { ...vorschlag, meilensteine: [{ datum: null, text: "Nabel abgefallen" }], optionen: { ...vorschlag.optionen, perzentilen: true } };
    for (const design of ["kindkesmoeoen", "ostsee", "leuchtturm", "schlicht"]) {
      const v = await req("POST", `/api/kinder/${id}/urkunde/vorschau.pdf`, { ...u, design });
      expect(v.statusCode).toBe(200);
      expect(v.headers["content-type"]).toBe("application/pdf");
      expect(v.rawPayload.subarray(0, 5).toString()).toBe("%PDF-");
    }
    expect((await req("GET", `/api/kinder/${id}/urkunde.pdf`)).statusCode).toBe(404);
    const s = await req("PUT", `/api/kinder/${id}/urkunde`, { ...u, status: "fertig" });
    expect(s.statusCode).toBe(200);
    expect(s.json().status).toBe("fertig");
    const r = (await req("GET", `/api/kinder/${id}/urkunde`)).json();
    expect(r.urkunde.meilensteine[0].text).toBe("Nabel abgefallen");
    const pdf = await req("GET", `/api/kinder/${id}/urkunde.pdf`);
    expect(pdf.statusCode).toBe(200);
    expect(pdf.headers["content-disposition"]).toContain("Urkunde-fuer-Ole.pdf");
  });

  it("prüft die Eingaben", async () => {
    const id = await oleId();
    expect((await req("PUT", `/api/kinder/${id}/urkunde`, { titel: "" })).statusCode).toBe(400);
    expect((await req("GET", "/api/kinder/00000000-0000-0000-0000-000000000000/urkunde")).statusCode).toBe(404);
  });

  it("erinnert 7 Tage vor Ende der 12. Lebenswoche", async () => {
    const liste = (await req("GET", "/api/klientinnen?q=Krüger")).json();
    const akte = (await req("GET", `/api/klientinnen/${liste[0].id}`)).json();
    const geburt = new Date();
    geburt.setDate(geburt.getDate() - 80);
    const iso = geburt.toISOString().slice(0, 10);
    const k = (await req("POST", `/api/betreuungen/${akte.betreuungen[0].id}/kinder`, { vorname: "Greta", geburtsdatum: iso, geburtsgewicht: 3100, laenge: "", kopfumfang: "" })).json();
    const h = (await req("GET", "/api/hinweise")).json();
    const eintrag = h.find((x: { id: string }) => x.id === `urkunde-${k.id}`);
    expect(eintrag).toMatchObject({ link: `/kinder/${k.id}/urkunde` });
    expect(eintrag.titel).toContain("Greta");
    expect(johannaId).toBeTruthy();
  });
});
