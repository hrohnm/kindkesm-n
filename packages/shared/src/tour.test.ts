import { describe, expect, it } from "vitest";
import {
  abschnittArt,
  minZuUhrzeit,
  terminFenster,
  terminSchema,
  tourOptimieren,
  tourZeiten,
  uhrzeitZuMin,
  wegegeldAufteilen,
  type Matrix,
  type Stopp,
  type WegegeldRegel,
} from "./tour";

/** Punkte auf einer Linie: Fahrzeit 1 Min. je Kilometer */
function linie(km: number[]): Matrix {
  const sek = km.map((a) => km.map((b) => Math.abs(a - b) * 60));
  const meter = km.map((a) => km.map((b) => Math.abs(a - b) * 1000));
  return { sek, meter };
}

describe("tourZeiten", () => {
  it("rechnet Ankunft, Wartezeit und Ende", () => {
    // Start 0 km, Besuche bei 10 und 20 km, Ende 0 km
    const m = linie([0, 10, 20, 0]);
    const stopps: Stopp[] = [{ dauerMin: 30 }, { dauerMin: 45, fruehestens: uhrzeitZuMin("09:30") }];
    const z = tourZeiten([1, 2], m, stopps, { startMin: uhrzeitZuMin("08:00"), pufferMin: 5 });
    expect(z.ankunft.map(minZuUhrzeit)).toEqual(["08:10", "08:55"]);
    expect(z.beginn.map(minZuUhrzeit)).toEqual(["08:10", "09:30"]); // wartet bis 9:30
    expect(minZuUhrzeit(z.ankunftEnde)).toBe("10:40");
    expect(z.meter).toBe(40_000);
  });
});

describe("tourOptimieren", () => {
  it("findet die kürzeste Reihenfolge", () => {
    const m = linie([0, 30, 10, 20, 0]);
    const stopps: Stopp[] = [{ dauerMin: 30 }, { dauerMin: 30 }, { dauerMin: 30 }];
    const e = tourOptimieren(m, stopps, { startMin: 480 });
    expect(e.meter).toBe(60_000);
    expect([[2, 3, 1], [1, 3, 2]]).toContainEqual(e.reihenfolge);
    expect(e.exakt).toBe(true);
    expect(e.hinweise).toEqual([]);
  });

  it("hält feste Termine ein, auch wenn der Weg länger wird", () => {
    const m = linie([0, 10, 20, 0]);
    // Besuch 2 (20 km) fest um 8:30 → muss zuerst angefahren werden
    const stopps: Stopp[] = [{ dauerMin: 30 }, { dauerMin: 30, fruehestens: 510, spaetestens: 510 }];
    const e = tourOptimieren(m, stopps, { startMin: 480 });
    expect(e.reihenfolge).toEqual([2, 1]);
    expect(e.verspaetung).toEqual([0, 0]);
  });

  it("meldet, wenn das Ende zu spät erreicht wird", () => {
    const m = linie([0, 10, 0]);
    const e = tourOptimieren(m, [{ dauerMin: 120 }], { startMin: 480, endeSpaetestens: 540 });
    expect(e.endeVerspaetung).toBeGreaterThan(0);
    expect(e.hinweise[0]).toMatch(/erst um 10:20/);
  });

  it("plant einen wichtigen Besuch bei Zeitnot zuerst pünktlich", () => {
    const m = linie([0, 5, 5, 0]);
    const stopps: Stopp[] = [
      { dauerMin: 60, spaetestens: 500 },
      { dauerMin: 60, spaetestens: 500, wichtig: true },
    ];
    const e = tourOptimieren(m, stopps, { startMin: 480 });
    expect(e.reihenfolge[0]).toBe(2);
  });

  it("nutzt ab 10 Besuchen die lokale Suche mit gutem Ergebnis", () => {
    const orte = [0, 7, 3, 12, 1, 9, 5, 11, 2, 8, 4, 6, 0];
    const m = linie(orte);
    const stopps: Stopp[] = orte.slice(1, -1).map(() => ({ dauerMin: 20 }));
    const e = tourOptimieren(m, stopps, { startMin: 480 });
    expect(e.exakt).toBe(false);
    expect(e.meter).toBe(24_000); // hin bis 12 km und zurück
  });
});

