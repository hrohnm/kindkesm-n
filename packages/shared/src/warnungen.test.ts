import { describe, expect, it } from "vitest";
import { anordnungNoetig, gewichtWarnung, kontingentWarnung, letztesGewicht } from "./warnungen";

describe("Warnungen", () => {
  it("bewertet die Gewichtsabnahme vom Geburtsgewicht", () => {
    expect(gewichtWarnung(3500, 3300)).toBeNull(); // 5,7 %
    expect(gewichtWarnung(3500, 3240)).toMatchObject({ stufe: "info" }); // 7,4 %
    expect(gewichtWarnung(3500, 3150)?.stufe).toBe("warnung"); // 10 %
    expect(gewichtWarnung(3500, 3150)?.abnahme).toBeCloseTo(10);
    expect(gewichtWarnung(null, 3000)).toBeNull();
    expect(gewichtWarnung(3500, 3700)).toBeNull();
  });

  it("findet das letzte dokumentierte Gewicht je Kind", () => {
    const besuche = [
      { datum: "2026-10-01", dokumentation: { kinder: { k1: { gewicht: "3300" } } } },
      { datum: "2026-10-03", dokumentation: { kinder: { k1: { gewicht: "3180,5" }, k2: { gewicht: "2900" } } } },
      { datum: "2026-10-04", dokumentation: { kinder: { k1: { temperatur: "37,0" } } } },
    ];
    expect(letztesGewicht(besuche, "k1")).toEqual({ datum: "2026-10-03", gramm: 3180.5 });
    expect(letztesGewicht(besuche, "k3")).toBeNull();
  });

  it("meldet fast ausgeschöpfte und ausgeschöpfte Kontingente", () => {
    expect(kontingentWarnung({ id: "301", name: "Frühes Wochenbett", genutzt: 17, maximum: 20, einheit: "Kontakte" })).toBeNull();
    expect(kontingentWarnung({ id: "301", name: "Frühes Wochenbett", genutzt: 18, maximum: 20, einheit: "Kontakte" })).toMatchObject({ stufe: "info", rest: 2 });
    expect(kontingentWarnung({ id: "301", name: "Frühes Wochenbett", genutzt: 20, maximum: 20, einheit: "Kontakte" })?.stufe).toBe("warnung");
    expect(kontingentWarnung({ id: "401", name: "Geburtsvorbereitung", genutzt: 780, maximum: 840, einheit: "Minuten" })?.rest).toBe(60);
    expect(kontingentWarnung({ id: "401", name: "Geburtsvorbereitung", genutzt: 700, maximum: 840, einheit: "Minuten" })).toBeNull();
    // kleine Kontingente erst, wenn sie aufgebraucht sind; ungenutzte nie
    expect(kontingentWarnung({ id: "103", name: "Aufklärungsgespräch", genutzt: 0, maximum: 2, einheit: "Kontakte" })).toBeNull();
    expect(kontingentWarnung({ id: "103", name: "Aufklärungsgespräch", genutzt: 1, maximum: 2, einheit: "Kontakte" })).toBeNull();
    expect(kontingentWarnung({ id: "103", name: "Aufklärungsgespräch", genutzt: 2, maximum: 2, einheit: "Kontakte" })?.stufe).toBe("warnung");
  });

  it("erkennt Hinweise auf eine nötige ärztliche Anordnung", () => {
    expect(anordnungNoetig([{ stufe: "warnung", text: "Kontingent erreicht. Weitere Leistungen nur mit ärztlicher Anordnung." }])).toBe(true);
    expect(anordnungNoetig([{ stufe: "info", text: "nur mit ärztlicher Anordnung" }, { stufe: "warnung", text: "Zuschlag Nacht" }])).toBe(false);
  });
});
