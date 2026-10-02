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

const req = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown, cookie = johanna) =>
  t.app.inject({ method, url, payload: payload as object, headers: { cookie } });

const heute = new Date().toISOString().slice(0, 10);
const besuchDaten = (extra: Record<string, unknown> = {}) => ({
  datum: heute,
  von: "15:00",
  bis: "15:40",
  typ: "wochenbett",
  art: 1,
  material: [],
  dokumentation: { mutter: { temperatur: "36,8", lochien: "fusca" }, kinder: {}, notiz: "Alles gut" },
  unterschrift: { art: "keine" },
  abschliessen: false,
  ...extra,
});

async function kruegerBetreuung() {
  const liste = (await req("GET", "/api/klientinnen?q=Krüger")).json();
  const akte = (await req("GET", `/api/klientinnen/${liste[0].id}`)).json();
  return akte.betreuungen[0];
}

describe("Klientinnen", () => {
  it("listet die Demo-Familien mit Lebenstag bzw. SSW", async () => {
    const alle = (await req("GET", "/api/klientinnen?nur=alle")).json();
    expect(alle).toHaveLength(4);
    const krueger = alle.find((k: { nachname: string }) => k.nachname === "Krüger");
    expect(krueger.betreuung).toMatchObject({ status: "wochenbett", lebenstag: 6, kinder: ["Ole"] });
    const berger = alle.find((k: { nachname: string }) => k.nachname === "Berger");
    expect(berger.betreuung.ssw).toMatch(/^33\+\d$/);
  });
  it("filtert auf die eigenen Klientinnen", async () => {
    expect((await req("GET", "/api/klientinnen?nur=meine")).json()).toHaveLength(2);
  });
  it("prüft die Versichertennummer", async () => {
    const res = await req("POST", "/api/klientinnen", { vorname: "Test", nachname: "Person", versichertennummer: "123", zustaendigeHebammeId: johannaId, et: "" });
    expect(res.statusCode).toBe(400);
    expect(res.json().felder.versichertennummer).toBeDefined();
  });
  it("legt eine Klientin mit Betreuung an und setzt beim Kind das Wochenbett", async () => {
    const k = (await req("POST", "/api/klientinnen", { vorname: "Test", nachname: "Neu", versichertennummer: "t123456789", zustaendigeHebammeId: johannaId, et: heute })).json();
    expect(k.versichertennummer).toBe("T123456789");
    const akte = (await req("GET", `/api/klientinnen/${k.id}`)).json();
    expect(akte.betreuungen[0].status).toBe("schwangerschaft");
    const kind = await req("POST", `/api/betreuungen/${akte.betreuungen[0].id}/kinder`, { vorname: "Mia", geburtsdatum: heute, geburtsgewicht: 3200, laenge: "51", kopfumfang: "" });
    expect(kind.statusCode).toBe(200);
    const nachher = (await req("GET", `/api/klientinnen/${k.id}`)).json();
    expect(nachher.betreuungen[0].status).toBe("wochenbett");
  });
});

