import { describe, expect, it } from "vitest";
import { abrechnungsfristen, isoDatum, naechsterVersandtermin } from "./fristen";
import { abrechnungseinstellungSchema, ikSchema } from "./einstellungen";

describe("naechsterVersandtermin", () => {
  it("monatlich: heute, wenn heute Stichtag ist", () => {
    expect(isoDatum(naechsterVersandtermin(new Date(2026, 9, 15), "monatlich", 15))).toBe("2026-10-15");
  });
  it("monatlich: nächster Monat, wenn Stichtag vorbei", () => {
    expect(isoDatum(naechsterVersandtermin(new Date(2026, 9, 16), "monatlich", 15))).toBe("2026-11-15");
  });
  it("quartalsweise: Januar, April, Juli, Oktober", () => {
    expect(isoDatum(naechsterVersandtermin(new Date(2026, 9, 2), "quartalsweise", 1))).toBe("2027-01-01");
  });
  it("halbjährlich über den Jahreswechsel", () => {
    expect(isoDatum(naechsterVersandtermin(new Date(2026, 7, 1), "halbjaehrlich", 5))).toBe("2027-01-05");
  });
});

describe("abrechnungsfristen", () => {
  it("meldet die Ausschlussfrist ab 01.04. und wird im Juni dringend", () => {
    const april = abrechnungsfristen(new Date(2026, 3, 1));
    expect(april.find((h) => h.id === "ausschlussfrist")?.stufe).toBe("info");
    const juni = abrechnungsfristen(new Date(2026, 5, 20));
    expect(juni.find((h) => h.id === "ausschlussfrist")?.stufe).toBe("dringend");
  });
  it("meldet keine Ausschlussfrist im Oktober", () => {
    expect(abrechnungsfristen(new Date(2026, 9, 1)).some((h) => h.id === "ausschlussfrist")).toBe(false);
  });
  it("enthält den persönlichen Versandtermin", () => {
    const h = abrechnungsfristen(new Date(2026, 9, 1), { rhythmus: "monatlich", versandTag: 2, vorlaufTage: 2 });
    expect(h.find((x) => x.id === "versand")).toMatchObject({ datum: "2026-10-02", stufe: "warnung" });
  });
});

describe("Validierung", () => {
  it("prüft das IK-Format", () => {
    expect(ikSchema.safeParse("451234567").success).toBe(true);
    expect(ikSchema.safeParse("123456789").success).toBe(false);
  });
  it("verlangt den Namen bei anderer Abrechnungsstelle", () => {
    const basis = { abrechnungsstelleAnschrift: null, belegart: "durchschreibesatz", unterschrift: "papier", versandRhythmus: "monatlich", versandTag: 1, erinnerungVorlaufTage: 2 } as const;
    expect(abrechnungseinstellungSchema.safeParse({ ...basis, weg: "andere_abrechnungsstelle", abrechnungsstelleName: null }).success).toBe(false);
    expect(abrechnungseinstellungSchema.safeParse({ ...basis, weg: "hebset", abrechnungsstelleName: null }).success).toBe(true);
  });
});
