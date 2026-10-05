import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { besuchAbrechnen, feiertage, kontingentStand, lebenstag, sswAusEt, type FruehererBesuch, type Kontext, type RegelwerkDaten } from "./plausi";

const rw = JSON.parse(readFileSync(new URL("../../../regelwerk/hhv-2026-04-01.json", import.meta.url), "utf8")) as RegelwerkDaten;
const kind = (geburtsdatum: string, frueher: FruehererBesuch[] = [], anzahlKinder = 1): Kontext => ({ geburtsdatum, et: null, anzahlKinder, fruehereBesuche: frueher });
const schwanger = (et: string, frueher: FruehererBesuch[] = []): Kontext => ({ geburtsdatum: null, et, anzahlKinder: 1, fruehereBesuche: frueher });
// Frühere Wochenbett-Hausbesuche haben die Materialpauschale Wochenbett bereits abgerechnet
const fb = (datum: string, stamm: string, einheiten = 9, art: 1 | 2 | 3 | 4 = 1, material: string[] = stamm.startsWith("30") && art === 1 ? ["61200"] : []): FruehererBesuch => ({ datum, von: "09:00", art, stamm, einheiten, material });

describe("Hilfsfunktionen", () => {
  it("Lebenstag: Tag der Geburt ist der 1. Lebenstag", () => {
    expect(lebenstag("2026-09-20", "2026-09-20")).toBe(1);
    expect(lebenstag("2026-09-20", "2026-09-29")).toBe(10);
  });
  it("SSW aus dem ET", () => {
    expect(sswAusEt("2026-12-01", "2026-12-01").text).toBe("40+0");
    expect(sswAusEt("2026-12-01", "2026-11-17").text).toBe("38+0");
  });
  it("Feiertage MV inkl. Frauentag, Ostern und Reformationstag", () => {
    const f = feiertage(2027, rw.feiertage);
    expect(f.get("2027-03-08")).toBe("Internationaler Frauentag");
    expect(f.get("2027-03-26")).toBe("Karfreitag");
    expect(f.get("2027-03-29")).toBe("Ostermontag");
    expect(f.get("2027-10-31")).toBe("Reformationstag");
  });
});

describe("Zeiten", () => {
  const besuch = (von: string, bis: string) => besuchAbrechnen({ datum: "2026-10-04", von, bis, typ: "wochenbett", art: 1, material: [] }, kind("2026-09-29", [fb("2026-09-30", "301")]), rw);
  it("Besuch über Mitternacht wird abgerechnet", () => {
    const e = besuch("23:30", "00:20");
    expect(e.einheiten).toBe(10);
    expect(e.hinweise.some((h) => h.stufe === "fehler")).toBe(false);
  });
  it("Ende vor Beginn (mehr als 12 Stunden über Mitternacht) ist ein Fehler", () => {
    const e = besuch("11:00", "10:00");
    expect(e.einheiten).toBe(0);
    expect(e.zeilen).toHaveLength(0);
    expect(e.hinweise).toContainEqual(expect.objectContaining({ stufe: "fehler", text: expect.stringContaining("Ende liegt vor dem Beginn") }));
  });
  it("gleicher Beginn und gleiches Ende sind keine 24 Stunden", () => {
    const e = besuch("11:00", "11:00");
    expect(e.einheiten).toBe(0);
    expect(e.hinweise).toContainEqual(expect.objectContaining({ stufe: "fehler", text: expect.stringContaining("mindestens 5 Minuten") }));
  });
});