describe("Besuche", () => {
  it("berechnet eine Vorschau", async () => {
    const b = await kruegerBetreuung();
    const res = await req("POST", `/api/betreuungen/${b.id}/besuche/vorschau`, besuchDaten());
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ stamm: "301", lebenstag: 6, einheitenAbrechenbar: 8 });
  });
  it("lässt das Abschließen ohne Unterschrift nicht zu", async () => {
    const b = await kruegerBetreuung();
    const res = await req("POST", `/api/betreuungen/${b.id}/besuche`, besuchDaten({ abschliessen: true }));
    expect(res.statusCode).toBe(400);
    expect(res.json().fehler).toContain("Unterschrift");
  });
  let besuchId: string;
  it("speichert mit Tablet-Unterschrift, erzeugt Leistungen und versioniert Änderungen", async () => {
    const b = await kruegerBetreuung();
    const unterschrift = { art: "tablet", zeitpunkt: new Date().toISOString(), bild: "data:image/png;base64,iVBORw0KGgo=", name: "Lena Krüger" };
    const res = await req("POST", `/api/betreuungen/${b.id}/besuche`, besuchDaten({ unterschrift, abschliessen: true }));
    expect(res.statusCode).toBe(200);
    besuchId = res.json().besuch.id;
    const detail = (await req("GET", `/api/besuche/${besuchId}`)).json();
    expect(detail.status).toBe("abgeschlossen");
    expect(detail.leistungen.map((l: { gpos: string }) => l.gpos)).toContain("30101");
    expect(detail.dokumentation.mutter.temperatur).toBe(36.8);

    const geaendert = await req("PUT", `/api/besuche/${besuchId}`, besuchDaten({ bis: "15:50", unterschrift, abschliessen: true }));
    expect(geaendert.statusCode).toBe(200);
    const neu = (await req("GET", `/api/besuche/${besuchId}`)).json();
    // 50 Minuten, aber heute schon 45 Minuten (Entwurf am Vormittag): Tageshöchstgrenze 90 Minuten
    expect(neu.einheiten).toBe(10);
    expect(neu.einheitenAbrechenbar).toBe(9);
    expect(neu.hinweise.some((h: { text: string }) => h.text.includes("heute bereits 45 Min."))).toBe(true);
    expect(neu.versionen).toHaveLength(1);
  });
  it("erlaubt Änderungen nur der Hebamme, die den Besuch erbracht hat", async () => {
    expect((await req("PUT", `/api/besuche/${besuchId}`, besuchDaten(), marielena)).statusCode).toBe(403);
  });
  it("löscht abgeschlossene Besuche nicht, Entwürfe schon", async () => {
    expect((await req("DELETE", `/api/besuche/${besuchId}`)).statusCode).toBe(409);
    const b = await kruegerBetreuung();
    const entwurf = (await req("POST", `/api/betreuungen/${b.id}/besuche`, besuchDaten({ datum: heute, von: "20:00", bis: "20:30", typ: "wochenbett", art: 2 }))).json();
    expect(entwurf.ergebnis.hinweise.some((h: { stufe: string }) => h.stufe === "fehler")).toBe(true); // dritter Kontakt am Tag
    expect((await req("DELETE", `/api/besuche/${entwurf.besuch.id}`)).statusCode).toBe(200);
  });
  it("zeigt das Kontingent der Betreuung", async () => {
    const b = await kruegerBetreuung();
    const k = (await req("GET", `/api/betreuungen/${b.id}/kontingente`)).json();
    expect(k.find((x: { id: string }) => x.id === "301")).toMatchObject({ genutzt: 5, maximum: 20 });
  });
  it("liefert die Besuche von heute und offene Entwürfe fürs Cockpit", async () => {
    const h = (await req("GET", "/api/heute")).json();
    expect(h.heute.length).toBeGreaterThanOrEqual(2);
    expect(h.entwuerfe.some((e: { name: string }) => e.name === "Lena Krüger")).toBe(true);
  });
});

describe("Persönliche Ansicht der Dokumentation", () => {
  it("liefert Standardwerte und speichert je Hebamme", async () => {
    const a = (await req("GET", "/api/ich/ansicht")).json();
    expect(a.mutter.rrSys).toEqual({ sichtbar: true, vergleich: true });
    expect(a.mutterOffen).toBe(false);
    const neu = { ...a, mutter: { ...a.mutter, puls: { sichtbar: false, vergleich: false } }, kindOffen: true };
    const r = (await req("PUT", "/api/ich/ansicht", neu)).json();
    expect(r.mutter.puls).toEqual({ sichtbar: false, vergleich: false });
    expect((await req("GET", "/api/ich/ansicht")).json().kindOffen).toBe(true);
    // andere Hebamme unverändert
    expect((await req("GET", "/api/ich/ansicht", undefined, marielena)).json().kindOffen).toBe(false);
  });
  it("prüft die Eingaben", async () => {
    expect((await req("PUT", "/api/ich/ansicht", { mutter: { puls: { sichtbar: "ja" } } })).statusCode).toBe(400);
  });
});

describe("Gewichtsverlauf", () => {
  it("listet Geburtsgewicht-Grundlage und alle dokumentierten Gewichte", async () => {
    const b = await kruegerBetreuung();
    const kindId = b.kinder[0].id;
    const r = (await req("GET", `/api/kinder/${kindId}/gewicht`)).json();
    expect(r.kind).toMatchObject({ vorname: "Ole", geburtsgewicht: 3480 });
    expect(r.werte.map((w: { gramm: number }) => w.gramm)).toEqual(expect.arrayContaining([3290, 3240, 3270, 3310]));
    expect(r.werte.find((w: { gramm: number }) => w.gramm === 3310).status).toBe("entwurf");
    // Länge und Kopfumfang aus der Dokumentation (Komma als Dezimaltrenner)
    await req("POST", `/api/betreuungen/${b.id}/besuche`, besuchDaten({ datum: "2026-08-20", von: "08:00", bis: "08:30", dokumentation: { mutter: {}, kinder: { [kindId]: { laenge: "53,5", kopfumfang: "36" } }, notiz: "" } }));
    const r2 = (await req("GET", `/api/kinder/${kindId}/gewicht`)).json();
    expect(r2.laenge.map((w: { wert: number }) => w.wert)).toContain(53.5);
    expect(r2.kopfumfang.map((w: { wert: number }) => w.wert)).toContain(36);
    expect((await req("GET", "/api/kinder/00000000-0000-0000-0000-000000000000/gewicht")).statusCode).toBe(404);
  });
});

