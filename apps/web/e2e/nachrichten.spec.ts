import { expect, test } from "@playwright/test";

/** M20: Team-Nachrichten und Aufgaben (Seite, Cockpit-Hinweis, Akte). */
test("Nachricht lesen und schreiben, Aufgabe anlegen und erledigen", async ({ page }, info) => {
  test.skip(info.project.name !== "ipad-quer", "ändert gemeinsame Daten – ein Durchlauf genügt");
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("marielena@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: /Marielena/ })).toBeVisible();

  // Demo: Johanna hat Marielena direkt geschrieben
  await page.getByRole("link", { name: /neue Team-Nachricht.*\(1 an dich\)/ }).click();
  await expect(page.getByRole("heading", { name: "Nachrichten und Aufgaben" })).toBeVisible();
  const direkt = page.getByTestId("nachricht").filter({ hasText: "Ella Lange hat über 10 %" });
  await expect(direkt).toContainText("Johanna Mede");
  await expect(direkt).toContainText("→ Marielena Pontus");
  await expect(direkt.getByText("neu", { exact: true })).toBeVisible();

  // Antwort an Johanna
  await page.getByRole("textbox", { name: "Neue Nachricht" }).fill("E2E: Danke, ich bin erreichbar.");
  await page.getByRole("combobox", { name: "Empfängerin" }).selectOption({ label: "Johanna Mede" });
  await page.getByRole("button", { name: "Senden" }).click();
  const eigene = page.getByTestId("nachricht").filter({ hasText: "E2E: Danke" });
  await expect(eigene).toContainText("→ Johanna Mede");

  // Cockpit: alles gelesen
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Marielena/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /neue Team-Nachricht/ })).toHaveCount(0);

  // Aufgaben
  await page.goto("/nachrichten?ansicht=aufgaben");
  await expect(page.getByTestId("aufgabe").filter({ hasText: "EPDS bei Laura Becker" })).toBeVisible();
  await page.getByRole("textbox", { name: "Neue Aufgabe" }).fill("E2E Kursraum lüften");
  await page.getByRole("button", { name: "Anlegen" }).click();
  const aufgabe = page.getByTestId("aufgabe").filter({ hasText: "E2E Kursraum lüften" });
  await expect(aufgabe).toContainText("für mich");
  await aufgabe.getByRole("checkbox").click();
  await expect(aufgabe).toHaveCount(0);
  await page.getByLabel("Erledigte der letzten 30 Tage zeigen").check();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "E2E Kursraum lüften löschen" }).click();
  await expect(page.getByTestId("aufgabe").filter({ hasText: "E2E Kursraum lüften" })).toHaveCount(0);

  // Akte Laura Becker: Aufgabe und Nachricht zur Familie
  await page.goto("/klientinnen");
  await page.getByRole("link", { name: /Becker/ }).first().click();
  const team = page.getByRole("region", { name: "Team" });
  await expect(team.getByTestId("aufgabe").filter({ hasText: "EPDS bei Laura Becker" })).toBeVisible();
  await expect(team.getByTestId("nachricht").filter({ hasText: "EPDS 10 Punkte" })).toBeVisible();

  // Eigene Nachricht wieder löschen
  await page.goto("/nachrichten");
  page.once("dialog", (d) => d.accept());
  await page.getByTestId("nachricht").filter({ hasText: "E2E: Danke" }).getByRole("button", { name: "Nachricht löschen" }).click();
  await expect(page.getByTestId("nachricht").filter({ hasText: "E2E: Danke" })).toHaveCount(0);
});
