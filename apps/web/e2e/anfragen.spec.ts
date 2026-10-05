import { expect, test } from "@playwright/test";

const SCREENSHOTS = process.env.SCREENSHOT_ORDNER;

/** M11: Anfrage über die Website (öffentliche Schnittstelle) → Cockpit → Vorschlag → Zusage → Akte; Belegungsplan mit Urlaub. */
test("Betreuungsanfrage von der Website zusagen und Belegungsplan pflegen", async ({ page, request }, info) => {
  test.skip(info.project.name !== "ipad-quer", "ändert gemeinsame Daten – ein Durchlauf genügt");
  // ET in gut zwei Monaten (Demo: Johanna ist dort ausgebucht)
  const d = new Date();
  d.setDate(d.getDate() + 70);
  const et = d.toISOString().slice(0, 10);
  const r = await request.post("/api/oeffentlich/anfrage", {
    data: { vorname: "Wiebke", nachname: "Website", email: "wiebke@example.org", et, plz: "18209", ort: "Bad Doberan", erstesKind: true, leistungen: ["wochenbett", "stillen"], nachricht: "Gern auch Stillberatung.", einwilligung: true },
  });
  expect(r.ok()).toBe(true);

  await page.goto("/");
  await page.getByLabel("E-Mail").fill("johanna@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.getByRole("link", { name: /neue Betreuungsanfragen?/ }).click();
  await expect(page.getByRole("heading", { name: "Anfragen", exact: true })).toBeVisible();
  await page.getByTestId("anfrage").filter({ hasText: "Wiebke Website" }).click();

  await expect(page.getByRole("heading", { name: "Wiebke Website" })).toBeVisible();
  await expect(page.getByText("Wochenbettbetreuung, Stillberatung")).toBeVisible();
  const vorschlaege = page.getByTestId("vorschlag");
  await expect(vorschlaege).toHaveCount(3);
  await expect(vorschlaege.first()).toContainText("Marielena Pontus");
  await expect(vorschlaege.filter({ hasText: "Lorina Gosemann" })).toContainText("in Babypause");
  if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/${info.project.name}-anfrage.png`, fullPage: true });

  page.once("dialog", (dlg) => dlg.accept());
  await vorschlaege.first().getByRole("button", { name: "Zusagen" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Wiebke Website" })).toBeVisible();
  await expect(page.getByText("zuständig Marielena Pontus")).toBeVisible();
  await expect(page.getByText("Erstgebärend").first()).toBeVisible();

  // Belegungsplan: eigener Urlaub kürzt die Kapazität
  await page.goto("/belegung");
  await expect(page.getByTestId("belegung-monat").first()).toBeVisible();
  await page.getByLabel("Von").fill(et);
  await page.getByLabel("Bis").fill(et);
  await page.getByLabel("Notiz (optional)").fill("Fortbildung Stillen");
  await page.getByLabel("Art").selectOption({ label: "Fortbildung" });
  await page.getByRole("button", { name: "Eintragen" }).click();
  const eintrag = page.getByTestId("abwesenheit").filter({ hasText: "Fortbildung Stillen" });
  await expect(eintrag).toContainText("Johanna Mede · Fortbildung");
  if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/${info.project.name}-belegung.png`, fullPage: true });
  page.once("dialog", (dlg) => dlg.accept());
  await eintrag.getByRole("button", { name: "Abwesenheit löschen" }).click();
  await expect(eintrag).toHaveCount(0);
});
