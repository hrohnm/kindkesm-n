import { expect, test, type Page } from "@playwright/test";

const SCREENSHOTS = process.env.SCREENSHOT_ORDNER;

async function anmelden(page: Page, email: string) {
  await page.goto("/");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: /Moin|Hallo|Guten Abend/ })).toBeVisible();
}

test("Regelwerk: Änderung vorschlagen, im Testrechner prüfen und durch zweite Hebamme freigeben", async ({ browser }, info) => {
  test.skip(info.project.name !== "ipad-quer", "ändert gemeinsame Daten – ein Durchlauf genügt");
  const johanna = await (await browser.newContext()).newPage();
  await anmelden(johanna, "johanna@kindkesmoeoen.test");
  await johanna.goto("/regelwerk");
  // Fassung 2025: dazu gibt es in den Demo-Daten keine versendeten Abrechnungen (sonst nur noch neue Fassung möglich)
  await johanna.getByRole("button", { name: /ab 01\.11\.2025/ }).click();
  await johanna.getByPlaceholder("GPOS oder Bezeichnung suchen").fill("30401");
  await johanna.getByRole("button", { name: "GPOS 30401 bearbeiten" }).click();
  await johanna.getByLabel("Betrag (€)").fill("9,99");
  await johanna.getByRole("button", { name: "Weiter" }).click();
  await expect(johanna.getByText(/GPOS 30401 Betrag \(€\): .* → 9,99/)).toBeVisible();
  await johanna.getByLabel("Begründung / Quelle").fill("E2E-Test");
  await johanna.getByRole("button", { name: "Zur Freigabe vorschlagen" }).click();
  await expect(johanna.getByText(/Vorschlag gespeichert/)).toBeVisible();

  const marielena = await (await browser.newContext()).newPage();
  await anmelden(marielena, "marielena@kindkesmoeoen.test");
  await expect(marielena.getByText(/GPOS 30401 Betrag.*wartet auf deine Freigabe/)).toBeVisible();
  await marielena.goto("/regelwerk");
  await marielena.getByRole("button", { name: /ab 01\.11\.2025/ }).click();
  await marielena.getByRole("button", { name: /^Änderungen/ }).click();
  await marielena.getByRole("button", { name: "Im Testrechner prüfen" }).first().click();
  await expect(marielena.getByRole("heading", { name: "Mit der Änderung" })).toBeVisible();
  if (SCREENSHOTS) await marielena.screenshot({ path: `${SCREENSHOTS}/regelwerk-testrechner.png`, fullPage: true });
  await marielena.getByRole("button", { name: /^Änderungen/ }).click();
  marielena.once("dialog", (d) => d.accept());
  await marielena.getByRole("button", { name: "Freigeben", exact: true }).first().click();
  await expect(marielena.getByText(/Freigegeben – die Änderung ist jetzt wirksam/)).toBeVisible();
  await marielena.getByRole("button", { name: "Positionen" }).click();
  await marielena.getByPlaceholder("GPOS oder Bezeichnung suchen").fill("30401");
  await expect(marielena.getByText("9,99 €")).toBeVisible();
});
