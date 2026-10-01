import { expect, test } from "@playwright/test";

const SCREENSHOTS = process.env.SCREENSHOT_ORDNER;

async function anmelden(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("johanna@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: /Johanna/ })).toBeVisible();
}

const bild = async (page: import("@playwright/test").Page, name: string, info: import("@playwright/test").TestInfo) => {
  if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/${info.project.name}-${name}.png`, fullPage: true });
};

test("Rundgang: Cockpit, Team, Regelwerk, Einstellungen", async ({ page }, info) => {
  await anmelden(page);
  await expect(page.getByText("Fristen und Hinweise")).toBeVisible();
  await bild(page, "1-cockpit", info);

  await page.goto("/team");
  await expect(page.getByText("Lorina Gosemann")).toBeVisible();
  await expect(page.getByText(/Babypause bis 01.03.2027/)).toBeVisible();
  await bild(page, "2-team", info);

  await page.goto("/regelwerk");
  await expect(page.getByText("10905")).toHaveCount(0);
  await page.getByPlaceholder("GPOS oder Bezeichnung suchen").fill("109");
  await expect(page.getByText("10905")).toBeVisible();
  await page.getByPlaceholder("GPOS oder Bezeichnung suchen").fill("");
  await page.getByRole("button", { name: "Wochenbett" }).click();
  await expect(page.getByText("30111")).toBeVisible();
  await bild(page, "3-regelwerk", info);

  await page.goto("/einstellungen/orte");
  await expect(page.getByText("Schule der Tochter", { exact: true })).toBeVisible();
  await expect(page.getByText("Schultag", { exact: true })).toBeVisible();
  await bild(page, "4-orte-touren", info);

  await page.goto("/einstellungen/abrechnung");
  await expect(page.getByRole("heading", { name: "Abrechnungsweg" })).toBeVisible();
  await bild(page, "5-abrechnung", info);

  await page.goto("/einstellungen");
  await page.getByLabel("Institutionskennzeichen (IK)").fill("12345");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(/beginnt mit 45/).first()).toBeVisible();
  await bild(page, "6-profil-fehler", info);
});
