import { expect, test } from "@playwright/test";

const SCREENSHOTS = process.env.SCREENSHOT_ORDNER;
const bild = async (page: import("@playwright/test").Page, name: string, info: import("@playwright/test").TestInfo) => {
  if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/${info.project.name}-${name}.png`, fullPage: true });
};

test("Hausbesuch dokumentieren mit Tablet-Unterschrift", async ({ page }, info) => {
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("marielena@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: /Marielena/ })).toBeVisible();

  await page.goto("/klientinnen");
  await expect(page.getByText("Lena Krüger")).toBeVisible();
  await bild(page, "7-klientinnen", info);

  await page.getByText("Maria Hansen").click();
  await expect(page.getByRole("heading", { name: "Maria Hansen" })).toBeVisible();
  await expect(page.getByText("Spätes Wochenbett")).toBeVisible();
  await bild(page, "8-akte", info);

  await page.getByRole("link", { name: "Besuch dokumentieren" }).click();
  await expect(page.getByRole("heading", { name: "Besuch dokumentieren" })).toBeVisible();
  // Jedes Projekt dokumentiert an einem anderen Tag (im späten Wochenbett nur ein Kontakt pro Tag)
  const d = new Date();
  d.setDate(d.getDate() - (info.project.name === "handy" ? 1 : 0));
  await page.getByLabel("Datum").fill(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  await page.getByLabel("Beginn").fill("10:00");
  await page.getByLabel("Ende").fill("10:50");
  await page.getByRole("button", { name: "voll gestillt" }).first().click();
  await page.getByLabel("Gewicht (g)").first().fill("2950");
  await expect(page.getByText(/\+11,3 % zum Geburtsgewicht/)).toBeVisible();
  // Zwillinge im späten Wochenbett: 60 + 10 Minuten -> alle 50 Minuten abrechenbar
  await expect(page.getByText(/50 Min\. abrechenbar/)).toBeVisible();

  await page.getByRole("button", { name: /Stattdessen auf dem Tablet|Stattdessen auf Papier/ }).click().catch(() => {});
  const feld = page.getByLabel("Unterschriftenfeld");
  if (await feld.isVisible()) {
    const box = (await feld.boundingBox())!;
    await page.mouse.move(box.x + 40, box.y + 100);
    await page.mouse.down();
    for (let i = 0; i < 12; i++) await page.mouse.move(box.x + 60 + i * 20, box.y + 90 + (i % 2 ? -25 : 20));
    await page.mouse.up();
  } else {
    await page.getByLabel(/hat die Zeile auf dem Formular unterschrieben/).check();
  }
  await bild(page, "9-besuch", info);
  await page.getByRole("button", { name: "Abschließen" }).click();

  await expect(page.getByRole("heading", { name: "Maria Hansen" })).toBeVisible();
  await expect(page.getByText(/Unterschrift$/).first()).toBeVisible();
});
