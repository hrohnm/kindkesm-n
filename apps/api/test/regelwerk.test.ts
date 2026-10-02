import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

const req = (method: "GET" | "POST" | "PUT", url: string, payload?: unknown, cookie = johanna) =>
  t.app.inject({ method, url, payload: payload as object, headers: { cookie } });
const RW = "hhv-2026-04-01";
const betrag = async (gpos: string) => (await req("GET", `/api/regelwerke/${RW}/positionen?q=${gpos}`)).json()[0].betrag;

describe("Vier-Augen-Freigabe", () => {
  let id: string;
  it("Johanna schlägt eine Preisänderung vor; sie wirkt noch nicht", async () => {
    const alt = await betrag("30101");
    const r = await req("POST", "/api/aenderungen", { regelwerkId: RW, titel: "Betrag 30101 korrigiert", begruendung: "Anlage 1.2, Test", operationen: [{ art: "position", gpos: "30101", felder: { betrag: 6.5 } }] });
    expect(r.statusCode).toBe(200);
    id = r.json().id;
    expect(r.json().vorher[0].betrag).toBe(Number(alt));
    expect(await betrag("30101")).toBe(alt);
  });

  it("Johanna kann nicht selbst freigeben", async () => {
    const r = await req("POST", `/api/aenderungen/${id}/freigeben`);
    expect(r.statusCode).toBe(403);
  });

  it("Marielena sieht den Hinweis und den Testrechner vorher/nachher", async () => {
    const h = (await req("GET", "/api/hinweise", undefined, marielena)).json();
    expect(h[0].titel).toMatch(/Betrag 30101 korrigiert/);
    const liste = (await req("GET", "/api/aenderungen?status=offen", undefined, marielena)).json();
    expect(liste[0]).toMatchObject({ darfFreigeben: true, von: "Johanna Mede" });
    expect(liste[0].zeilen[0]).toMatch(/→ 6,5/);
    const tr = (await req("POST", `/api/regelwerke/${RW}/testrechnung`, { datum: "2026-10-05", von: "10:00", bis: "10:45", typ: "wochenbett", art: 1, lebenstag: 5, aenderungId: id }, marielena)).json();
    expect(tr.vorher.zeilen[0].gpos).toBe("30101");
    expect(tr.nachher.zeilen[0].betrag).toBeCloseTo(9 * 6.5, 2);
  });

  it("Marielena gibt frei; der neue Betrag gilt", async () => {
    const r = await req("POST", `/api/aenderungen/${id}/freigeben`, undefined, marielena);
    expect(r.statusCode).toBe(200);
    expect(r.json().status).toBe("freigegeben");
    expect(await betrag("30101")).toBe("6.50");
    expect((await req("POST", `/api/aenderungen/${id}/freigeben`, undefined, marielena)).statusCode).toBe(409);
  });

  it("erkennt Konflikte, wenn sich der Wert inzwischen geändert hat", async () => {
    const a = (await req("POST", "/api/aenderungen", { regelwerkId: RW, titel: "Variante A", begruendung: "Test A", operationen: [{ art: "kontingent", id: "301", felder: { kontakte_pro_tag: 3 } }] })).json();
    const b = (await req("POST", "/api/aenderungen", { regelwerkId: RW, titel: "Variante B", begruendung: "Test B", operationen: [{ art: "kontingent", id: "301", felder: { kontakte_pro_tag: 4 } }] })).json();
    const fa = await req("POST", `/api/aenderungen/${a.id}/freigeben`, undefined, marielena);
    expect(fa.statusCode).toBe(200);
    const r = await req("POST", `/api/aenderungen/${b.id}/freigeben`, undefined, marielena);
    expect(r.statusCode).toBe(409);
    expect(r.json().fehler).toMatch(/inzwischen geändert/);
  });

  it("Ablehnen braucht eine Begründung, Zurückziehen nur die Vorschlagende", async () => {
    const a = (await req("POST", "/api/aenderungen", { regelwerkId: RW, titel: "Nachtzuschlag ab 22 Uhr", begruendung: "Test", operationen: [{ art: "zuschlaege", felder: { nacht_von: "22:00" } }] })).json();
    expect((await req("POST", `/api/aenderungen/${a.id}/ablehnen`, { kommentar: "" }, marielena)).statusCode).toBe(400);
    expect((await req("POST", `/api/aenderungen/${a.id}/zurueckziehen`, undefined, marielena)).statusCode).toBe(403);
    expect((await req("POST", `/api/aenderungen/${a.id}/ablehnen`, { kommentar: "Laut Vertrag 21 Uhr" }, marielena)).json().status).toBe("abgelehnt");
    const b = (await req("POST", "/api/aenderungen", { regelwerkId: RW, titel: "Wegegeldsatz", begruendung: "Test", operationen: [{ art: "wegegeld", felder: { satz_je_km: 1 } }] })).json();
    expect((await req("POST", `/api/aenderungen/${b.id}/zurueckziehen`)).json().status).toBe("zurueckgezogen");
  });

  it("Fachliche Freigabe der Fassung und neue Fassung", async () => {
    const f = (await req("POST", "/api/aenderungen", { regelwerkId: RW, titel: "Startbelegung geprüft", begruendung: "Mit dem Vertrag abgeglichen", operationen: [{ art: "status", status: "aktiv" }] })).json();
    await req("POST", `/api/aenderungen/${f.id}/freigeben`, undefined, marielena);
    const liste = (await req("GET", "/api/regelwerke")).json();
    expect(liste.find((r: { id: string }) => r.id === RW).status).toBe("aktiv");
    expect((await req("GET", "/api/hinweise")).json().some((h: { id: string }) => h.id === "regelwerk-entwurf")).toBe(false);

    const n = (await req("POST", "/api/aenderungen", { regelwerkId: RW, titel: "Fassung 2027", begruendung: "Neue Vergütung", operationen: [{ art: "neue_fassung", neueId: "hhv-2027-01-01", name: "HHV ab 01.01.2027", gueltigVon: "2027-01-01" }] })).json();
    expect((await req("POST", `/api/aenderungen/${n.id}/freigeben`, undefined, marielena)).statusCode).toBe(200);
    const neu = (await req("GET", "/api/regelwerke")).json().find((r: { id: string }) => r.id === "hhv-2027-01-01");
    expect(neu).toMatchObject({ status: "entwurf", gueltigVon: "2027-01-01" });
    expect(neu.anzahlPositionen).toBeGreaterThan(100);
    expect((await req("GET", `/api/regelwerke/hhv-2027-01-01/positionen?q=30101`)).json()[0].betrag).toBe("6.50");
  });

  it("Selbstzahler-Preise ändern und neue Leistung", async () => {
    const liste = (await req("GET", "/api/selbstzahler")).json();
    const s = liste[0];
    const ar = await req("POST", "/api/aenderungen", { titel: "Preis angepasst", begruendung: "Kalkulation 2027", operationen: [{ art: "selbstzahler", id: s.id, felder: { preis: 99 } }, { art: "selbstzahler_neu", id: "tragetuch-beratung", bezeichnung: "Trageberatung", rechnungstext: "Trageberatung zu Hause", einheit: "Kurs", preis: 80, umsatzsteuer: "regelsatz_19" }] });
    const a = ar.json();
    expect((await req("POST", `/api/aenderungen/${a.id}/freigeben`, undefined, marielena)).statusCode).toBe(200);
    const neu = (await req("GET", "/api/selbstzahler")).json();
    expect(neu.find((x: { id: string }) => x.id === s.id).preis).toBe("99.00");
    expect(neu.some((x: { id: string }) => x.id === "tragetuch-beratung")).toBe(true);
  });

  it("prüft unbekannte Positionen beim Vorschlagen", async () => {
    const r = await req("POST", "/api/aenderungen", { regelwerkId: RW, titel: "Falsch", begruendung: "Test", operationen: [{ art: "position", gpos: "99999", felder: { betrag: 1 } }] });
    expect(r.statusCode).toBe(400);
    expect(r.json().fehler).toMatch(/99999/);
  });
});

