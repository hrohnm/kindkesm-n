import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anmelden, testAppStarten } from "./hilfen";

let t: Awaited<ReturnType<typeof testAppStarten>>;
let cookie: string;

beforeAll(async () => {
  t = await testAppStarten();
  cookie = (await anmelden(t.app, "johanna@kindkesmoeoen.test")).cookie;
});
afterAll(async () => t?.schliessen());

const get = (url: string, c = cookie) => t.app.inject({ method: "GET", url, headers: { cookie: c } });
const send = (method: "POST" | "PUT" | "DELETE", url: string, payload?: unknown, c = cookie) =>
  t.app.inject({ method, url, payload: payload as object, headers: { cookie: c } });

describe("Anmeldung", () => {
  it("lehnt Zugriffe ohne Anmeldung ab", async () => {
    expect((await t.app.inject({ method: "GET", url: "/api/team" })).statusCode).toBe(401);
  });
  it("lehnt ein falsches Passwort ab", async () => {
    const res = await t.app.inject({ method: "POST", url: "/api/auth/anmelden", payload: { email: "johanna@kindkesmoeoen.test", passwort: "falsch" } });
    expect(res.statusCode).toBe(401);
  });
  it("setzt ein httpOnly-Cookie mit SameSite=Strict", async () => {
    const res = await t.app.inject({ method: "POST", url: "/api/auth/anmelden", payload: { email: "JOHANNA@kindkesmoeoen.test", passwort: "kindkes-demo-2026" } });
    expect(res.statusCode).toBe(200);
    const c = res.cookies.find((x) => x.name === "kk_sitzung")!;
    expect(c.httpOnly).toBe(true);
    expect(c.sameSite).toBe("Strict");
  });
  it("beendet die Sitzung beim Abmelden", async () => {
    const { cookie: c } = await anmelden(t.app, "marielena@kindkesmoeoen.test");
    expect((await get("/api/auth/ich", c)).statusCode).toBe(200);
    await send("POST", "/api/auth/abmelden", undefined, c);
    expect((await get("/api/auth/ich", c)).statusCode).toBe(401);
  });
});

describe("Team und Profil", () => {
  it("listet drei Hebammen ohne Passwort-Hashes", async () => {
    const res = await get("/api/team");
    const team = res.json();
    expect(team).toHaveLength(3);
    expect(JSON.stringify(team)).not.toContain("argon2");
    expect(team.find((h: { name: string }) => h.name === "Lorina Gosemann")).toMatchObject({ status: "babypause", babypauseBis: "2027-03-01" });
  });
  it("prüft das IK-Format", async () => {
    const res = await send("PUT", "/api/ich/profil", { name: "Johanna Mede", kuerzel: "JM", telefon: "", ik: "123", status: "aktiv", babypauseBis: "" });
    expect(res.statusCode).toBe(400);
    expect(res.json().felder.ik).toContain("45");
  });
  it("speichert das Profil und weist bei IK-Änderung auf die Meldepflicht hin", async () => {
    const res = await send("PUT", "/api/ich/profil", { name: "Johanna Mede", kuerzel: "jm", telefon: "0157 1", ik: "459900099", status: "aktiv", babypauseBis: "2027-01-01" });
    expect(res.statusCode).toBe(200);
    expect(res.json().hinweis).toContain("SVI");
    const profil = (await get("/api/ich/profil")).json();
    expect(profil).toMatchObject({ kuerzel: "JM", ik: "459900099", babypauseBis: null });
  });
});

