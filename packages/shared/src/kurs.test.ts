import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { kursAbrechnen, rueckbildungBis } from "./kurs";
import { kontingentStand, type RegelwerkDaten } from "./plausi";

const rw = JSON.parse(readFileSync(new URL("../../../regelwerk/hhv-2026-04-01.json", import.meta.url), "utf8")) as RegelwerkDaten;

describe("Kurseinheiten abrechnen", () => {
  it("Geburtsvorbereitung Gruppe live: 5-Minuten-Einheiten, Formular 3.4 mit Ziffer 2", () => {
    const e = kursAbrechnen({ datum: "2026-10-10", von: "10:00", bis: "12:00", art: "geburtsvorbereitung", einzel: false, format: 2 }, { geburtsdatum: null, frueher: [] }, rw);
    expect(e.stamm).toBe("401");
    expect(e.zeilen).toEqual([expect.objectContaining({ gpos: "40102", menge: 24, betrag: 22.8, zuschlag: false, formular: "3.4" })]);
    expect(e.formularzeile).toEqual({ formular: "3.4", spalte: "Geburtsvorbereitung Gruppe", eintrag: "2" });
    expect(e.hinweise.filter((h) => h.stufe !== "info")).toEqual([]);
  });

  it("begrenzt auf 14 Stunden je Versicherte und höchstens die Hälfte als Selbstlerneinheit", () => {
    const frueher = Array.from({ length: 6 }, () => ({ stamm: "401", art: 2, einheiten: 24 })); // 12 Stunden
    const e = kursAbrechnen({ datum: "2026-10-10", von: "10:00", bis: "13:00", art: "geburtsvorbereitung", einzel: false, format: 2 }, { geburtsdatum: null, frueher }, rw);
    expect(e.einheitenAbrechenbar).toBe(24);
    expect(e.hinweise.some((h) => h.stufe === "warnung" && h.text.includes("14 Stunden"))).toBe(true);
    const selbst = kursAbrechnen(
      { datum: "2026-10-10", von: "00:00", bis: "01:00", art: "geburtsvorbereitung", einzel: false, format: 6 },
      { geburtsdatum: null, frueher: [{ stamm: "401", art: 6, einheiten: 80 }] },
      rw,
    );
    expect(selbst.einheitenAbrechenbar).toBe(4); // 84 Einheiten = 7 Stunden Selbstlern höchstens
    expect(selbst.zeilen[0]!.gpos).toBe("40106");
  });

  it("Geburtsvorbereitung nur vor, Rückbildung nur nach der Geburt bis Ende 9. Monat", () => {
    expect(kursAbrechnen({ datum: "2026-10-10", von: "10:00", bis: "11:00", art: "geburtsvorbereitung", einzel: false, format: 2 }, { geburtsdatum: "2026-10-01", frueher: [] }, rw).zeilen).toEqual([]);
    expect(kursAbrechnen({ datum: "2026-10-10", von: "10:00", bis: "11:00", art: "rueckbildung", einzel: false, format: 2 }, { geburtsdatum: null, frueher: [] }, rw).hinweise[0]!.stufe).toBe("fehler");
    expect(rueckbildungBis("2026-05-31")).toBe("2027-02-28");
    expect(kursAbrechnen({ datum: "2027-03-01", von: "10:00", bis: "11:00", art: "rueckbildung", einzel: false, format: 3 }, { geburtsdatum: "2026-05-31", frueher: [] }, rw).zeilen).toEqual([]);
    const ok = kursAbrechnen({ datum: "2026-12-01", von: "18:00", bis: "19:00", art: "rueckbildung", einzel: true, format: 3 }, { geburtsdatum: "2026-08-01", frueher: [] }, rw);
    expect(ok.zeilen[0]!.gpos).toBe("40403");
    expect(ok.hinweise.some((h) => h.text.includes("Begründung"))).toBe(true);
  });

  it("Kontingentanzeige in Minuten", () => {
    const s = kontingentStand([{ datum: "2026-10-10", von: "10:00", art: 2, stamm: "401", einheiten: 24, material: [] }], rw).find((x) => x.id === "401");
    expect(s).toMatchObject({ genutzt: 120, maximum: 840, einheit: "Minuten" });
  });
});
