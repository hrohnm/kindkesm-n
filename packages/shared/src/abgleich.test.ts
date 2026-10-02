import { describe, expect, it } from "vitest";
import { zusammenfuehren } from "./abgleich";

const basis = {
  datum: "2026-10-02",
  von: "09:00",
  bis: "09:40",
  typ: "wochenbett",
  art: 1,
  material: [],
  unterschrift: { art: "keine" },
  dokumentation: { mutter: { lochien: "rubra", puls: "72" }, kinder: { k1: { gewicht: "3400" } }, notiz: "" },
};

describe("zusammenfuehren", () => {
  it("übernimmt Änderungen verschiedener Felder von beiden Seiten", () => {
    const mein = { ...basis, bis: "09:50", dokumentation: { ...basis.dokumentation, kinder: { k1: { gewicht: "3450" } } }, abschliessen: false };
    const server = { ...basis, status: "entwurf", dokumentation: { ...basis.dokumentation, mutter: { lochien: "serosa", puls: 72 } } };
    const z = zusammenfuehren(basis, mein, server);
    expect(z.konflikte).toEqual([]);
    expect(z.body.bis).toBe("09:50");
    const d = z.body.dokumentation as { mutter: Record<string, string>; kinder: Record<string, Record<string, string>> };
    expect(d.mutter.lochien).toBe("serosa");
    expect(d.mutter.puls).toBe("72"); // Zahl und Text gelten als gleich
    expect(d.kinder.k1!.gewicht).toBe("3450");
  });

  it("meldet echte Konflikte und behält vorerst die eigene Fassung", () => {
    const mein = { ...basis, dokumentation: { ...basis.dokumentation, mutter: { lochien: "fusca", puls: "72" } } };
    const server = { ...basis, dokumentation: { ...basis.dokumentation, mutter: { lochien: "serosa", puls: "72" } } };
    const z = zusammenfuehren(basis, mein, server);
    expect(z.konflikte).toEqual([{ feld: "mutter.lochien", mein: "fusca", anderes: "serosa" }]);
    expect((z.body.dokumentation as { mutter: Record<string, string> }).mutter.lochien).toBe("fusca");
  });

  it("vergleicht Objekte unabhängig von der Reihenfolge der Schlüssel und übernimmt den Abschluss", () => {
    const u = { art: "papier", zeitpunkt: "2026-10-02T09:41:00.000Z" };
    const mein = { ...basis, unterschrift: u, abschliessen: false };
    const server = { ...basis, unterschrift: { zeitpunkt: u.zeitpunkt, art: "papier" }, status: "abgeschlossen" };
    const z = zusammenfuehren(basis, mein, server);
    expect(z.konflikte).toEqual([]);
    expect(z.body.abschliessen).toBe(true);
  });

  it("ohne Ausgangsfassung ist jede Abweichung ein Konflikt", () => {
    const z = zusammenfuehren(null, { ...basis, bis: "10:00" }, { ...basis, bis: "09:45" });
    expect(z.konflikte.map((k) => k.feld)).toEqual(["bis"]);
  });
});
