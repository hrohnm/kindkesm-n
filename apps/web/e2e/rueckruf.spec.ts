import { expect, test } from "@playwright/test";

const SCREENSHOTS = process.env.SCREENSHOT_ORDNER;

/** Rückrufwunsch von der Website (öffentliche Schnittstelle) → Cockpit → Anfragen: nicht erreicht, als Betreuungsanfrage erfassen. */
test("Rückrufwunsch von der Website bearbeiten", async ({ page, request }, info) => {
  test.skip(info.project.name !== "ipad-quer", "ändert gemeinsame Daten – ein Durchlauf genügt");
  const r = await request.post("/api/oeffentlich/rueckruf", {
    data: { name: "Wanda Webseite", telefon: "0170 0000299", anliegen: "betreuung", zeitfenster: "mittag", hebamme: "Johanna Mede", nachricht: "ET im Mai, erstes Kind.", einwilligung: true },
  });
  expect(r.ok()).toBe(true);

  await page.goto("/");
  await page.getByLabel("E-Mail").fill("johanna@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.getByRole("link", { name: /Rückrufwünsche? .*\(1 für dich\)/ }).click();

  const karte = page.getByTestId("rueckruf").filter({ hasText: "Wanda Webseite" });
  await expect(karte).toBeVisible();
  await expect(karte).toContainText("Hebammenbetreuung");
  await expect(karte).toContainText("mittags (12–14 Uhr)");
  await expect(karte).toContainText("Wunsch: Johanna Mede");
  await expect(karte.getByRole("link", { name: "0170 0000299" })).toHaveAttribute("href", "tel:01700000299");

  await karte.getByLabel(/Notiz zum Anruf/).fill("Mailbox, Nachricht hinterlassen");
  await karte.getByRole("button", { name: "Nicht erreicht" }).click();
  await expect(karte).toContainText("1× nicht erreicht");
  await expect(karte).toContainText("Mailbox, Nachricht hinterlassen");
  if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/${info.project.name}-rueckrufe.png`, fullPage: true });

  // Beim zweiten Versuch erreicht: gleich als Betreuungsanfrage erfassen
  await karte.getByRole("button", { name: "Als Betreuungsanfrage erfassen" }).click();
  await expect(page.getByRole("heading", { name: "Betreuungsanfrage aus Rückruf: Wanda Webseite" })).toBeVisible();
  await expect(page.getByLabel("Vorname")).toHaveValue("Wanda");
  await expect(page.getByLabel("Nachname")).toHaveValue("Webseite");
  await expect(page.getByLabel("Telefon")).toHaveValue("0170 0000299");
  const d = new Date();
  d.setDate(d.getDate() + 200);
  await page.getByLabel("Errechneter Termin").fill(d.toISOString().slice(0, 10));
  await page.getByLabel("Wohnort").fill("Bad Doberan");
  await page.getByRole("button", { name: "Anfrage speichern" }).click();
  await expect(page).toHaveURL(/\/anfragen\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Wanda Webseite", exact: true })).toBeVisible();

  // Rückrufwunsch ist erledigt
  await page.goto("/anfragen");
  await expect(page.getByTestId("rueckruf").filter({ hasText: "Svenja Neuhaus" })).toBeVisible();
  await expect(page.getByTestId("rueckruf").filter({ hasText: "Wanda Webseite" })).toHaveCount(0);
  await page.getByRole("button", { name: /Erledigte \(/ }).click();
  const erledigt = page.getByTestId("rueckruf").filter({ hasText: "Wanda Webseite" });
  await expect(erledigt).toContainText("Als Betreuungsanfrage erfasst");
  await expect(erledigt).toContainText("von Johanna Mede");
});