describe("terminFenster und terminSchema", () => {
  it("feste Uhrzeit und Kurzwahl", () => {
    expect(terminFenster({ zeit: "fix", uhrzeit: "10:15", fruehestens: null, spaetestens: null })).toEqual({ fruehestens: 615, spaetestens: 615 });
    expect(terminFenster({ zeit: "vormittags", uhrzeit: null, fruehestens: null, spaetestens: null })).toEqual({ fruehestens: 480, spaetestens: 720 });
    expect(terminFenster({ zeit: "ganztags", uhrzeit: null, fruehestens: null, spaetestens: null })).toEqual({ fruehestens: null, spaetestens: null });
  });
  it("verlangt bei fester Uhrzeit eine Uhrzeit", () => {
    const r = terminSchema.safeParse({ betreuungId: "6f1c5a43-0d5e-4a3b-9b4e-1f2a3b4c5d6e", zeit: "fix", dauerMin: 45, typ: "wochenbett" });
    expect(r.success).toBe(false);
  });
});

describe("wegegeldAufteilen", () => {
  const regel: WegegeldRegel = { gpos_einzeln: "50100", gpos_anteilig: "50200", satz_je_km: 0.97, max_km_regel: 25, max_km_mit_begruendung: 50, hin_und_rueckweg: true };

  it("ein Besuch: Hin- und Rückweg mit 50100", () => {
    const [z] = wegegeldAufteilen(16_400, [{ id: "a", direktMeter: 8_200 }], regel);
    expect(z).toMatchObject({ gpos: "50100", km: 16.4, anzahl: 1, betrag: 15.91 });
  });

  it("mehrere Besuche auf einem Weg: Gesamtstrecke geteilt, 50200 mit Anzahl", () => {
    const z = wegegeldAufteilen(31_000, [{ id: "a", direktMeter: 8_000 }, { id: "b", direktMeter: 12_000 }, { id: "c", direktMeter: 10_000 }], regel);
    expect(z.map((x) => x.gpos)).toEqual(["50200", "50200", "50200"]);
    expect(z.map((x) => x.km)).toEqual([10.3, 10.3, 10.3]);
    expect(z[0]!.anzahl).toBe(3);
  });

  it("über 25 km ohne Begründung: gekürzt mit Hinweis", () => {
    const [z] = wegegeldAufteilen(64_000, [{ id: "a", direktMeter: 32_000 }], regel);
    expect(z!.km).toBe(50);
    expect(z!.hinweise[0]!.text).toMatch(/nur mit Begründung/);
  });

  it("über 25 km mit Begründung: bis 50 km", () => {
    const [z] = wegegeldAufteilen(64_000, [{ id: "a", direktMeter: 32_000, begruendung: "Vertretung für Johanna Mede" }], regel);
    expect(z!.km).toBe(64);
    expect(z!.hinweise[0]!.text).toMatch(/Vertretung/);
  });

  it("nur Hinweg, wenn so im Regelwerk eingestellt", () => {
    const [z] = wegegeldAufteilen(30_000, [{ id: "a", direktMeter: 30_000 }], { ...regel, hin_und_rueckweg: false });
    expect(z!.km).toBe(25);
  });
});

describe("abschnittArt", () => {
  it("ordnet Abschnitte zu", () => {
    expect(abschnittArt({ typ: "privat" }, { typ: "besuch" })).toBe("dienstlich");
    expect(abschnittArt({ typ: "besuch" }, { typ: "schule" })).toBe("privat");
    expect(abschnittArt({ typ: "privat" }, { typ: "praxis" })).toBe("wohnung_betrieb");
    expect(abschnittArt({ typ: "besuch" }, { typ: "privat" })).toBe("dienstlich");
  });
});
