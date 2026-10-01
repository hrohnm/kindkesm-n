import { defineConfig, devices } from "@playwright/test";

// Rundgang gegen eine laufende Instanz mit Demo-Daten (Standard: lokal gebauter Server auf Port 3000).
export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    launchOptions: process.env.CHROMIUM_PFAD ? { executablePath: process.env.CHROMIUM_PFAD } : {},
    locale: "de-DE",
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: "ipad-quer", use: { ...devices["Desktop Chrome"], viewport: { width: 1180, height: 820 }, hasTouch: true } },
    { name: "handy", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
});
