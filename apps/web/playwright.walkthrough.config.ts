import { defineConfig, devices } from "@playwright/test";

// Walkthrough-Durchlauf (docs/WALKTHROUGHS.md) gegen eine laufende Demo-Instanz mit frisch zurückgesetzten Daten.
// Ergebnisse: walkthrough-ergebnis.json, Screenshots: docs/walkthrough-protokoll/bilder.
export default defineConfig({
  testDir: "walkthrough",
  outputDir: "test-results/walkthrough",
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  reporter: [["line"], ["json", { outputFile: "test-results/walkthrough-ergebnis.json" }]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    launchOptions: process.env.CHROMIUM_PFAD ? { executablePath: process.env.CHROMIUM_PFAD } : {},
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: "ipad-quer", use: { ...devices["Desktop Chrome"], viewport: { width: 1180, height: 820 }, hasTouch: true } },
    { name: "handy", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
});
