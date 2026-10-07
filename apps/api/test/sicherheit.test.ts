import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "../src/config";
import { DEMO_PASSWORT } from "../src/seed/seed";
import { aktuellerSchritt, base32, totpCode, totpPruefen } from "../src/totp";
import { anmelden, testAppStarten } from "./hilfen";

let t: Awaited<ReturnType<typeof testAppStarten>>;
beforeAll(async () => {
  t = await testAppStarten();
});
afterAll(async () => t?.schliessen());

const req = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, cookie: string | null, payload?: unknown, kopf: Record<string, string> = {}) =>
  t.app.inject({ method, url, payload: payload as object, headers: { ...(cookie ? { cookie } : {}), ...kopf } });
// Eigene Absender-Adresse je Versuch, damit die Begrenzung der Anmeldeversuche je IP den Test nicht ausbremst
let ip = 0;
const login = (email: string, code?: string) =>
  t.app.inject({ method: "POST", url: "/api/auth/anmelden", payload: { email, passwort: DEMO_PASSWORT, ...(code ? { code } : {}) }, headers: { "x-forwarded-for": `10.0.0.${++ip}` } });

describe("TOTP", () => {
  it("entspricht dem Testvektor aus RFC 6238", () => {
    const geheimnis = base32(Buffer.from("12345678901234567890"));
    expect(totpCode(geheimnis, Math.floor(59 / 30), 8)).toBe("94287082");
    expect(totpCode(geheimnis, Math.floor(1111111109 / 30), 8)).toBe("07081804");
    expect(totpCode(geheimnis, Math.floor(59 / 30))).toBe("287082");
  });

  it("toleriert einen Zeitschritt und verhindert die Wiederverwendung", () => {
    const g = base32(Buffer.from("abcdefghijabcdefghij"));
    const jetzt = Date.now();
    const s = aktuellerSchritt(jetzt);
    expect(totpPruefen(g, totpCode(g, s - 1), null, jetzt)).toBe(s - 1);
    expect(totpPruefen(g, totpCode(g, s - 2), null, jetzt)).toBeNull();
    expect(totpPruefen(g, totpCode(g, s), s, jetzt)).toBeNull(); // schon verwendet
    expect(totpPruefen(g, "12a456", null, jetzt)).toBeNull();
  });
});

