import { expect, test } from "@playwright/test";

const SCREENSHOTS = process.env.SCREENSHOT_ORDNER;

test("Tour planen, Besuch einplanen und Fahrtenbuch", async ({ page }, info) => {
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("johanna@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: /Johanna/ })).toBeVisible();

  // Demo-Tour von heute
  await page.getByRole("link", { name: "Tour für heute ›" }).click();
  // Erst warten, bis die Tour-Seite da ist (die Startseite enthält ebenfalls „Tour heute“ und Lena Krüger)
  await expect(page).toHaveURL(/\/tour$/);
  await expect(page.getByRole("heading", { name: "Tour", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lena Krüger" })).toBeVisible();
  // Johannas Tourvorlage: mittwochs Praxistag (Ziel Kita), sonst Schultag (Ziel Schule der Tochter)
  await expect(page.getByText(new Date().getDay() === 3 ? "Ziel: Kita" : "Ziel: Schule der Tochter")).toBeVisible();
  await expect(page.getByText("Strecke", { exact: true })).toBeVisible();
  if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/${info.project.name}-tour.png`, fullPage: true });

  // Für einen anderen Tag (je Gerät ein eigener) einen Besuch einplanen und optimieren
  const d = new Date();
  d.setDate(d.getDate() + (info.project.name === "handy" ? 9 : 8));
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  await page.goto(`/tour/${iso}`);
  await page.getByRole("button", { name: "Besuch einplanen" }).click();
  await page.getByLabel("Familie").selectOption({ label: "Krüger, Lena (Bad Doberan)" });
  await page.getByRole("button", { name: "feste Uhrzeit" }).click();
  await page.getByLabel("Uhrzeit (mit der Familie vereinbart)").fill("10:30");
  await page.getByRole("button", { name: "Termin anlegen" }).click();
  await expect(page.getByText("fest 10:30 Uhr")).toBeVisible();
  await page.getByRole("button", { name: "Route optimieren" }).click();
  await expect(page.getByText("10:30", { exact: true })).toBeVisible();

  // Fahrtenbuch-Eintrag aus der Tour
  await page.getByRole("button", { name: "Ins Fahrtenbuch" }).click();
  await expect(page.getByText("Fahrtenbuch-Eintrag erstellt")).toBeVisible();
  await page.getByRole("link", { name: "Fahrtenbuch öffnen" }).click();
  await expect(page.getByRole("heading", { name: "Fahrtenbuch" })).toBeVisible();
  await expect(page.getByText("Hausbesuche (1)").first()).toBeVisible();
  if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/${info.project.name}-fahrtenbuch.png`, fullPage: true });
});
