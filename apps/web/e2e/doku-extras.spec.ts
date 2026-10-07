import { expect, test } from "@playwright/test";

/** M3: Textbausteine, „Wie letztes Mal“, EPDS-Auswertung und Beratungsthemen im Besuch. */
test("Textbaustein einfügen, EPDS auswerten, Beratungsthemen abhaken", async ({ page }, info) => {
  test.skip(info.project.name !== "ipad-quer", "ändert gemeinsame Daten – ein Durchlauf genügt");
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("johanna@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: /Johanna/ })).toBeVisible();

  // Textbaustein anlegen
  await page.goto("/einstellungen/textbausteine");
  await page.getByLabel("Titel").fill("E2E Anlegen");
  await page.getByLabel("Text").fill("Anlegen in Wiegehaltung geübt, Mutter sicher.");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByTestId("textbaustein").filter({ hasText: "E2E Anlegen" })).toBeVisible();

  // Neuer Besuch bei Familie Krüger
  await page.goto("/klientinnen");
  await page.getByRole("link", { name: /Krüger/ }).first().click();
  await page.getByRole("link", { name: "Besuch dokumentieren" }).first().click();
  await expect(page.getByRole("heading", { name: "Beratungsthemen" })).toBeVisible();

  // „Wie letztes Mal“: Auswahl- und Textfelder des letzten Besuchs übernehmen
  const mutter = page.getByRole("button", { name: /^▶?\s*Mutter/ });
  if ((await mutter.getAttribute("aria-expanded")) === "false") await mutter.click();
  const wieLetztesMal = page.getByRole("button", { name: /^Wie letztes Mal \(/ }).first();
  await expect(wieLetztesMal).toBeVisible();
  await wieLetztesMal.click();

  // Textbaustein in die Notiz übernehmen
  await page.getByLabel("Textbaustein einfügen").selectOption({ label: "E2E Anlegen" });
  await expect(page.getByLabel(/Notiz \/ Beratung/)).toHaveValue("Anlegen in Wiegehaltung geübt, Mutter sicher.");

  // EPDS: Summe 10 → „genauer hinsehen“, Frage 10 positiv → deutlicher Hinweis
  await page.getByRole("button", { name: "Auswertung eintragen" }).click();
  for (let i = 1; i <= 9; i++) await page.getByRole("group", { name: new RegExp(`^Frage ${i}:`) }).getByRole("button", { name: i === 9 ? "2" : "1", exact: true }).click();
  await expect(page.getByTestId("epds-ergebnis")).toContainText("Summe 10 von 30 (noch nicht alle Fragen)");
  await expect(page.getByTestId("epds-ergebnis")).toContainText("genauer hinsehen");
  await page.getByRole("group", { name: /^Frage 10:/ }).getByRole("button", { name: "1", exact: true }).click();
  await expect(page.getByTestId("epds-ergebnis")).toContainText("Summe 11 von 30");
  await expect(page.getByTestId("epds-ergebnis")).toContainText("Frage 10 positiv");

  // Beratungsthemen
  const thema = page.getByRole("button", { name: /^Nabelpflege/ });
  await thema.click();
  await expect(thema).toHaveAttribute("aria-pressed", "true");

  // Textbaustein wieder löschen
  await page.goto("/einstellungen/textbausteine");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "E2E Anlegen löschen" }).click();
  await expect(page.getByTestId("textbaustein").filter({ hasText: "E2E Anlegen" })).toHaveCount(0);
});