describe("M25 Sicherheit", () => {
  let lorina: string;
  let geheimnis: string;
  let codes: string[];

  it("richtet die Zwei-Faktor-Anmeldung mit Passwort und Bestätigungscode ein", async () => {
    lorina = (await anmelden(t.app, "lorina@kindkesmoeoen.test")).cookie;
    expect((await req("GET", "/api/auth/ich", lorina)).json()).toMatchObject({ zweiFaktor: false, zweiFaktorPflicht: false, sperreMinuten: 15 });
    expect((await req("POST", "/api/ich/2fa/start", lorina, { passwort: "falsch" })).statusCode).toBe(400);
    const start = (await req("POST", "/api/ich/2fa/start", lorina, { passwort: DEMO_PASSWORT })).json();
    geheimnis = start.geheimnis;
    expect(start.uri).toMatch(/^otpauth:\/\/totp\/Kindk.*secret=[A-Z2-7]{32}&issuer=Kindk/);
    expect((await req("POST", "/api/ich/2fa/bestaetigen", lorina, { code: "000000" })).statusCode).toBe(400);
    const ok = (await req("POST", "/api/ich/2fa/bestaetigen", lorina, { code: totpCode(geheimnis, aktuellerSchritt()) })).json();
    codes = ok.wiederherstellungscodes;
    expect(codes).toHaveLength(8);
    expect(codes[0]).toMatch(/^[A-Z2-7]{4}-[A-Z2-7]{4}$/);
    expect((await req("GET", "/api/ich/sicherheit", lorina)).json()).toMatchObject({ zweiFaktor: true, wiederherstellungscodes: 8 });
  });

  it("verlangt danach den Code bei der Anmeldung – Einmalcode oder Wiederherstellungscode", async () => {
    expect((await login("lorina@kindkesmoeoen.test")).json()).toEqual({ zweiterFaktor: true });
    expect((await login("lorina@kindkesmoeoen.test")).cookies.find((c) => c.name === "kk_sitzung")).toBeUndefined();
    expect((await login("lorina@kindkesmoeoen.test", "123456")).statusCode).toBe(401);
    // Der Code aus der Einrichtung ist schon verbraucht – der nächste Zeitschritt geht
    const naechster = totpCode(geheimnis, aktuellerSchritt() + 1);
    const ok = await login("lorina@kindkesmoeoen.test", naechster);
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ zweiFaktor: true });
    expect((await login("lorina@kindkesmoeoen.test", naechster)).statusCode).toBe(401); // nicht zweimal
    // Wiederherstellungscode (Kleinschreibung, ohne Bindestrich) – nur einmal
    const w = codes[0]!.replace("-", "").toLowerCase();
    expect((await login("lorina@kindkesmoeoen.test", w)).statusCode).toBe(200);
    expect((await login("lorina@kindkesmoeoen.test", w)).statusCode).toBe(401);
    expect((await req("GET", "/api/ich/sicherheit", lorina)).json().wiederherstellungscodes).toBe(7);
    const neu = (await req("POST", "/api/ich/2fa/neue-codes", lorina, { passwort: DEMO_PASSWORT })).json();
    expect(neu.wiederherstellungscodes).toHaveLength(8);
  });

  it("listet die Geräte und meldet einzelne bzw. alle anderen ab", async () => {
    const liste = (await req("GET", "/api/ich/sitzungen", lorina, undefined)).json();
    expect(liste.length).toBeGreaterThanOrEqual(3);
    const ich = liste.find((s: { aktuell: boolean }) => s.aktuell);
    expect(ich.kennung).toMatch(/^[0-9a-f]{16}$/);
    expect(JSON.stringify(liste)).not.toMatch(/"id"/);
    const fremd = liste.find((s: { aktuell: boolean }) => !s.aktuell);
    expect((await req("DELETE", `/api/ich/sitzungen/${fremd.kennung}`, lorina)).json()).toEqual({ ok: true, diesesGeraet: false });
    // Johanna kann Lorinas Geräte nicht abmelden
    const johanna = (await anmelden(t.app, "johanna@kindkesmoeoen.test")).cookie;
    expect((await req("DELETE", `/api/ich/sitzungen/${ich.kennung}`, johanna)).statusCode).toBe(404);
    const r = (await req("POST", "/api/ich/sitzungen/andere-beenden", lorina)).json();
    expect(r.anzahl).toBeGreaterThanOrEqual(1);
    expect((await req("GET", "/api/ich/sitzungen", lorina)).json()).toHaveLength(1);
    expect((await req("GET", "/api/auth/ich", lorina)).statusCode).toBe(200);
  });

  it("stellt die App-Sperre ein und prüft das Passwort beim Entsperren", async () => {
    expect((await req("PUT", "/api/ich/sperre", lorina, { minuten: 7 })).statusCode).toBe(400);
    expect((await req("PUT", "/api/ich/sperre", lorina, { minuten: 5 })).statusCode).toBe(200);
    expect((await req("GET", "/api/auth/ich", lorina)).json().sperreMinuten).toBe(5);
    expect((await req("POST", "/api/auth/entsperren", lorina, { passwort: "falsch" })).statusCode).toBe(400);
    expect((await req("POST", "/api/auth/entsperren", lorina, { passwort: DEMO_PASSWORT })).statusCode).toBe(200);
  });

  it("schaltet die Zwei-Faktor-Anmeldung mit Passwort wieder aus", async () => {
    expect((await req("POST", "/api/ich/2fa/aus", lorina, { passwort: "falsch" })).statusCode).toBe(400);
    expect((await req("POST", "/api/ich/2fa/aus", lorina, { passwort: DEMO_PASSWORT })).statusCode).toBe(200);
    expect((await login("lorina@kindkesmoeoen.test")).json()).toMatchObject({ zweiFaktor: false });
  });

  it("sperrt bei Zwei-Faktor-Pflicht alles außer der Einrichtung", async () => {
    config.zweiFaktorPflicht = true;
    try {
      const marielena = (await anmelden(t.app, "marielena@kindkesmoeoen.test")).cookie;
      expect((await req("GET", "/api/auth/ich", marielena)).json()).toMatchObject({ zweiFaktor: false, zweiFaktorPflicht: true });
      const gesperrt = await req("GET", "/api/klientinnen", marielena);
      expect(gesperrt.statusCode).toBe(403);
      expect(gesperrt.json().code).toBe("zwei_faktor_einrichten");
      const start = (await req("POST", "/api/ich/2fa/start", marielena, { passwort: DEMO_PASSWORT })).json();
      await req("POST", "/api/ich/2fa/bestaetigen", marielena, { code: totpCode(start.geheimnis, aktuellerSchritt()) });
      expect((await req("GET", "/api/klientinnen", marielena)).statusCode).toBe(200);
      expect((await req("POST", "/api/ich/2fa/aus", marielena, { passwort: DEMO_PASSWORT })).statusCode).toBe(403);
    } finally {
      config.zweiFaktorPflicht = false;
    }
  });

  it("exportiert alle Daten ohne Geheimnisse – nur für Hebammen", async () => {
    const johanna = (await anmelden(t.app, "johanna@kindkesmoeoen.test")).cookie;
    const r = await req("GET", "/api/export", johanna);
    expect(r.statusCode).toBe(200);
    expect(r.headers["content-disposition"]).toMatch(/attachment; filename="kindkesmoeoen-export-\d{4}-\d{2}-\d{2}\.json"/);
    const daten = r.json();
    expect(Object.keys(daten.tabellen)).toEqual(expect.arrayContaining(["benutzer", "klientin", "besuch", "regelwerk", "protokoll"]));
    expect(daten.tabellen.sitzung).toBeUndefined();
    expect(r.body).not.toMatch(/passwortHash|totpGeheimnis|\$argon2/);
    expect(daten.tabellen.klientin.length).toBeGreaterThan(0);
    expect((await req("GET", "/api/export", null)).statusCode).toBe(401);
  });
});
