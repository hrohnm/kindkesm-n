import { describe, expect, it } from "vitest";
import { icsErzeugen, initialen, terminZeitraum, uhrzeitPlus } from "./kalender";

describe("Kalender", () => {
  it("rechnet Zeiträume von Terminen", () => {
    expect(uhrzeitPlus("09:30", 45)).toBe("10:15");
    expect(uhrzeitPlus("23:30", 90)).toBe("23:59");
    expect(terminZeitraum({ zeit: "fix", uhrzeit: "09:00", dauerMin: 45 })).toEqual({ von: "09:00", bis: "09:45" });
    expect(terminZeitraum({ zeit: "fenster", fruehestens: "10:00", spaetestens: "12:00", dauerMin: 45 })).toEqual({ von: "10:00", bis: "12:00" });
    expect(terminZeitraum({ zeit: "vormittags", dauerMin: 45 })).toEqual({ von: "08:00", bis: "12:00" });
    expect(terminZeitraum({ zeit: "ganztags", dauerMin: 45 })).toBeNull();
  });

  it("kürzt Namen auf Initialen", () => {
    expect(initialen("Sophie", "Berger")).toBe("S. B.");
    expect(initialen("ömer", "")).toBe("Ö.");
  });

  it("erzeugt gültiges ICS mit Zeitzone, ganztägigen Einträgen und Faltung", () => {
    const ics = icsErzeugen("Kalender Johanna", [
      { uid: "t1", titel: "Hausbesuch S. B.", datum: "2026-10-07", von: "09:00", bis: "09:45" },
      { uid: "a1", titel: "Urlaub, Ostsee; Strand", datum: "2026-10-10", bisDatum: "2026-10-12" },
      { uid: "k1", titel: "Geburtsvorbereitung ".repeat(6), ort: "Praxis", datum: "2026-10-08", von: "18:00", bis: "20:00" },
    ], new Date("2026-10-07T08:00:00Z"));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART;TZID=Europe/Berlin:20261007T090000\r\nDTEND;TZID=Europe/Berlin:20261007T094500");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261010\r\nDTEND;VALUE=DATE:20261013");
    expect(ics).toContain("SUMMARY:Urlaub\\, Ostsee\; Strand");
    expect(ics).toContain("DTSTAMP:20261007T080000Z");
    for (const z of ics.split("\r\n")) expect(new TextEncoder().encode(z).length).toBeLessThanOrEqual(75);
    expect(ics.split("\r\n").some((z) => z.startsWith(" "))).toBe(true);
  });
});