describe("Wochenbett", () => {
  it("früher Hausbesuch: 301 mit 5-Minuten-Einheiten und Materialpauschale lang", () => {
    // Do 01.10.2026, Geburt 29.09. -> 3. Lebenstag
    const e = besuchAbrechnen({ datum: "2026-10-01", von: "09:10", bis: "09:55", typ: "wochenbett", art: 1, material: [] }, kind("2026-09-29"), rw);
    expect(e.stamm).toBe("301");
    expect(e.lebenstag).toBe(3);
    expect(e.zeilen[0]).toMatchObject({ gpos: "30101", menge: 9, betrag: 55.71 });
    expect(e.zeilen.find((z) => z.gpos === "61200")?.automatisch).toBe(true);
    expect(e.formularzeile).toEqual({ formular: "3.3", spalte: "Wochenbett", eintrag: "1" });
  });

  it("erlaubt in den ersten drei Lebenstagen 120 Minuten, danach 90", () => {
    const lang = { von: "09:00", bis: "11:00", typ: "wochenbett" as const, art: 1 as const, material: [] };
    const tag2 = besuchAbrechnen({ ...lang, datum: "2026-09-30" }, kind("2026-09-29"), rw);
    expect(tag2.einheitenAbrechenbar).toBe(24);
    const tag6 = besuchAbrechnen({ ...lang, datum: "2026-10-04" }, kind("2026-09-29", [fb("2026-09-30", "301", 24)]), rw);
    expect(tag6.einheitenAbrechenbar).toBe(18);
    expect(tag6.hinweise.some((h) => h.stufe === "warnung" && h.text.includes("30 Minuten"))).toBe(true);
  });

  it("gibt den 120-Minuten-Rahmen auch am Tag des ersten Hausbesuchs (später übernommen)", () => {
    const e = besuchAbrechnen({ datum: "2026-10-06", von: "09:00", bis: "11:00", typ: "wochenbett", art: 1, material: [] }, kind("2026-09-29"), rw);
    expect(e.einheitenAbrechenbar).toBe(24);
    expect(e.zeilen.some((z) => z.gpos === "61300")).toBe(true); // später als 4 Tage nach der Geburt übernommen
  });

  it("Mehrlinge: +10 Minuten je weiterem Kind", () => {
    const e = besuchAbrechnen({ datum: "2026-10-05", von: "09:00", bis: "11:00", typ: "wochenbett", art: 1, material: [] }, kind("2026-09-29", [fb("2026-09-30", "301")], 2), rw);
    expect(e.einheitenAbrechenbar).toBe(20);
  });

  it("Zuschlag am Sonntag und nachts, je Einheit getrennt", () => {
    // So 04.10.2026 -> komplett mit Zuschlag
    const so = besuchAbrechnen({ datum: "2026-10-04", von: "10:00", bis: "10:30", typ: "wochenbett", art: 1, material: [] }, kind("2026-09-29", [fb("2026-09-30", "301")]), rw);
    expect(so.zeilen[0]).toMatchObject({ gpos: "30111", menge: 6, betrag: 43.44 });
    // Mo 05.10. 20:45–21:15 -> 3 Einheiten ohne, 3 mit Zuschlag
    const abend = besuchAbrechnen({ datum: "2026-10-05", von: "20:45", bis: "21:15", typ: "wochenbett", art: 1, material: [] }, kind("2026-09-29", [fb("2026-09-30", "301")]), rw);
    expect(abend.zeilen.map((z) => [z.gpos, z.menge])).toEqual([["30101", 3], ["30111", 3]]);
  });

  it("Samstag erst ab 12 Uhr mit Zuschlag", () => {
    const sa = besuchAbrechnen({ datum: "2026-10-03", von: "11:50", bis: "12:10", typ: "wochenbett", art: 1, material: [] }, kind("2026-09-29", [fb("2026-09-30", "301")]), rw);
    // 03.10. ist zugleich Feiertag -> durchgehend Zuschlag
    expect(sa.zeilen.map((z) => z.gpos)).toEqual(["30111"]);
    const sa2 = besuchAbrechnen({ datum: "2026-10-10", von: "11:50", bis: "12:10", typ: "wochenbett", art: 1, material: [] }, kind("2026-09-29", [fb("2026-09-30", "301")]), rw);
    expect(sa2.zeilen.map((z) => [z.gpos, z.menge])).toEqual([["30301", 2], ["30311", 2]]);
  });

  it("ab dem 11. Lebenstag spätes Wochenbett mit 60 Minuten", () => {
    const e = besuchAbrechnen({ datum: "2026-10-09", von: "09:00", bis: "10:30", typ: "wochenbett", art: 1, material: [] }, kind("2026-09-29", [fb("2026-09-30", "301")]), rw);
    expect(e.stamm).toBe("303");
    expect(e.einheitenAbrechenbar).toBe(12);
  });

  it("ab der 13. Lebenswoche Still- und Ernährungsschwierigkeiten", () => {
    expect(besuchAbrechnen({ datum: "2026-12-23", von: "09:00", bis: "09:45", typ: "wochenbett", art: 2, material: [] }, kind("2026-09-29", [fb("2026-09-30", "301")]), rw).stamm).toBe("306");
  });

  it("höchstens zwei Kontakte pro Tag im frühen Wochenbett", () => {
    const e = besuchAbrechnen({ datum: "2026-10-01", von: "18:00", bis: "18:30", typ: "wochenbett", art: 1, material: [] }, kind("2026-09-29", [fb("2026-10-01", "301", 6), fb("2026-10-01", "301", 6)]), rw);
    expect(e.hinweise[0]?.stufe).toBe("fehler");
    expect(e.zeilen).toHaveLength(0);
  });

  it("Video nur als zweiter Kontakt am Tag", () => {
    const e = besuchAbrechnen({ datum: "2026-10-02", von: "18:00", bis: "18:20", typ: "wochenbett", art: 3, material: [] }, kind("2026-09-29", [fb("2026-09-30", "301")]), rw);
    expect(e.hinweise.some((h) => h.text.includes("zweiter Kontakt"))).toBe(true);
  });

  it("warnt beim ausgeschöpften Kontingent von 20 Kontakten", () => {
    const frueher = Array.from({ length: 20 }, (_, i) => fb(`2026-09-${String(29 + (i % 2)).padStart(2, "0")}`, "301", 6));
    const e = besuchAbrechnen({ datum: "2026-10-05", von: "09:00", bis: "09:30", typ: "wochenbett", art: 1, material: [] }, kind("2026-09-29", frueher), rw);
    expect(e.hinweise.some((h) => h.stufe === "warnung" && h.text.includes("20 Kontakten"))).toBe(true);
  });

  it("Telefon: höchstens 10 Minuten, keine Unterschrift, kein Material", () => {
    const e = besuchAbrechnen({ datum: "2026-10-02", von: "14:00", bis: "14:20", typ: "wochenbett", art: 4, material: ["61100"] }, kind("2026-09-29", [fb("2026-09-30", "301")]), rw);
    expect(e.zeilen.map((z) => [z.gpos, z.menge])).toEqual([["30104", 2]]);
    expect(e.formularzeile).toBeNull();
  });

  it("einmaliges Material wird nicht doppelt abgerechnet", () => {
    const e = besuchAbrechnen({ datum: "2026-10-02", von: "09:00", bis: "09:30", typ: "wochenbett", art: 1, material: ["61400", "61500"] }, kind("2026-09-29", [fb("2026-09-30", "301", 9, 1, ["61200", "61400"])]), rw);
    expect(e.materialAbgerechnet).toEqual(["61500"]);
  });
});

