import { describe, expect, it } from "vitest";
import { ansichtVervollstaendigen, gewichtFuerPerzentile, gewichtsverlauf, perzentileFuerGewicht, standardAnsicht } from "./doku";

describe("WHO-Perzentile Gewicht", () => {
  it("Median am Geburtstag entspricht der WHO-Tabelle", () => {
    expect(gewichtFuerPerzentile(0, 50, "maennlich")).toBeCloseTo(3346.4, 0);
    expect(gewichtFuerPerzentile(0, 50, "weiblich")).toBeCloseTo(3232.2, 0);
  });
  it("P3 und P97 am Geburtstag (Jungen) passen zu den WHO-Perzentiltabellen", () => {
    // WHO: Jungen Tag 0 P3 = 2,5 kg, P97 = 4,3 kg (gerundet)
    expect(gewichtFuerPerzentile(0, 3, "maennlich") / 1000).toBeCloseTo(2.5, 1);
    expect(gewichtFuerPerzentile(0, 97, "maennlich") / 1000).toBeCloseTo(4.3, 1);
  });
  it("Perzentile und Gewicht sind zueinander umkehrbar", () => {
    const g = gewichtFuerPerzentile(30, 25, "weiblich");
    expect(perzentileFuerGewicht(30, g, "weiblich")).toBeCloseTo(25, 1);
  });
});

describe("gewichtsverlauf", () => {
  it("rechnet Lebenstag, Zunahme pro Tag und Prozent zum Geburtsgewicht", () => {
    const v = gewichtsverlauf("2026-09-01", [
      { datum: "2026-09-04", gramm: 3200, quelle: "besuch" },
      { datum: "2026-09-01", gramm: 3500, quelle: "geburt" },
      { datum: "2026-09-08", gramm: 3400, quelle: "besuch" },
    ]);
    expect(v.map((x) => x.lebenstag)).toEqual([0, 3, 7]);
    expect(v[1]!.prozentGeburt).toBeCloseTo(-8.57, 1);
    expect(v[2]!.grammProTag).toBe(50);
  });
});

describe("Ansicht", () => {
  it("ergänzt fehlende Felder mit Standardwerten", () => {
    const a = ansichtVervollstaendigen({ mutter: { puls: { sichtbar: false, vergleich: false } } });
    expect(a.mutter.puls).toEqual({ sichtbar: false, vergleich: false });
    expect(a.mutter.rrSys).toEqual(standardAnsicht().mutter.rrSys);
    expect(a.kind.gewicht!.vergleich).toBe(true);
  });
});
