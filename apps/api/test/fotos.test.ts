import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { foto } from "../src/db/schema";
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

const req = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown, cookie = johanna) => t.app.inject({ method, url, payload: payload as object, headers: { cookie } });
// 1×1-Pixel-PNG (kein echtes Foto)
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const bild = `data:image/png;base64,${PNG}`;

describe("M17 Fotos", () => {
  let klientinId: string;
  let fotoId: string;

  it("verlangt die Einwilligung und prüft den Inhalt", async () => {
    klientinId = (await req("POST", "/api/klientinnen", { vorname: "Fiona", nachname: "Foto", zustaendigeHebammeId: johannaId })).json().id;
    expect((await req("GET", `/api/klientinnen/${klientinId}/fotos`)).json()).toEqual({ einwilligung: false, schluessel: true, fotos: [] });
    expect((await req("POST", `/api/klientinnen/${klientinId}/fotos`, { bild, bereich: "nabel" })).statusCode).toBe(409);

    await req("PUT", `/api/klientinnen/${klientinId}/einwilligungen/foto`, { erteilt: true, form: "papier", datum: new Date().toISOString().slice(0, 10) });
    expect((await req("POST", `/api/klientinnen/${klientinId}/fotos`, { bild, bereich: "unbekannt" })).statusCode).toBe(400);
    // HTML als „PNG“ ausgegeben
    const falsch = `data:image/png;base64,${Buffer.from("<script>alert(1)</script>").toString("base64")}`;
    expect((await req("POST", `/api/klientinnen/${klientinId}/fotos`, { bild: falsch, bereich: "nabel" })).statusCode).toBe(400);
    expect((await req("POST", `/api/klientinnen/${klientinId}/fotos`, { bild, bereich: "nabel", kindId: "00000000-0000-0000-0000-000000000000" })).statusCode).toBe(400);

    const r = await req("POST", `/api/klientinnen/${klientinId}/fotos`, { bild, bereich: "nabel", notiz: "Tag 5" });
    expect(r.statusCode).toBe(200);
    fotoId = r.json().id;
  });

  it("speichert verschlüsselt und liefert das Bild nur mit Einwilligung", async () => {
    const [roh] = await t.db.select({ daten: foto.daten, groesse: foto.groesse }).from(foto).where(eq(foto.id, fotoId));
    expect(roh!.groesse).toBe(Buffer.from(PNG, "base64").length);
    expect(roh!.daten.includes(Buffer.from(PNG, "base64").subarray(0, 8))).toBe(false);

    const liste = (await req("GET", `/api/klientinnen/${klientinId}/fotos`)).json();
    expect(liste.fotos).toHaveLength(1);
    expect(liste.fotos[0]).toMatchObject({ bereich: "nabel", notiz: "Tag 5", erstelltVonName: "Johanna Mede" });

    const b = await req("GET", `/api/fotos/${fotoId}/bild`);
    expect(b.statusCode).toBe(200);
    expect(b.headers["content-type"]).toBe("image/png");
    expect(b.headers["cache-control"]).toBe("no-store");
    expect(b.rawPayload.equals(Buffer.from(PNG, "base64"))).toBe(true);
    expect((await t.app.inject({ method: "GET", url: `/api/fotos/${fotoId}/bild` })).statusCode).toBe(401);

    // Datenexport ohne Bilddaten
    const exp = (await req("GET", "/api/export")).json();
    expect(exp.tabellen.foto[0].daten).toBeUndefined();
    expect(exp.tabellen.foto[0].bereich).toBe("nabel");
  });

  it("sperrt Bilder nach Widerruf und löscht auf Wunsch alle", async () => {
    await req("PUT", `/api/klientinnen/${klientinId}/einwilligungen/foto`, { erteilt: false, form: "muendlich", datum: new Date().toISOString().slice(0, 10) });
    expect((await req("GET", `/api/fotos/${fotoId}/bild`)).statusCode).toBe(403);
    expect((await req("GET", `/api/klientinnen/${klientinId}/fotos`)).json()).toMatchObject({ einwilligung: false, fotos: [{ id: fotoId }] });
    expect((await req("DELETE", `/api/klientinnen/${klientinId}/fotos`)).json()).toEqual({ ok: true, anzahl: 1 });
    expect((await req("GET", `/api/klientinnen/${klientinId}/fotos`)).json().fotos).toHaveLength(0);
  });
});