describe("Einschränkungen", () => {
  it("Hebammen in Babypause können nicht freigeben", async () => {
    const lorina = (await anmelden(t.app, "lorina@kindkesmoeoen.test")).cookie;
    const a = (await req("POST", "/api/aenderungen", { regelwerkId: RW, titel: "Babypause-Test", begruendung: "Test", operationen: [{ art: "frist", id: "zahlung", felder: { app: "Offene Posten markieren (Test)" } }] })).json();
    const r = await req("POST", `/api/aenderungen/${a.id}/freigeben`, undefined, lorina);
    expect(r.statusCode).toBe(403);
    expect(r.json().fehler).toMatch(/Babypause/);
    expect((await req("GET", "/api/aenderungen/offen/anzahl", undefined, lorina)).json()).toMatchObject({ anzahl: 0, aktiveHebammen: 2 });
  });
});

describe("Neu anlegen, CSV und eigene Preise", () => {
  it("neue Materialposition anlegen; danach im Besuch auswählbar", async () => {
    const a = (await req("POST", "/api/aenderungen", { regelwerkId: "hhv-2025-11-01", titel: "Neue Materialposition", begruendung: "Test", operationen: [{ art: "position_neu", position: { gpos: "69800", bezeichnung: "Material Test", kurztext: "Testmaterial", leistungsart: "keine Spezifikation", betrag: 3.5, einheit: "pauschal", formular: null, quittierungspflichtig: false, hinweis: null, material_fuer: ["wochenbett"], einmalig: false } }] })).json();
    expect((await req("POST", `/api/aenderungen/${a.id}/freigeben`, undefined, marielena)).statusCode).toBe(200);
    expect((await req("GET", "/api/regelwerke/hhv-2025-11-01/positionen?q=69800")).json()[0]).toMatchObject({ gpos: "69800", betrag: "3.50", kategorie: 6 });
    const m = (await req("GET", "/api/material?datum=2026-01-10&typ=wochenbett")).json();
    expect(m.map((x: { gpos: string }) => x.gpos)).toContain("69800");
    // doppelt anlegen geht nicht
    expect((await req("POST", "/api/aenderungen", { regelwerkId: "hhv-2025-11-01", titel: "Nochmal", begruendung: "Test", operationen: [{ art: "position_neu", position: { gpos: "69800", bezeichnung: "Material Test", kurztext: "x", leistungsart: "keine Spezifikation", betrag: 1, einheit: "pauschal", formular: null, quittierungspflichtig: false, hinweis: null } }] })).statusCode).toBe(400);
  });

  it("neues Kontingent anlegen", async () => {
    const a = (await req("POST", "/api/aenderungen", { regelwerkId: "hhv-2025-11-01", titel: "Kontingent 698", begruendung: "Test", operationen: [{ art: "kontingent_neu", kontingent: { id: "698", name: "Testkontingent", positionen: ["69800"], verhalten_bei_ueberschreitung: "hinweis", kontakte_gesamt: 3 } }] })).json();
    expect((await req("POST", `/api/aenderungen/${a.id}/freigeben`, undefined, marielena)).statusCode).toBe(200);
    const d = (await req("GET", "/api/regelwerke/hhv-2025-11-01")).json();
    expect(d.daten.kontingente.find((k: { id: string }) => k.id === "698")).toMatchObject({ kontakte_gesamt: 3 });
  });

  it("CSV-Export und Import als Vorschlag", async () => {
    const csv = await req("GET", `/api/regelwerke/${RW}/positionen.csv`);
    expect(csv.headers["content-type"]).toMatch(/text\/csv/);
    expect(csv.body.split("\n")[0]).toMatch(/^﻿?GPOS;Gruppe;Bezeichnung/);
    const geaendert = csv.body.replace(/^(10201;[^\n]*?;)(\d+,\d{2})(;5min)/m, "$19,99$3");
    const v = (await req("POST", `/api/regelwerke/${RW}/import`, { csv: geaendert })).json();
    expect(v.operationen).toEqual([{ art: "position", gpos: "10201", felder: { betrag: 9.99 } }]);
    expect(v.unveraendert).toBeGreaterThan(100);
    const sz = await req("GET", "/api/selbstzahler.csv");
    expect(sz.body).toMatch(/Kennung;Bezeichnung/);
  });

  it("eigener Selbstzahler-Preis je Hebamme (mit Freigabe)", async () => {
    const liste = (await req("GET", "/api/selbstzahler")).json();
    const s = liste.find((x: { id: string }) => x.id === "akupunktur");
    const a = (await req("POST", "/api/aenderungen", { titel: "Mein Akupunkturpreis", begruendung: "Eigene Kalkulation", operationen: [{ art: "selbstzahler_eigen", id: "akupunktur", hebammeId: "00000000-0000-0000-0000-000000000000", preis: 55 }] })).json();
    expect(a.operationen[0].hebammeId).not.toBe("00000000-0000-0000-0000-000000000000");
    expect((await req("POST", `/api/aenderungen/${a.id}/freigeben`, undefined, marielena)).statusCode).toBe(200);
    const j = (await req("GET", "/api/selbstzahler")).json().find((x: { id: string }) => x.id === "akupunktur");
    expect(j.meinPreis).toBe("55.00");
    expect(j.preis).toBe(s.preis);
    expect(j.eigenePreise[0]).toMatchObject({ kuerzel: "JM", preis: "55.00" });
    const m = (await req("GET", "/api/selbstzahler", undefined, marielena)).json().find((x: { id: string }) => x.id === "akupunktur");
    expect(m.meinPreis).toBeNull();
  });
});
