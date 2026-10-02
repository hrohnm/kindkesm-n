import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { operationenAnwenden } from "./aenderung";
import { csvLesen, positionenAusCsv, positionenCsv, selbstzahlerAusCsv } from "./csv";
import { besuchAbrechnen, materialFuer, type RegelwerkDaten } from "./plausi";

const rw = JSON.parse(readFileSync(new URL("../../../regelwerk/hhv-2026-04-01.json", import.meta.url), "utf8")) as RegelwerkDaten & Record<string, unknown>;

describe("CSV", () => {
  it("liest Anführungszeichen, Semikolons und Zeilenumbrüche in Feldern", () => {
    expect(csvLesen('a;b\r\n"x;y";"Zeile 1\nZeile 2"\r\n')).toEqual([["a", "b"], ["x;y", "Zeile 1\nZeile 2"]]);
  });

  it("Export und unveränderter Re-Import ergeben keine Änderungen", () => {
    const r = positionenAusCsv(positionenCsv(rw.positionen as never), rw);
    expect(r.operationen).toEqual([]);
    expect(r.unveraendert).toBe(rw.positionen.length);
  });

  it("erkennt geänderte Beträge und neue Positionen", () => {
    const csv = "GPOS;Bezeichnung;Kurztext;Betrag EUR;Einheit;Quittierungspflichtig\n30101;Hilfeleistung im frühen Wochenbett;WB früh;6,50;5min;ja\n69800;Material Stillhütchen;Stillhütchen;4,20;pauschal;nein\nabc;x;x;1;pauschal;nein\n";
    const r = positionenAusCsv(csv, rw);
    expect(r.operationen.map((o) => o.art)).toEqual(["position", "position_neu"]);
    expect(r.operationen[0]).toMatchObject({ gpos: "30101", felder: { betrag: 6.5 } });
    expect(r.hinweise.join(" ")).toMatch(/keine 5-stellige GPOS/);
    expect(r.hinweise.join(" ")).toMatch(/bleiben unverändert/);
    const neu = operationenAnwenden(rw, r.operationen);
    expect(neu.positionen.find((p) => p.gpos === "69800")).toMatchObject({ betrag: 4.2, kategorie: 6, zuschlag: false });
  });

  it("Selbstzahler-Import", () => {
    const r = selbstzahlerAusCsv("Kennung;Preis EUR;Bezeichnung\nakupunktur;49,00;Akupunktur\nneu-leistung;20;Neue Leistung\n", { akupunktur: { preis: 45, bezeichnung: "Akupunktur" } });
    expect(r.operationen.map((o) => o.art)).toEqual(["selbstzahler", "selbstzahler_neu"]);
  });
});

describe("Neue Materialposition", () => {
  it("wird bei der passenden Leistung auswählbar und abgerechnet", () => {
    const neu = operationenAnwenden(rw, [
      { art: "position_neu", position: { gpos: "69800", bezeichnung: "Stillhütchen", kurztext: "Stillhütchen", leistungsart: "keine Spezifikation", betrag: 4.2, einheit: "pauschal", formular: null, quittierungspflichtig: false, hinweis: null, material_fuer: ["wochenbett"], einmalig: true } },
    ]);
    expect(materialFuer(neu, "wochenbett")).toContain("69800");
    expect(materialFuer(rw, "wochenbett")).not.toContain("69800");
    const e = besuchAbrechnen({ datum: "2026-10-05", von: "10:00", bis: "10:40", typ: "wochenbett", art: 1, material: ["69800"] }, { geburtsdatum: "2026-10-01", et: null, anzahlKinder: 1, fruehereBesuche: [{ datum: "2026-10-02", von: "10:00", art: 1, stamm: "301", einheiten: 8, material: ["61200"] }] }, neu);
    expect(e.zeilen.some((z) => z.gpos === "69800" && z.betrag === 4.2)).toBe(true);
  });

  it("neues Kontingent wird über die Kennung (GPOS-Stamm) gefunden", () => {
    const neu = operationenAnwenden(rw, [{ art: "kontingent_neu", kontingent: { id: "999", name: "Test", positionen: ["999X1"], verhalten_bei_ueberschreitung: "hinweis", kontakte_pro_tag: 1 } }]);
    expect(neu.kontingente.find((k) => k.id === "999")).toMatchObject({ kontakte_pro_tag: 1, bezug: "Versicherte" });
  });
});
