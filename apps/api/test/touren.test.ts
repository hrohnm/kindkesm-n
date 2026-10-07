import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { strasseNormieren, strasseZerlegen, anschriftZerlegen } from "../src/geo/adressen";
import { anmelden, testAppStarten } from "./hilfen";

let t: Awaited<ReturnType<typeof testAppStarten>>;
let johanna: string;
let marielena: string;

beforeAll(async () => {
  t = await testAppStarten();
  johanna = (await anmelden(t.app, "johanna@kindkesmoeoen.test")).cookie;
  marielena = (await anmelden(t.app, "marielena@kindkesmoeoen.test")).cookie;
});
afterAll(async () => t?.schliessen());

const req = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown, cookie = johanna) =>
  t.app.inject({ method, url, payload: payload as object, headers: { cookie } });

const tag = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const heute = tag(0);

async function betreuungVon(nachname: string, cookie = johanna) {
  const liste = (await req("GET", `/api/klientinnen?q=${encodeURIComponent(nachname)}`, undefined, cookie)).json();
  return liste[0].betreuung.id as string;
}

describe("Adressverzeichnis", () => {
  it("vereinheitlicht Straßen und zerlegt Anschriften", () => {
    expect(strasseNormieren("Mollistraße")).toBe(strasseNormieren("Molli-Str."));
    expect(strasseZerlegen("Dammchaussee 12 a")).toEqual({ strasse: "Dammchaussee", hausnummer: "12a" });
    expect(anschriftZerlegen("Am Markt 3, 18236 Kröpelin")).toEqual({ strasse: "Am Markt 3", plz: "18236", ort: "Kröpelin" });
  });

  it("verortet neue Klientinnen über das Adressverzeichnis", async () => {
    const ich = (await req("GET", "/api/auth/ich")).json();
    const k = (await req("POST", "/api/klientinnen", { vorname: "Ida", nachname: "Neu", strasse: "Lindenweg 8", plz: "18209", ort: "Bad Doberan", zustaendigeHebammeId: ich.id, et: tag(60) })).json();
    const akte = (await req("GET", `/api/klientinnen/${k.id}`)).json();
    expect(akte).toMatchObject({ geoQuelle: "adresse" });
    expect(akte.lat).toBeCloseTo(54.0986, 3);
    // Unbekannte Hausnummer → Mitte der Straße
    const u = (await req("PUT", `/api/klientinnen/${k.id}`, { ...akte, strasse: "Lindenweg 99", betreuungen: undefined, id: undefined })).json();
    expect(u.geoQuelle).toBe("strasse");
    // Von Hand gesetzt
    const m = (await req("PUT", `/api/klientinnen/${k.id}/position`, { lat: 54.1, lon: 11.9 })).json();
    expect(m).toMatchObject({ geoQuelle: "manuell", lat: 54.1, lon: 11.9 });
  });
});