describe("Offline-Abgleich", () => {
  it("legt einen offline erfassten Besuch bei wiederholter Übertragung nur einmal an", async () => {
    const b = await kruegerBetreuung();
    const id = "7b0f7e2c-3a8e-4f51-9b0a-0c2d4e6f8a10";
    const daten = besuchDaten({ id, datum: "2026-09-01", von: "08:00", bis: "08:30", dokumentation: { mutter: {}, kinder: {}, notiz: "offline" } });
    const r1 = await req("POST", `/api/betreuungen/${b.id}/besuche`, daten);
    expect(r1.statusCode).toBe(200);
    expect(r1.json().besuch.id).toBe(id);
    const r2 = await req("POST", `/api/betreuungen/${b.id}/besuche`, { ...daten, dokumentation: { mutter: {}, kinder: {}, notiz: "offline, zweite Übertragung" } });
    expect(r2.statusCode).toBe(200);
    const liste = (await req("GET", `/api/betreuungen/${b.id}/besuche`)).json();
    expect(liste.filter((x: { id: string }) => x.id === id)).toHaveLength(1);
    expect((await req("GET", `/api/besuche/${id}`)).json().dokumentation.notiz).toBe("offline, zweite Übertragung");
    // fremde Hebamme darf die Kennung nicht kapern
    expect((await req("POST", `/api/betreuungen/${b.id}/besuche`, daten, marielena)).statusCode).toBe(409);
  });

  it("erkennt Konflikte zwischen zwei Geräten über den Stand", async () => {
    const b = await kruegerBetreuung();
    const neu = (await req("POST", `/api/betreuungen/${b.id}/besuche`, besuchDaten({ datum: "2026-09-02", von: "08:00", bis: "08:30" }))).json().besuch;
    // Gerät A speichert mit aktuellem Stand
    const a = await req("PUT", `/api/besuche/${neu.id}`, besuchDaten({ datum: "2026-09-02", von: "08:00", bis: "08:35", stand: neu.geaendertAm }));
    expect(a.statusCode).toBe(200);
    // Gerät B hat noch den alten Stand
    const k = await req("PUT", `/api/besuche/${neu.id}`, besuchDaten({ datum: "2026-09-02", von: "08:00", bis: "08:40", stand: neu.geaendertAm }));
    expect(k.statusCode).toBe(409);
    expect(k.json()).toMatchObject({ konflikt: true, aktuell: { bis: "08:35" } });
    // ohne Stand (bewusst überschreiben) geht es
    expect((await req("PUT", `/api/besuche/${neu.id}`, besuchDaten({ datum: "2026-09-02", von: "08:00", bis: "08:40" }))).statusCode).toBe(200);
  });

  it("liefert den Abrechnungskontext für die Vorschau auf dem Gerät", async () => {
    const b = await kruegerBetreuung();
    const k = (await req("GET", `/api/betreuungen/${b.id}/abrechnungskontext`)).json();
    expect(k.geburtsdatum).toBe(b.kinder[0].geburtsdatum);
    expect(k.anzahlKinder).toBe(Math.max(1, b.kinder.length));
    expect(k.fruehereBesuche.length).toBeGreaterThan(0);
    expect(k.fruehereBesuche[0]).toHaveProperty("stamm");
  });

  it("liefert das am Datum gültige Regelwerk vollständig", async () => {
    const rw = (await req("GET", "/api/regelwerk-fuer?datum=2026-10-01")).json();
    expect(rw.id).toBe("hhv-2026-04-01");
    expect(rw.positionen.length).toBeGreaterThan(100);
    expect((await req("GET", "/api/regelwerk-fuer?datum=2026-01-10")).json().id).toBe("hhv-2025-11-01");
  });
});
