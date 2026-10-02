import { expect, test } from "@playwright/test";

const SCREENSHOTS = process.env.SCREENSHOT_ORDNER;

test("Kurse: Online-Anmeldung, Bestätigen, Anwesenheit mit Unterschrift", async ({ page, browser }, info) => {
  test.skip(info.project.name !== "ipad-quer", "Kursdaten sind gemeinsam – ein Durchlauf genügt");

  // Öffentliche Anmeldeseite ohne Konto
  const extern = await browser.newContext({ locale: "de-DE" });
  const p = await extern.newPage();
  await p.goto("/anmeldung");
  await expect(p.getByRole("heading", { name: "Kursanmeldung" })).toBeVisible();
  await expect(p.getByRole("heading", { name: "Geburtsvorbereitung am Wochenende" })).toBeVisible();
  const bm = p.locator("li", { has: p.getByRole("heading", { name: "Babymassage dienstags" }) });
  await expect(bm.getByText("85,00 €")).toBeVisible();
  await bm.getByRole("button", { name: "Anmelden" }).click();
  await p.getByLabel("Vor- und Nachname").fill("Emma Website");
  await p.getByLabel("E-Mail").fill("emma@example.org");
  await p.getByLabel("Geburtsdatum des Kindes").fill("2026-08-15");
  await p.getByRole("button", { name: "Verbindlich anmelden" }).click();
  await expect(p.getByText(/zustimmen/)).toBeVisible();
  await p.getByText(/Ich bin einverstanden/).click();
  await p.getByRole("button", { name: "Verbindlich anmelden" }).click();
  await expect(p.getByRole("heading", { name: "Vielen Dank!" })).toBeVisible();
  if (SCREENSHOTS) await p.screenshot({ path: `${SCREENSHOTS}/${info.project.name}-anmeldung.png`, fullPage: true });
  await extern.close();

  // In der App
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("marielena@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("link", { name: /neue Online-Anmeldung: Babymassage dienstags/ })).toBeVisible();
  await page.getByRole("link", { name: "Kurse", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Kurse" })).toBeVisible();
  await page.getByRole("link", { name: /Babymassage dienstags/ }).click();
  const emma = page.getByTestId("teilnahme").filter({ hasText: "Emma Website" });
  await expect(emma.getByText("online", { exact: true })).toBeVisible();
  await emma.getByRole("button", { name: "Bestätigen" }).click();
  await expect(emma.getByText("bestätigt")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plätze 3/6" })).toBeVisible();

  // Kassenkurs: Anwesenheit des zweiten Termins mit Tablet-Unterschrift
  await page.goto("/kurse");
  await page.getByRole("link", { name: /Geburtsvorbereitung am Wochenende/ }).click();
  await expect(page.getByText("✓ 2 anwesend")).toBeVisible();
  await page.getByRole("link", { name: "Anwesenheit" }).nth(1).click();
  await expect(page.getByRole("heading", { name: /Anwesenheit/ })).toBeVisible();
  const sophie = page.getByTestId("anwesenheit").filter({ hasText: "Sophie Berger" });
  await expect(sophie.getByText(/180 Min\./)).toBeVisible();
  await sophie.getByRole("button", { name: "Sophie Berger anwesend" }).click();
  await sophie.getByRole("button", { name: "Auf dem Tablet unterschreiben" }).click();
  const feld = sophie.getByLabel("Unterschriftenfeld");
  const box = (await feld.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 60);
  await page.mouse.down();
  for (let i = 0; i < 10; i++) await page.mouse.move(box.x + 50 + i * 20, box.y + 50 + (i % 2 ? -20 : 20));
  await page.mouse.up();
  await sophie.getByRole("button", { name: "Fertig" }).click();
  await expect(sophie.getByRole("img", { name: "Unterschrift" })).toBeVisible();
  if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/${info.project.name}-kurs-anwesenheit.png`, fullPage: true });
  await page.getByRole("button", { name: "Zwischenspeichern" }).click();
  await expect(page.getByText("Gespeichert.")).toBeVisible();
});
