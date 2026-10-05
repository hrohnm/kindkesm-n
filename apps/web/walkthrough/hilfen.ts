import { expect, type Page, type TestInfo } from "@playwright/test";

export const PASSWORT = process.env.DEMO_PASSWORT ?? "kindkes-demo-2026";
const ORDNER = process.env.SCREENSHOT_ORDNER ?? "../../docs/walkthrough-protokoll/bilder";

export async function anmelden(page: Page, wer: "johanna" | "marielena" | "lorina", passwort = PASSWORT) {
  await page.goto("/");
  await page.getByLabel("E-Mail").fill(`${wer}@kindkesmoeoen.test`);
  await page.getByLabel("Passwort").fill(passwort);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(new RegExp(wer, "i"));
}

/** Screenshot fürs Protokoll (Dateiname: <Projekt>-<Kennung>.jpg) */
export async function bild(page: Page, info: TestInfo, name: string, ganz = true) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${ORDNER}/${info.project.name}-${name}.jpg`, type: "jpeg", quality: 65, fullPage: ganz });
}

export const karte = (page: Page, titel: string | RegExp) => page.locator("section", { has: page.getByRole("heading", { name: titel }) });

export async function unterschreiben(page: Page, feld: ReturnType<Page["getByLabel"]>) {
  await feld.scrollIntoViewIfNeeded();
  const box = (await feld.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 60);
  await page.mouse.down();
  for (let i = 0; i < 8; i++) await page.mouse.move(box.x + 50 + i * 25, box.y + 50 + (i % 2 ? -20 : 20));
  await page.mouse.up();
}

export const nurTablet = (info: TestInfo) => info.project.name === "ipad-quer";
