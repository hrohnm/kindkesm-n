import { describe, expect, it } from "vitest";
import { imZeitfenster, nameTeilen, oeffentlicherRueckrufSchema } from "./rueckruf";

describe("Rückrufwunsch", () => {
  const gueltig = { name: "Hannah Beispiel", telefon: "0381 123 456", einwilligung: true };

  it("prüft Telefonnummer, Einwilligung und Honigtopf", () => {
    expect(oeffentlicherRueckrufSchema.safeParse(gueltig).success).toBe(true);
    expect(oeffentlicherRueckrufSchema.parse(gueltig)).toMatchObject({ anliegen: "sonstiges", zeitfenster: "egal", hebamme: null, nachricht: null });
    expect(oeffentlicherRueckrufSchema.safeParse({ ...gueltig, telefon: "abc" }).success).toBe(false);
    expect(oeffentlicherRueckrufSchema.safeParse({ ...gueltig, telefon: "12 34" }).success).toBe(false);
    expect(oeffentlicherRueckrufSchema.safeParse({ ...gueltig, telefon: "+49 (0)381/123-456" }).success).toBe(true);
    expect(oeffentlicherRueckrufSchema.safeParse({ ...gueltig, einwilligung: false }).success).toBe(false);
    expect(oeffentlicherRueckrufSchema.safeParse({ ...gueltig, webseite: "spam" }).success).toBe(false);
    expect(oeffentlicherRueckrufSchema.parse({ ...gueltig, hebamme: "  ", nachricht: "" })).toMatchObject({ hebamme: null, nachricht: null });
  });

  it("erkennt das Zeitfenster nur werktags", () => {
    const montag = (h: number) => new Date(2026, 9, 5, h, 30);
    expect(imZeitfenster("vormittag", montag(9))).toBe(true);
    expect(imZeitfenster("vormittag", montag(13))).toBe(false);
    expect(imZeitfenster("mittag", montag(13))).toBe(true);
    expect(imZeitfenster("nachmittag", montag(17))).toBe(true);
    expect(imZeitfenster("egal", montag(19))).toBe(false);
    expect(imZeitfenster("egal", new Date(2026, 9, 4, 10))).toBe(false); // Sonntag
  });

  it("teilt Namen in Vor- und Nachname", () => {
    expect(nameTeilen("Anna Maria Muster")).toEqual({ vorname: "Anna Maria", nachname: "Muster" });
    expect(nameTeilen("Ronja")).toEqual({ vorname: "Ronja", nachname: "" });
  });
});
