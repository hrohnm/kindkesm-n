import { expect, test } from "@playwright/test";

const SCREENSHOTS = process.env.SCREENSHOT_ORDNER;

/** M1/M7: Warnung „Ärztliche Anordnung fehlt“ im Cockpit, Vermerk im Besuch; laufende Besuchsdauer. */
test("Anordnung vermerken und laufende Besuchsdauer", async ({ page }, info) => {
  test.skip(info.project.name !== "ipad-quer", "ändert gemeinsame Daten – ein Durchlauf genügt");
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("johanna@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: /Johanna/ })).toBeVisible();

  // Demo: ein Besuch bei Sophie Berger ist länger als abrechenbar → Anordnung nötig
  const hinweis = page.getByRole("link", { name: /Ärztliche Anordnung fehlt: Sophie Berger/ });
  await expect(hinweis).toBeVisible();
  if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/${info.project.name}-warnungen.png`, fullPage: true });
  await hinweis.click();
  await expect(page).toHaveURL(/\/besuche\/[0-9a-f-]{36}$/);
  const haken = page.getByLabel("Ärztliche Anordnung liegt vor");
  await expect(haken).toBeVisible();
  await haken.check();
  await page.getByLabel("Notiz zur Anordnung").fill("Dr. Muster, Frauenarztpraxis");
  await page.getByLabel("Notiz zur Anordnung").blur();
  await expect(page.getByText("Gespeichert", { exact: true })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Johanna/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ärztliche Anordnung fehlt: Sophie Berger/ })).toHaveCount(0);

  // Neuer Besuch: Beginn ist gesetzt, Ende noch leer → laufende Dauer
  await page.goto("/klientinnen");
  await page.getByRole("link", { name: /Krüger/ }).first().click();
  await page.getByRole("link", { name: "Besuch dokumentieren" }).first().click();
  await expect(page.getByTestId("laufzeit")).toContainText(/Besuch läuft seit \d+ Min\./);
  await page.getByRole("button", { name: "Stopp" }).click();
  await expect(page.getByTestId("laufzeit")).toHaveCount(0);
});
