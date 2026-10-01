/**
 * Prüft die Anbindung an einen echten OSRM-Server. Läuft nur, wenn OSRM_TEST_URL gesetzt ist
 * (z. B. lokal mit einem kleinen Testnetz, siehe docs/ENTWICKLUNG.md).
 */
import { describe, expect, it } from "vitest";
import { osrm, routingFuer } from "../src/geo/routing";

const url = process.env.OSRM_TEST_URL;

describe.skipIf(!url)("OSRM", () => {
  const punkte = [
    { lat: 54.0695, lon: 11.7948 },
    { lat: 54.0989, lon: 11.9162 },
    { lat: 54.1043, lon: 11.9105 },
  ];
  it("liefert Matrix und Strecke", async () => {
    const r = osrm(url!);
    const m = await r.matrix(punkte);
    expect(m.quelle).toBe("osrm");
    expect(m.meter[0]![1]).toBeGreaterThan(8000);
    expect(m.sek[0]![1]).toBeGreaterThan(60);
    const s = await r.strecke(punkte);
    expect(s.abschnitte).toHaveLength(2);
    expect(s.meter).toBe(s.abschnitte[0]!.meter + s.abschnitte[1]!.meter);
    expect(s.geometrie.length).toBeGreaterThan(2);
    expect(s.geometrie[0]![0]).toBeGreaterThan(54); // [lat, lon]
  });
  it("fällt bei Ausfall auf die Luftlinie zurück", async () => {
    const r = routingFuer("http://127.0.0.1:9", () => {});
    expect((await r.matrix(punkte)).quelle).toBe("luftlinie");
  });
});
