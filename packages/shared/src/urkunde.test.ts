import { describe, expect, it } from "vitest";
import { URKUNDE_TEXTE, datumLang, nurWochenwerte, sternzeichen, urkundeText, urkundeZeilenVorschlag } from "./urkunde";

describe("Kinderurkunde", () => {
  it("setzt Platzhalter ein und lässt fehlende Angaben weg", () => {
    const warm = URKUNDE_TEXTE.find((t) => t.id === "warm")!.text;
    const t = urkundeText(warm, { vorname: "Ole", geburtsdatum: "2026-09-20", geburtszeit: "04:12", ort: "Rostock", hebamme: "Marielena", geschlecht: "maennlich" });
    expect(t.startsWith("Lieber Ole,")).toBe(true);
    expect(t).toContain("am 20. September 2026 um 04:12 Uhr bist du in Rostock auf die Welt");
    expect(t).toContain("Deine Hebamme Marielena");
    const ohne = urkundeText(warm, { vorname: "Ole", geburtsdatum: "2026-09-20", hebamme: "Marielena" });
    expect(ohne).toContain("am 20. September 2026 bist du auf die Welt");
    const mehr = urkundeText(URKUNDE_TEXTE.find((x) => x.id === "mehrlinge")!.text, { vorname: "Paul", geburtsdatum: "2026-09-01", hebamme: "M", geschwister: ["Emma"] });
    expect(mehr).toContain("gemeinsam mit Emma");
  });

  it("Datum und Sternzeichen", () => {
    expect(datumLang("2026-03-05")).toBe("5. März 2026");
    expect(sternzeichen("2026-09-20")).toBe("Jungfrau");
    expect(sternzeichen("2026-09-23")).toBe("Waage");
    expect(sternzeichen("2026-01-10")).toBe("Steinbock");
    expect(sternzeichen("2026-12-24")).toBe("Steinbock");
    expect(sternzeichen("2026-01-25")).toBe("Wassermann");
  });

  it("baut die Tabelle aus der Hebammenzeit mit Geburt, Wiedererreichen und Abschluss", () => {
    const z = urkundeZeilenVorschlag(
      { datum: "2026-09-20", gewicht: 3480, laenge: 52, kopfumfang: 35 },
      [
        { datum: "2026-09-23", gewicht: 3290 },
        { datum: "2026-09-30", gewicht: 3510 },
        { datum: "2026-09-30", laenge: 53 },
        { datum: "2026-11-08", gewicht: 4720, laenge: 56, kopfumfang: 38 },
      ],
      "2026-11-08",
    );
    expect(z.map((x) => x.lebenstag)).toEqual([1, 4, 11, 50]);
    expect(z[0]!.besonderes).toBe("Geburt");
    expect(z[2]).toMatchObject({ gewicht: 3510, laenge: 53, besonderes: "Geburtsgewicht wieder erreicht" });
    expect(z[3]!.besonderes).toBe("Abschluss");
    // Wochenwerte: Geburt + besondere Zeilen + letzter Wert je Woche
    expect(nurWochenwerte([...z.slice(0, 2), { datum: "2026-09-25", lebenstag: 6, gewicht: 3300 }]).map((x) => x.lebenstag)).toEqual([1, 6]);
  });
});
