import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aenderungSchema, operationBeschreiben, operationenAnwenden, vorherWerte, type Operation } from "./aenderung";
import { besuchAbrechnen, type RegelwerkDaten } from "./plausi";

const rw = JSON.parse(readFileSync(new URL("../../../regelwerk/hhv-2026-04-01.json", import.meta.url), "utf8")) as RegelwerkDaten & Record<string, unknown>;

describe("Änderungen am Regelwerk", () => {
  it("ändert den Betrag einer Position, ohne das Original zu verändern", () => {
    const op: Operation = { art: "position", gpos: "30101", felder: { betrag: 7 } };
    const vorher = vorherWerte(rw, op);
    const neu = operationenAnwenden(rw, [op]);
    expect(neu.positionen.find((p) => p.gpos === "30101")!.betrag).toBe(7);
    expect(rw.positionen.find((p) => p.gpos === "30101")!.betrag).toBe(vorher.betrag);
    expect(operationBeschreiben(op, vorher)[0]).toMatch(/GPOS 30101 Betrag \(€\): .* → 7/);
  });

  it("wirkt sich auf die Abrechnung aus (Testrechner)", () => {
    const besuch = { datum: "2026-10-05", von: "10:00", bis: "10:45", typ: "wochenbett" as const, art: 1 as const, material: [] };
    const kontext = { geburtsdatum: "2026-10-01", et: null, anzahlKinder: 1, fruehereBesuche: [] };
    const alt = besuchAbrechnen(besuch, kontext, rw);
    const neu = besuchAbrechnen(besuch, kontext, operationenAnwenden(rw, [{ art: "position", gpos: alt.zeilen[0]!.gpos, felder: { betrag: 10 } }]));
    expect(neu.zeilen[0]!.betrag).toBeCloseTo(alt.zeilen[0]!.menge * 10, 2);
    expect(neu.summe - alt.summe).toBeCloseTo(neu.zeilen[0]!.betrag - alt.zeilen[0]!.betrag, 2);
  });

  it("ändert Kontingente, Zuschläge und Wegegeld", () => {
    const neu = operationenAnwenden(rw, [
      { art: "kontingent", id: "301", felder: { kontakte_pro_tag: 3 } },
      { art: "zuschlaege", felder: { nacht_von: "22:00" } },
      { art: "wegegeld", felder: { satz_je_km: 1.05, hin_und_rueckweg: false } },
    ]);
    expect(neu.kontingente.find((k) => k.id === "301")!.kontakte_pro_tag).toBe(3);
    expect(neu.zuschlaege.nacht.von).toBe("22:00");
    expect(neu.wegegeld).toMatchObject({ satz_je_km: 1.05, hin_und_rueckweg: false });
  });

  it("meldet unbekannte Positionen", () => {
    expect(() => vorherWerte(rw, { art: "position", gpos: "99999", felder: { betrag: 1 } })).toThrow(/99999/);
  });

  it("verlangt Titel, Begründung und Regelwerk", () => {
    const r = aenderungSchema.safeParse({ titel: "x", begruendung: "", operationen: [{ art: "position", gpos: "30101", felder: { betrag: 7 } }] });
    expect(r.success).toBe(false);
    const ok = aenderungSchema.safeParse({ titel: "Preis Rückbildung", begruendung: "Neue Kalkulation", operationen: [{ art: "selbstzahler", id: "x", felder: { preis: 10 } }] });
    expect(ok.success).toBe(true);
  });
});
