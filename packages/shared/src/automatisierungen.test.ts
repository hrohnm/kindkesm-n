import { describe, expect, it } from "vitest";
import { etBald, rueckbildungAnbieten, uUntersuchungFaellig } from "./automatisierungen";

describe("Automatisierungen", () => {
  it("erkennt einen ET in den nächsten zwei Wochen", () => {
    expect(etBald("2026-10-20", "2026-10-07")).toEqual({ tage: 13 });
    expect(etBald("2026-10-07", "2026-10-07")).toEqual({ tage: 0 });
    expect(etBald("2026-10-22", "2026-10-07")).toBeNull();
    expect(etBald("2026-10-06", "2026-10-07")).toBeNull();
    expect(etBald(null, "2026-10-07")).toBeNull();
  });

  it("schlägt den Rückbildungskurs in der 8. bis 10. Lebenswoche vor", () => {
    expect(rueckbildungAnbieten("2026-08-19", "2026-10-07")).toEqual({ woche: 8 }); // 49 Tage
    expect(rueckbildungAnbieten("2026-08-20", "2026-10-07")).toBeNull(); // 48 Tage
    expect(rueckbildungAnbieten("2026-07-30", "2026-10-07")).toEqual({ woche: 10 }); // 69 Tage
    expect(rueckbildungAnbieten("2026-07-29", "2026-10-07")).toBeNull();
  });

  it("findet die anstehende U-Untersuchung", () => {
    expect(uUntersuchungFaellig("2026-10-05", "2026-10-07")?.id).toBe("U2"); // 3. Lebenstag
    expect(uUntersuchungFaellig("2026-10-06", "2026-10-07")).toBeNull(); // 2. Lebenstag
    expect(uUntersuchungFaellig("2026-09-10", "2026-10-07")?.id).toBe("U3"); // 28. Lebenstag
    expect(uUntersuchungFaellig("2026-08-01", "2026-10-07")?.id).toBe("U4"); // 68. Lebenstag
    expect(uUntersuchungFaellig("2026-09-20", "2026-10-07")).toBeNull(); // 18. Lebenstag
  });
});
