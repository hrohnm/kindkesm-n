import { describe, expect, it } from "vitest";
import {
  abwesendeTage,
  belegungsplan,
  effektiveKapazitaet,
  luftlinieKm,
  monate,
  monatsGrenzen,
  oeffentlicheAnfrageSchema,
  oeffentlicheKapazitaet,
  vorschlagen,
  type HebammeKapazitaet,
} from "./anfrage";

const h = (id: string, teil: Partial<HebammeKapazitaet> = {}): HebammeKapazitaet => ({
  id,
  name: id,
  kuerzel: id.slice(0, 2).toUpperCase(),
  status: "aktiv",
  babypauseBis: null,
  wochenbettenProMonat: 4,
  abwesenheiten: [],
  ...teil,
});

describe("Monate", () => {
  it("Grenzen und Folgen über den Jahreswechsel", () => {
    expect(monatsGrenzen("2027-02")).toEqual(["2027-02-01", "2027-02-28"]);
    expect(monatsGrenzen("2028-02")[1]).toBe("2028-02-29");
    expect(monate("2026-11", 3)).toEqual(["2026-11", "2026-12", "2027-01"]);
  });
});

describe("Kapazität", () => {
  it("Urlaub kürzt anteilig, Babypause bis Monatsmitte halbiert", () => {
    expect(effektiveKapazitaet(h("a"), "2027-03")).toBe(4);
    // 15 von 31 Tagen Urlaub → 4 × 16/31 ≈ 2
    expect(effektiveKapazitaet(h("a", { abwesenheiten: [{ von: "2027-03-01", bis: "2027-03-15" }] }), "2027-03")).toBe(2);
    expect(effektiveKapazitaet(h("b", { status: "babypause", babypauseBis: "2027-03-15" }), "2027-03")).toBe(2);
    expect(effektiveKapazitaet(h("b", { status: "babypause", babypauseBis: "2027-02-28" }), "2027-03")).toBe(4);
    expect(effektiveKapazitaet(h("b", { status: "babypause", babypauseBis: null }), "2027-03")).toBe(0);
    expect(effektiveKapazitaet(h("c", { status: "ausgeschieden" }), "2027-03")).toBe(0);
  });
  it("zählt überlappende Abwesenheiten nur einmal", () => {
    const x = h("a", { status: "babypause", babypauseBis: "2027-03-10", abwesenheiten: [{ von: "2027-03-05", bis: "2027-03-12" }] });
    expect(abwesendeTage(x, "2027-03")).toBe(12);
  });
});

describe("Belegungsplan", () => {
  const hebammen = [h("marielena"), h("johanna", { wochenbettenProMonat: 3 }), h("lorina", { status: "babypause", babypauseBis: "2027-02-28" })];
  const betreuungen = [
    { hebammeId: "marielena", datum: "2027-01-05" },
    { hebammeId: "marielena", datum: "2027-01-20" },
    { hebammeId: "marielena", datum: "2027-01-28" },
    { hebammeId: "johanna", datum: "2027-01-11" },
    { hebammeId: "johanna", datum: "2027-01-12" },
    { hebammeId: "johanna", datum: "2027-01-30" },
    { hebammeId: null, datum: "2027-01-02" },
  ];
  const plan = belegungsplan(hebammen, betreuungen, [{ et: "2027-01-15" }, { et: "2027-03-01" }], "2027-01", 3);

  it("zählt Betreuungen je Hebamme im ET-Monat", () => {
    const jan = plan[0]!;
    expect(jan.je.map((z) => [z.hebammeId, z.belegt, z.kapazitaet, z.stufe])).toEqual([
      ["marielena", 3, 4, "knapp"],
      ["johanna", 3, 3, "voll"],
      ["lorina", 0, 0, "abwesend"],
    ]);
    expect(jan.gesamt).toEqual({ belegt: 6, kapazitaet: 7, frei: 1, stufe: "knapp" });
    expect(jan.offen).toBe(1);
  });
  it("Lorina ist ab März wieder eingeplant", () => {
    expect(plan[2]!.je.find((z) => z.hebammeId === "lorina")).toMatchObject({ kapazitaet: 4, stufe: "frei" });
    expect(plan[2]!.gesamt.stufe).toBe("frei");
  });
  it("öffentliche Ampel ohne Zahlen", () => {
    const voll = belegungsplan([h("x", { wochenbettenProMonat: 1 })], [{ hebammeId: "x", datum: "2027-01-03" }], [], "2027-01", 1);
    expect(oeffentlicheKapazitaet(voll)).toEqual([{ monat: "2027-01", name: "Januar 2027", stufe: "ausgebucht" }]);
    expect(Object.keys(oeffentlicheKapazitaet(plan)[0]!)).toEqual(["monat", "name", "stufe"]);
  });
});

describe("Vorschlag", () => {
  const badDoberan = { lat: 54.1088, lon: 11.8924 };
  const kroepelin = { lat: 54.0697, lon: 11.7952 };
  const rostock = { lat: 54.0924, lon: 12.0991 };
  it("berechnet die Luftlinie", () => {
    expect(Math.round(luftlinieKm(badDoberan, rostock))).toBe(14);
  });
  it("bevorzugt freie Kapazität und kurze Wege, meidet Abwesenheit am ET", () => {
    const hebammen = [
      h("nah-voll", { wochenbettenProMonat: 1 }),
      h("weit-frei"),
      h("urlaub", { abwesenheiten: [{ von: "2027-05-10", bis: "2027-05-24" }] }),
      h("babypause", { status: "babypause", babypauseBis: null }),
    ];
    const plan = belegungsplan(hebammen, [{ hebammeId: "nah-voll", datum: "2027-05-02" }], [], "2027-05", 1);
    const v = vorschlagen({ et: "2027-05-20", position: kroepelin }, hebammen, plan, { "nah-voll": kroepelin, "weit-frei": rostock, urlaub: kroepelin, babypause: kroepelin });
    expect(v.map((x) => x.hebammeId)).toEqual(["weit-frei", "urlaub", "nah-voll", "babypause"]);
    expect(v[0]!.gruende[0]).toBe("4 von 4 Plätzen frei im ET-Monat");
    expect(v[1]!.abwesendUmEt).toBe(true);
    expect(v[3]!.gruende).toContain("in Babypause");
  });
});

describe("Öffentliche Anfrage", () => {
  const gueltig = { vorname: "Lea", nachname: "Muster", email: "lea@example.org", et: "2027-04-01", ort: "Kröpelin", einwilligung: true };
  it("verlangt Einwilligung und einen Kontaktweg", () => {
    expect(oeffentlicheAnfrageSchema.safeParse(gueltig).success).toBe(true);
    expect(oeffentlicheAnfrageSchema.safeParse({ ...gueltig, einwilligung: false }).success).toBe(false);
    expect(oeffentlicheAnfrageSchema.safeParse({ ...gueltig, email: "" }).success).toBe(false);
    expect(oeffentlicheAnfrageSchema.safeParse({ ...gueltig, email: "", telefon: "0170 1" }).success).toBe(true);
    expect(oeffentlicheAnfrageSchema.safeParse({ ...gueltig, webseite: "spam" }).success).toBe(false);
    expect(oeffentlicheAnfrageSchema.safeParse({ ...gueltig, leistungen: ["wochenbett", "zaubern"] }).success).toBe(false);
  });
});
