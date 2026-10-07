import { expect, test } from "@playwright/test";

/** M22: Statistik – Kennzahlen, Diagramm/Tabelle, je Hebamme, eigene Abrechnung. */
test("Statistik ansehen", async ({ page }, info) => {
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("johanna@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: /Johanna/ })).toBeVisible();
  if (info.project.name === "handy") {
    await page.getByRole("link", { name: "Einstellungen" }).click();
    await page.getByRole("link", { name: "Statistik ›" }).click();
  } else {
    await page.getByRole("link", { name: "Statistik" }).click();
  }
  await expect(page.getByRole("heading", { name: "Statistik", level: 1 })).toBeVisible();
  await expect(page.getByTestId("kennzahl")).toHaveCount(8);
  await expect(page.getByTestId("je-hebamme").getByRole("row")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Meine Abrechnung (Kasse)" })).toBeVisible();
  await expect(page.getByTestId("kennzahl").filter({ hasText: "Umsatz Kasse" })).toContainText("€");
  await expect(page.getByTestId("orte").getByRole("listitem").first()).toBeVisible();

  // Diagramm als Tabelle
  const diagramm = page.locator("figure").filter({ hasText: "Besuche je Monat (Team)" });
  await expect(diagramm.getByRole("img")).toBeVisible();
  await diagramm.getByRole("button", { name: "Als Tabelle" }).click();
  await expect(diagramm.getByRole("row")).toHaveCount(12);

  // Vorjahr wählbar
  const vorjahr = String(new Date().getFullYear() - 1);
  await page.getByRole("combobox", { name: "Jahr" }).selectOption(vorjahr);
  await expect(page.getByRole("combobox", { name: "Jahr" })).toHaveValue(vorjahr);
  await expect(page.getByTestId("kennzahl")).toHaveCount(8);
});
