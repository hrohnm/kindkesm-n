import { expect, test } from "@playwright/test";

/** M19: Übergabe an die Vertretung und Rufbereitschaftsplan. */
test("Übergabe lesen und Rufbereitschaft planen", async ({ page }, info) => {
  test.skip(info.project.name !== "ipad-quer", "ändert gemeinsame Daten – ein Durchlauf genügt");
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("marielena@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: /Marielena/ })).toBeVisible();

  // Demo: Johanna hat Marielena als Vertretung für Nele Hoffmann eingetragen und eine Übergabe geschrieben
  await expect(page.getByText(/Du hast heute Rufbereitschaft/)).toBeVisible();
  await page.getByRole("link", { name: "Übergabe für dich: Nele Hoffmann (von Johanna)" }).click();
  await expect(page.getByTestId("uebergabe")).toContainText("Bitte vorher anrufen (Hund).");
  await expect(page.getByTestId("uebergabe")).toContainText("Übergabe für die Vertretung · Johanna");

  // Rufbereitschaft: Eintrag für Johanna anlegen und wieder löschen
  await page.goto("/team");
  await expect(page.getByRole("heading", { name: "Rufbereitschaft" })).toBeVisible();
  await expect(page.getByTestId("rufbereitschaft").filter({ hasText: "Marielena Pontus" })).toContainText("heute");
  const d = new Date();
  d.setDate(d.getDate() + 14);
  const iso = d.toISOString().slice(0, 10);
  await page.getByLabel("Hebamme").selectOption({ label: "Johanna Mede" });
  await page.getByLabel("Von").fill(iso);
  await page.getByLabel("Bis").fill(iso);
  await page.getByLabel("Notiz (optional)").fill("Feiertag");
  await page.getByRole("button", { name: "Eintragen", exact: true }).click();
  const eintrag = page.getByTestId("rufbereitschaft").filter({ hasText: "Feiertag" });
  await expect(eintrag).toContainText("Johanna Mede");
  page.once("dialog", (dlg) => dlg.accept());
  await eintrag.getByRole("button", { name: /löschen/ }).click();
  await expect(eintrag).toHaveCount(0);
});