describe("Tagestour", () => {
  it("zeigt die Demo-Tour von heute mit geplanter Reihenfolge", async () => {
    const d = (await req("GET", `/api/touren/${heute}`)).json();
    expect(d.tour).not.toBeNull();
    expect(d.termine).toHaveLength(2);
    expect(d.termine[0]).toMatchObject({ zeit: "fix", uhrzeit: "09:00", ankunft: "09:00", reihenfolge: 1 });
    expect(d.termine[0].klientin.name).toBe("Lena Krüger");
    expect(d.tour.meter).toBeGreaterThan(10_000);
    expect(d.tour.geometrie.length).toBeGreaterThan(2);
  });

  it("plant einen weiteren Tag mit festen und flexiblen Terminen", async () => {
    const datum = tag(7);
    const krueger = await betreuungVon("Krüger");
    const berger = await betreuungVon("Berger");
    const a = await req("POST", `/api/touren/${datum}/termine`, { betreuungId: berger, zeit: "fix", uhrzeit: "13:00", dauerMin: 40, typ: "vorsorge" });
    expect(a.statusCode).toBe(200);
    const b = await req("POST", `/api/touren/${datum}/termine`, { betreuungId: krueger, zeit: "vormittags", dauerMin: 45, typ: "wochenbett" });
    expect(b.statusCode).toBe(200);
    const p = (await req("POST", `/api/touren/${datum}/planen`, { modus: "optimieren" })).json();
    expect(p.ok).toBe(true);
    expect(p.quelle).toBe("luftlinie");
    const d = (await req("GET", `/api/touren/${datum}`)).json();
    expect(d.termine.map((x: { klientin: { name: string } }) => x.klientin.name)).toEqual(["Lena Krüger", "Sophie Berger"]);
    expect(d.termine[1].ankunft).toBe("13:00");
    // Manuelle Reihenfolge wird übernommen und meldet die Verspätung
    const r = (await req("POST", `/api/touren/${datum}/planen`, { modus: "reihenfolge", reihenfolge: [a.json().id, b.json().id] })).json();
    expect(r.hinweise.join(" ")).toMatch(/Ziel „Schule der Tochter“|Krüger/);
    expect((await req("POST", `/api/touren/${datum}/bestaetigen`)).json().status).toBe("bestaetigt");
  });

  it("verweigert Termine bei fehlender Uhrzeit und fremden Zugriff", async () => {
    const krueger = await betreuungVon("Krüger");
    const r = await req("POST", `/api/touren/${heute}/termine`, { betreuungId: krueger, zeit: "fix", dauerMin: 45, typ: "wochenbett" });
    expect(r.statusCode).toBe(400);
    const d = (await req("GET", `/api/touren/${heute}`)).json();
    expect((await req("DELETE", `/api/termine/${d.termine[1].id}`, undefined, marielena)).statusCode).toBe(404);
  });

  it("schlägt Wochenbett-Familien vor, die noch nicht eingeplant sind", async () => {
    const d = (await req("GET", `/api/touren/${tag(1)}`)).json();
    expect(d.vorschlaege.map((v: { name: string }) => v.name)).toContain("Lena Krüger");
  });
});

describe("Wegegeld", () => {
  it("berechnet Wegegeld für abgeschlossene Hausbesuche (Hin- und Rückweg)", async () => {
    const w = (await req("GET", `/api/wegegeld/${tag(-2)}`)).json();
    expect(w.zeilen).toHaveLength(1);
    expect(w.zeilen[0]).toMatchObject({ gpos: "50100", name: "Lena Krüger" });
    expect(w.zeilen[0].km).toBeGreaterThan(15);
    expect(w.hinweise.some((h: { text: string }) => /geschätzt/.test(h.text))).toBe(true);
  });

  it("teilt die Strecke bei mehreren Familien an einem Tag (50200 mit Anzahl)", async () => {
    const datum = tag(-1);
    const berger = await betreuungVon("Berger");
    const res = await req("POST", `/api/betreuungen/${berger}/besuche`, {
      datum,
      von: "14:00",
      bis: "14:40",
      typ: "vorsorge",
      art: 1,
      material: [],
      dokumentation: { mutter: {}, kinder: {}, notiz: null },
      unterschrift: { art: "papier", zeitpunkt: new Date().toISOString() },
      abschliessen: true,
    });
    expect(res.statusCode).toBe(200);
    const w = (await req("GET", `/api/wegegeld/${datum}`)).json();
    expect(w.zeilen.map((z: { gpos: string }) => z.gpos)).toEqual(["50200", "50200"]);
    expect(w.zeilen[0].txt).toBe("Anzahl Versicherte: 2");
    expect(w.zeilen[0].km).toBe(w.zeilen[1].km);
    // Getrennte Wege: jeder Besuch einzeln
    const g = (await req("PUT", `/api/wegegeld/${datum}`, { getrennteWege: true })).json();
    expect(g.zeilen.map((z: { gpos: string }) => z.gpos)).toEqual(["50100", "50100"]);
    // Kilometer von Hand
    const m = (await req("PUT", `/api/wegegeld/${datum}`, { getrennteWege: false, manuellKm: 30 })).json();
    expect(m.quelle).toBe("manuell");
    expect(m.zeilen.map((z: { km: number }) => z.km)).toEqual([15, 15]);
  });

  it("läuft in den Versand und ist danach gesperrt", async () => {
    const v = (await req("POST", "/api/abrechnung/versaende", { bis: tag(-2), trotzdem: true })).json();
    const d = (await req("GET", `/api/abrechnung/versaende/${v.versand.id}`)).json();
    const gpos = JSON.stringify(d);
    expect(gpos).toContain("50100");
    const w = (await req("GET", `/api/wegegeld/${tag(-2)}`)).json();
    expect(w.gesperrt).toBe(true);
    expect((await req("PUT", `/api/wegegeld/${tag(-2)}`, { manuellKm: 5 })).statusCode).toBe(409);
    const mappe = await req("GET", `/api/abrechnung/versaende/${v.versand.id}/mappe.pdf`);
    expect(mappe.statusCode).toBe(200);
    await req("POST", `/api/abrechnung/versaende/${v.versand.id}/aufloesen`);
  });
});

