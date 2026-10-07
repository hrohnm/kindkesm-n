import { describe, expect, it } from "vitest";
import { dokumentationSchema } from "./akte";
import { epdsAuswerten, epdsLesen, epdsSchreiben } from "./epds";

describe("EPDS", () => {
  it("liest und schreibt die Punktwerte", () => {
    expect(epdsLesen("1,0,2,,3,0,0,1,0,0")).toEqual([1, 0, 2, null, 3, 0, 0, 1, 0, 0]);
    expect(epdsLesen(null)).toEqual(Array(10).fill(null));
    expect(epdsSchreiben([1, 0, 2, null, 3, 0, 0, 1, 0, 0])).toBe("1,0,2,,3,0,0,1,0,0");
    expect(epdsSchreiben(Array(10).fill(null))).toBe("");
  });

  it("bewertet Summe und Frage 10", () => {
    expect(epdsAuswerten(Array(10).fill(null))).toBeNull();
    expect(epdsAuswerten([1, 1, 1, 1, 1, 1, 1, 1, 1, 0])).toMatchObject({ summe: 9, stufe: "unauffaellig", selbstverletzung: false, vollstaendig: true });
    expect(epdsAuswerten([1, 1, 1, 1, 1, 1, 1, 1, 2, 0])?.stufe).toBe("erhoeht");
    expect(epdsAuswerten([2, 2, 2, 2, 1, 1, 1, 1, 1, 0])?.stufe).toBe("auffaellig");
    expect(epdsAuswerten([0, 0, 0, 0, 0, 0, 0, 0, 0, 1])).toMatchObject({ summe: 1, selbstverletzung: true });
    expect(epdsAuswerten([1, null, 0, 0, 0, 0, 0, 0, 0, 0])?.vollstaendig).toBe(false);
  });

  it("prüft das Format in der Dokumentation", () => {
    expect(dokumentationSchema.safeParse({ mutter: { epds: "1,0,2,,3,0,0,1,0,0" } }).success).toBe(true);
    expect(dokumentationSchema.safeParse({ mutter: { epds: "4,0,0,0,0,0,0,0,0,0" } }).success).toBe(false);
    expect(dokumentationSchema.parse({ mutter: {}, beratung: ["Stillen/Anlegen"] }).beratung).toEqual(["Stillen/Anlegen"]);
  });
});
