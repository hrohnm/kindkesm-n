import { expect, test } from "@playwright/test";

/** M23: Erinnerung (U-Untersuchung) im Cockpit als erledigt abhaken – bleibt danach weg. */
test("Erinnerung im Cockpit abhaken", async ({ page }, info) => {
  test.skip(info.project.name !== "ipad-quer", "ändert gemeinsame Daten – ein Durchlauf genügt");
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("johanna@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: /Johanna/ })).toBeVisible();

  // Demo: Ole Krüger ist 6 Tage alt → U2 (3.–10. Lebenstag)
  const erinnerung = page.getByRole("listitem").filter({ hasText: "U2 für Ole steht an" });
  await expect(erinnerung).toBeVisible();
  await erinnerung.getByRole("button", { name: /Erledigt/ }).click();
  await expect(erinnerung).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Johanna/ })).toBeVisible();
  await expect(page.getByText("Fristen und Hinweise")).toBeVisible();
  await expect(page.getByText("U2 für Ole steht an")).toHaveCount(0);
});