describe("Fahrtenbuch", () => {
  it("erzeugt den Tageseintrag aus der Tour und trennt die Fahrt zur Schule als privat ab", async () => {
    const f = (await req("POST", `/api/fahrtenbuch/aus-tag/${heute}`)).json();
    expect(f.zweck).toBe("Hausbesuche (2)");
    // Johannas Tourvorlagen (Demo): mittwochs „Praxistag“ Praxis → Kita, sonst „Schultag“ Zuhause → Schule
    const mittwoch = new Date(`${heute}T12:00:00`).getDay() === 3;
    expect(f.strecke).toMatch(mittwoch ? /^Praxis – 18209 Bad Doberan – 18236 Kröpelin – Kita$/ : /^Zuhause – 18209 Bad Doberan – 18236 Kröpelin – Schule der Tochter$/);
    expect(f.kmDienstlich).toBeGreaterThan(0);
    expect(f.kmPrivat).toBeGreaterThan(0);
    expect(f.strecke).not.toMatch(/Krüger|Berger/);
    // Kilometerstand nachtragen
    const u = await req("PUT", `/api/fahrtenbuch/${f.id}`, { ...f, kmStandBeginn: 12000, kmStandEnde: 12000 + Math.round(f.kmDienstlich + f.kmPrivat) });
    expect(u.statusCode).toBe(200);
  });

  it("listet Fahrten mit Privat-Lücken und exportiert CSV und PDF", async () => {
    const manuell = await req("POST", "/api/fahrtenbuch", { datum: tag(1), kmStandBeginn: 12100, kmStandEnde: 12130, strecke: "Zuhause – Praxis – Zuhause", zweck: "Praxistag", kmDienstlich: 0, kmWohnungBetrieb: 30, kmPrivat: 0 });
    expect(manuell.statusCode).toBe(200);
    const l = (await req("GET", `/api/fahrtenbuch?von=${tag(-5)}&bis=${tag(5)}`)).json();
    expect(l.eintraege).toHaveLength(2);
    expect(l.eintraege[1].privatLuecke).toBeGreaterThan(0);
    expect(l.summen.wohnungBetrieb).toBe(30);
    const csv = await req("GET", `/api/fahrtenbuch/export.csv?von=${tag(-5)}&bis=${tag(5)}`);
    expect(csv.headers["content-type"]).toMatch(/text\/csv/);
    expect(csv.body).toContain("Praxistag");
    const pdf = await req("GET", `/api/fahrtenbuch/export.pdf?von=${tag(-5)}&bis=${tag(5)}`);
    expect(pdf.headers["content-type"]).toBe("application/pdf");
    expect(pdf.rawPayload.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("prüft den Kilometerstand", async () => {
    const r = await req("POST", "/api/fahrtenbuch", { datum: heute, kmStandBeginn: 500, kmStandEnde: 400, strecke: "x", zweck: "y", kmDienstlich: 0 });
    expect(r.statusCode).toBe(400);
  });
});
