import { expect, test } from "@playwright/test";

const SCREENSHOTS = process.env.SCREENSHOT_ORDNER;
const bild = async (page: import("@playwright/test").Page, name: string, info: import("@playwright/test").TestInfo) => {
  if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/${info.project.name}-${name}.png`, fullPage: true });
};

test("Abrechnung: Versand vorbereiten, Mappe öffnen, versendet markieren", async ({ page, context }, info) => {
  test.skip(info.project.name !== "ipad-quer", "Versand nur einmal je Testlauf anlegen");
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("johanna@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: /Johanna/ })).toBeVisible();

  await page.getByRole("link", { name: "Abrechnung" }).first().click();
  await expect(page.getByRole("heading", { name: "Noch nicht abgerechnet" })).toBeVisible();
  await expect(page.getByText("Lena Krüger")).toBeVisible();
  await bild(page, "10-abrechnung-offen", info);

  await page.getByRole("button", { name: "Versand vorbereiten" }).click();
  await expect(page.getByText(/Versand \d{4}-\d{2}-JM-\d+ vorbereitet/)).toBeVisible();

  const pdfAntwort = await context.request.get((await page.getByRole("link", { name: "Versandmappe (PDF)" }).first().getAttribute("href"))!);
  expect(pdfAntwort.headers()["content-type"]).toBe("application/pdf");

  await page.getByRole("button", { name: "Als versendet markieren" }).click();
  await page.getByLabel("Einschreiben-Nr. (optional)").fill("RR987654321DE");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(/Einschreiben RR987654321DE/)).toBeVisible();
  await bild(page, "11-abrechnung-versendet", info);
});
