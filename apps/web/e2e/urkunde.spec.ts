import { expect, test } from "@playwright/test";

const SCREENSHOTS = process.env.SCREENSHOT_ORDNER;

test("Kinderurkunde gestalten, Vorschau ansehen und fertigstellen", async ({ page }, info) => {
  test.skip(info.project.name !== "ipad-quer", "Urkunde je Kind gespeichert – ein Durchlauf genügt");
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("johanna@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: /Johanna/ })).toBeVisible();

  await page.goto("/klientinnen");
  await page.getByText("Lena Krüger").click();
  await page.getByRole("link", { name: "Kinderurkunde ›" }).click();
  await expect(page.getByRole("heading", { name: "Kinderurkunde Ole" })).toBeVisible();
  await expect(page.getByLabel("Text")).toHaveValue(/Lieber Ole, am .* bist du auf die Welt gekommen/);

  await page.getByRole("button", { name: "Leuchtturm" }).click();
  await page.getByLabel("Vorlage").selectOption({ label: "Mit plattdeutschem Gruß" });
  await expect(page.getByLabel("Text")).toHaveValue(/Moin, lütt Ole!/);
  await page.getByRole("button", { name: "+ Erstes Lächeln" }).click();
  await page.getByRole("button", { name: "Nur Wochenwerte" }).click();

  await page.getByRole("button", { name: "PDF-Vorschau", exact: true }).click();
  await expect(page.getByTitle("Vorschau der Urkunde")).toBeVisible();
  if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/${info.project.name}-urkunde.png`, fullPage: true });

  await page.getByRole("button", { name: "Fertig", exact: true }).click();
  await expect(page.getByText("Urkunde fertig und in der Akte gespeichert.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Gespeichertes PDF öffnen" })).toBeVisible();
  const pdf = await page.request.get(await page.getByRole("link", { name: "Gespeichertes PDF öffnen" }).getAttribute("href") as string);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
});