describe("Orte und Tourvorlagen", () => {
  it("liefert eigene Orte plus Praxisstandort", async () => {
    const orte = (await get("/api/ich/orte")).json();
    expect(orte.map((o: { typ: string }) => o.typ).sort()).toEqual(["kita", "praxis", "privat", "schule"]);
  });
  it("verhindert das Löschen eines Orts, der in einer Tourvorlage steckt", async () => {
    const orte = (await get("/api/ich/orte")).json();
    const schule = orte.find((o: { typ: string }) => o.typ === "schule");
    const res = await send("DELETE", `/api/ich/orte/${schule.id}`);
    expect(res.statusCode).toBe(409);
    expect(res.json().fehler).toContain("Schultag");
  });
  it("legt einen Ort an, nutzt ihn in einer Tourvorlage und löscht beides", async () => {
    const neu = (await send("POST", "/api/ich/orte", { bezeichnung: "Oma", typ: "sonstiges", anschrift: "Dorfstraße 1, 18225 Kühlungsborn", abholzeit: "" })).json();
    const orte = (await get("/api/ich/orte")).json();
    const privat = orte.find((o: { typ: string }) => o.typ === "privat");
    const tv = await send("POST", "/api/ich/tourvorlagen", { name: "Freitag zur Oma", wochentage: [5], startOrtId: privat.id, endeOrtId: neu.id, endeSpaetestens: "17:00", wegegeldAusgangsOrtId: privat.id });
    expect(tv.statusCode).toBe(200);
    expect((await send("DELETE", `/api/ich/tourvorlagen/${tv.json().id}`)).statusCode).toBe(200);
    expect((await send("DELETE", `/api/ich/orte/${neu.id}`)).statusCode).toBe(200);
  });
  it("erlaubt keine fremden Orte in Tourvorlagen", async () => {
    const { cookie: c } = await anmelden(t.app, "marielena@kindkesmoeoen.test");
    const fremd = (await get("/api/ich/orte", c)).json().find((o: { typ: string }) => o.typ === "privat");
    const eigen = (await get("/api/ich/orte")).json().find((o: { typ: string }) => o.typ === "privat");
    const res = await send("POST", "/api/ich/tourvorlagen", { name: "X", wochentage: [1], startOrtId: eigen.id, endeOrtId: fremd.id, endeSpaetestens: "", wegegeldAusgangsOrtId: eigen.id });
    expect(res.statusCode).toBe(400);
  });
});

describe("Abrechnungseinstellungen", () => {
  it("setzt bei HebSet automatisch die Anschrift", async () => {
    const res = await send("PUT", "/api/ich/abrechnung", { weg: "hebset", abrechnungsstelleName: null, abrechnungsstelleAnschrift: null, belegart: "durchschreibesatz", unterschrift: "tablet", versandRhythmus: "zweimonatlich", versandTag: 5, erinnerungVorlaufTage: 3 });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ abrechnungsstelleName: "hebset KG", versandRhythmus: "zweimonatlich" });
  });
  it("lässt nur vertragskonforme Rhythmen zu", async () => {
    const res = await send("PUT", "/api/ich/abrechnung", { weg: "hebset", abrechnungsstelleName: null, abrechnungsstelleAnschrift: null, belegart: "durchschreibesatz", unterschrift: "tablet", versandRhythmus: "woechentlich", versandTag: 5, erinnerungVorlaufTage: 3 });
    expect(res.statusCode).toBe(400);
  });
});

describe("Regelwerk und Hinweise", () => {
  it("enthält beide Vertragsfassungen", async () => {
    const liste = (await get("/api/regelwerke")).json();
    expect(liste.map((r: { id: string; anzahlPositionen: number }) => [r.id, r.anzahlPositionen])).toEqual([["hhv-2025-11-01", 125], ["hhv-2026-04-01", 129]]);
  });
  it("filtert Positionen und kennt die neuen befristeten Positionen", async () => {
    const pos = (await get("/api/regelwerke/hhv-2026-04-01/positionen?q=109")).json();
    expect(pos[0]).toMatchObject({ gpos: "10905", betrag: "4.95", befristetBis: "2027-12-31" });
    const tel = (await get("/api/regelwerke/hhv-2026-04-01/positionen?q=30104")).json();
    expect(tel[0].quittierungspflichtig).toBe(false);
  });
  it("liefert Fristen und Selbstzahler-Preise", async () => {
    const r = (await get("/api/regelwerke/hhv-2026-04-01")).json();
    expect(r.daten.fristen_und_hinweise.length).toBeGreaterThan(10);
    expect((await get("/api/selbstzahler")).json()).toHaveLength(8);
  });
  it("meldet im Juni die Ausschlussfrist und den Versandtermin", async () => {
    const h = (await get("/api/hinweise?heute=2026-06-20")).json();
    expect(h.map((x: { id: string }) => x.id)).toEqual(expect.arrayContaining(["ausschlussfrist", "versand", "regelwerk-entwurf"]));
  });
  it("kündigt die Rückkehr aus der Babypause an", async () => {
    const h = (await get("/api/hinweise?heute=2027-01-15")).json();
    expect(h.some((x: { id: string }) => x.id.startsWith("babypause-"))).toBe(true);
  });
});

describe("Praxis", () => {
  it("aktualisiert die Anschrift auch am Praxisort", async () => {
    await send("PUT", "/api/praxis", { name: "Hebammenpraxis Kindkesmöön", anschrift: "Neue Reihe 46b, 18209 Bad Doberan", telefon: "", email: "" });
    const orte = (await get("/api/ich/orte")).json();
    expect(orte.find((o: { typ: string }) => o.typ === "praxis").anschrift).toBe("Neue Reihe 46b, 18209 Bad Doberan");
  });
});
