import { describe, expect, it } from "vitest";
import { istSectio } from "./akte";
import { mehrfachText, mehrfachWerte, ansichtVervollstaendigen, gewichtFuerPerzentile, gewichtsverlauf, messverlauf, perzentileFuerGewicht, perzentileFuerWert, standardAnsicht, wertFuerPerzentile } from "./doku";

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

describe("WHO-Perzentile Länge und Kopfumfang", () => {
  it("Median am Geburtstag entspricht der WHO-Tabelle", () => {
    expect(wertFuerPerzentile("laenge", 0, 50, "maennlich")).toBeCloseTo(49.88, 1);
    expect(wertFuerPerzentile("laenge", 0, 50, "weiblich")).toBeCloseTo(49.15, 1);
    expect(wertFuerPerzentile("kopfumfang", 0, 50, "maennlich")).toBeCloseTo(34.46, 1);
    expect(wertFuerPerzentile("kopfumfang", 365, 50, "weiblich")).toBeCloseTo(44.89, 1);
  });
  it("P3/P97 Länge Jungen am Geburtstag (WHO gerundet 46,3 / 53,4 cm) und Umkehrbarkeit", () => {
    expect(wertFuerPerzentile("laenge", 0, 3, "maennlich")).toBeCloseTo(46.3, 0);
    expect(wertFuerPerzentile("laenge", 0, 97, "maennlich")).toBeCloseTo(53.4, 0);
    expect(perzentileFuerWert("kopfumfang", 60, wertFuerPerzentile("kopfumfang", 60, 85, "weiblich"), "weiblich")).toBeCloseTo(85, 1);
  });
});

describe("messverlauf", () => {
  it("rechnet Lebenstag und Veränderungen", () => {
    const v = messverlauf("2026-09-01", [
      { datum: "2026-09-15", wert: 54, quelle: "besuch" },
      { datum: "2026-09-01", wert: 51.5, quelle: "geburt" },
    ]);
    expect(v.map((x) => x.lebenstag)).toEqual([1, 15]);
    expect(v[1]!.diffGeburt).toBeCloseTo(2.5);
  });
});

describe("gewichtsverlauf", () => {
  it("rechnet Lebenstag, Zunahme pro Tag und Prozent zum Geburtsgewicht", () => {
    const v = gewichtsverlauf("2026-09-01", [
      { datum: "2026-09-04", gramm: 3200, quelle: "besuch" },
      { datum: "2026-09-01", gramm: 3500, quelle: "geburt" },
      { datum: "2026-09-08", gramm: 3400, quelle: "besuch" },
    ]);
    expect(v.map((x) => x.lebenstag)).toEqual([1, 4, 8]);
    expect(v.map((x) => x.alterTage)).toEqual([0, 3, 7]);
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

describe("Mehrfachauswahl und Kaiserschnitt", () => {
  it("zerlegt und verbindet Mehrfachwerte", () => {
    expect(mehrfachWerte("gefüllt, wunde Mamillen")).toEqual(["gefüllt", "wunde Mamillen"]);
    expect(mehrfachWerte("")).toEqual([]);
    expect(mehrfachText(["reizlos", "Fäden/Klammern liegen"])).toBe("reizlos, Fäden/Klammern liegen");
  });
  it("erkennt Kaiserschnitt auch in älteren Freitexten", () => {
    expect(istSectio("sectio_sekundaer")).toBe(true);
    expect(istSectio("Sectio caesarea")).toBe(true);
    expect(istSectio("spontan")).toBe(false);
    expect(istSectio(null)).toBe(false);
  });
});
