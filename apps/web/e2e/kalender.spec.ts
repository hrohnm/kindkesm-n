import { expect, test } from "@playwright/test";

const SCREENSHOTS = process.env.SCREENSHOT_ORDNER;

/** M5: Teamkalender und privates Kalender-Abo. */
test("Teamkalender ansehen und Kalender abonnieren", async ({ page }, info) => {
  test.skip(info.project.name !== "ipad-quer", "ändert gemeinsame Daten – ein Durchlauf genügt");
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("marielena@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: /Marielena/ })).toBeVisible();

  await page.getByRole("link", { name: "Kalender" }).first().click();
  await expect(page.getByRole("heading", { name: "Kalender", level: 1 })).toBeVisible();
  // Demo: Marielena hat heute Rufbereitschaft; Johanna hat heute Hausbesuche
  const heute = page.getByTestId("kalender-tag").filter({ hasText: "heute" });
  await expect(heute.getByTestId("zelle-MP")).toContainText("Rufbereitschaft");
  await expect(heute.getByTestId("zelle-JM").getByTestId("kalender-eintrag").first()).toBeVisible();
  // Lorina (Babypause) erst nach Einblenden
  await expect(page.getByTestId("zelle-LG")).toHaveCount(0);
  await page.getByLabel("Hebammen in Babypause zeigen").check();
  await expect(page.getByTestId("zelle-LG").first()).toBeVisible();
  if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/${info.project.name}-kalender.png`, fullPage: true });

  // Woche weiter und zurück
  const zeitraum = await page.getByTestId("kalender-zeitraum").textContent();
  await page.getByRole("button", { name: "Nächste Woche" }).click();
  await expect(page.getByTestId("kalender-zeitraum")).not.toHaveText(zeitraum!);
  await page.getByRole("button", { name: "Diese Woche" }).click();
  await expect(page.getByTestId("kalender-zeitraum")).toHaveText(zeitraum!);

  // Abo-Link erzeugen, abrufen (nur Initialen), beenden
  await page.getByRole("button", { name: "Abo-Link erzeugen" }).click();
  const link = await page.getByLabel("Abo-Link").inputValue();
  expect(link).toMatch(/\/api\/abo\/[A-Za-z0-9_-]{32}\.ics$/);
  const ics = await page.request.get(link);
  expect(ics.status()).toBe(200);
  const text = await ics.text();
  expect(text).toContain("BEGIN:VCALENDAR");
  expect(text).toContain("Rufbereitschaft");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Abo beenden" }).click();
  await expect(page.getByTestId("abo-stand")).toHaveText("Noch kein Abo eingerichtet.");
  expect((await page.request.get(link)).status()).toBe(404);
});
