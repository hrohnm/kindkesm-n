import { describe, expect, it } from "vitest";
import { aufgabeSchema, aufgabeStufe, nachrichtSchema } from "./team";

describe("Team-Nachrichten und Aufgaben", () => {
  it("prüft Eingaben", () => {
    expect(nachrichtSchema.safeParse({ text: "  " }).success).toBe(false);
    expect(nachrichtSchema.parse({ text: "Hallo", anId: "" })).toEqual({ text: "Hallo", anId: null, klientinId: null });
    expect(aufgabeSchema.parse({ titel: "Anordnung holen", faelligAm: "" })).toMatchObject({ titel: "Anordnung holen", faelligAm: null, zustaendigId: null });
    expect(aufgabeSchema.safeParse({ titel: "x", faelligAm: "morgen" }).success).toBe(false);
  });

  it("stuft Fälligkeiten ein", () => {
    expect(aufgabeStufe(null, "2026-10-07")).toBeNull();
    expect(aufgabeStufe("2026-10-06", "2026-10-07")).toBe("dringend");
    expect(aufgabeStufe("2026-10-07", "2026-10-07")).toBe("warnung");
    expect(aufgabeStufe("2026-10-08", "2026-10-07")).toBe("warnung");
    expect(aufgabeStufe("2026-10-09", "2026-10-07")).toBeNull();
  });
});