describe("Schwangerschaft", () => {
  it("Vorsorge in der Praxis mit Materialpauschale", () => {
    const e = besuchAbrechnen({ datum: "2026-10-01", von: "10:00", bis: "10:40", typ: "vorsorge", art: 2, material: ["60200", "60100"] }, schwanger("2026-12-01"), rw);
    expect(e.zeilen.map((z) => [z.gpos, z.menge])).toEqual([["10202", 6], ["60200", 1]]);
    expect(e.ssw).toBe("31+2");
  });
  it("Aufklärungsgespräch nach der 37. SSW wird abgelehnt", () => {
    const e = besuchAbrechnen({ datum: "2026-11-20", von: "10:00", bis: "10:30", typ: "aufklaerung", art: 1, material: [] }, schwanger("2026-12-01"), rw);
    expect(e.hinweise[0]?.stufe).toBe("fehler");
  });
  it("Schwangerschaftsleistung nach der Geburt wird abgelehnt", () => {
    const e = besuchAbrechnen({ datum: "2026-10-02", von: "10:00", bis: "10:30", typ: "schwangerschaft", art: 1, material: [] }, kind("2026-09-29"), rw);
    expect(e.hinweise[0]?.text).toContain("nach der Geburt");
  });
  it("Vorsorge nicht per Video", () => {
    const e = besuchAbrechnen({ datum: "2026-10-01", von: "10:00", bis: "10:30", typ: "vorsorge", art: 3, material: [] }, schwanger("2026-12-01"), rw);
    expect(e.hinweise[0]?.stufe).toBe("fehler");
  });
});

describe("Kontingentstand", () => {
  it("zählt Kontakte und Kontakttage", () => {
    const stand = kontingentStand([fb("2026-09-30", "301"), fb("2026-10-01", "301"), fb("2026-10-10", "303"), fb("2026-10-10", "303", 2, 4)], rw);
    expect(stand.find((s) => s.id === "301")).toMatchObject({ genutzt: 2, maximum: 20 });
    expect(stand.find((s) => s.id === "303")).toMatchObject({ genutzt: 1, maximum: 16, einheit: "Kontakttage" });
  });
});
