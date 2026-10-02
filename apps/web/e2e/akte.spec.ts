import { expect, test } from "@playwright/test";

const SCREENSHOTS = process.env.SCREENSHOT_ORDNER;

test("Akte: Merkmale, Kontakt, Einwilligung und Vertretung", async ({ page }, info) => {
  test.skip(info.project.name !== "ipad-quer", "Daten der Akte sind gemeinsam – ein Durchlauf genügt");
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("marielena@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: /Marielena/ })).toBeVisible();

  await page.goto("/klientinnen");
  await page.getByText("Maria Hansen").click();
  await expect(page.getByRole("heading", { name: "Maria Hansen" })).toBeVisible();
  // Demo: Risiko und Latex-Allergie sind sichtbar
  await expect(page.getByText("Latex").first()).toBeVisible();

  // Merkmale ändern
  await page.locator("section", { has: page.getByRole("heading", { name: "Merkmale" }) }).getByRole("button", { name: "Bearbeiten" }).click();
  await page.getByRole("button", { name: "Dolmetscherin nötig" }).click();
  await page.getByLabel("Sprache (falls nicht Deutsch)").fill("Dänisch");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Sprache: Dänisch").first()).toBeVisible();

  // Kontakt anlegen
  const kontakte = page.locator("section", { has: page.getByRole("heading", { name: "Kontakte" }) });
  await kontakte.getByRole("button", { name: "Kontakt" }).click();
  await kontakte.getByLabel("Art").selectOption({ label: "Kinderärztin/Kinderarzt" });
  await kontakte.getByLabel("Name").fill("Dr. Kinder Rerik");
  await kontakte.getByLabel("Telefon").fill("038296 0000");
  await kontakte.getByRole("button", { name: "Speichern" }).click();
  await expect(kontakte.getByTestId("kontakt").filter({ hasText: "Dr. Kinder Rerik" })).toBeVisible();

  // Einwilligung Fotos auf dem Tablet unterschreiben
  const foto = page.getByTestId("einwilligung").filter({ hasText: "Fotos zur Dokumentation" });
  await foto.getByRole("button", { name: "Erfassen" }).click();
  await foto.getByLabel("Form").selectOption({ label: "auf dem Tablet unterschrieben" });
  const feld = foto.getByLabel("Unterschriftenfeld");
  await feld.scrollIntoViewIfNeeded();
  const box = (await feld.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 60);
  await page.mouse.down();
  for (let i = 0; i < 8; i++) await page.mouse.move(box.x + 50 + i * 25, box.y + 50 + (i % 2 ? -20 : 20));
  await page.mouse.up();
  await foto.getByRole("button", { name: "Einwilligung erteilt" }).click();
  await expect(foto.getByText(/✓ erteilt .* auf dem Tablet unterschrieben/)).toBeVisible();
  if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/${info.project.name}-akte-m2.png`, fullPage: true });

  // Im Besuch erscheinen Allergie und Merkmale
  await page.getByRole("link", { name: "Besuch dokumentieren" }).click();
  await expect(page.getByRole("heading", { name: /Besuch dokumentieren/ })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Allergien: Latex" })).toBeVisible();
  await expect(page.getByText("Dolmetscherin nötig")).toBeVisible();
});

test("Art der Geburt: Kaiserschnittnarbe nur nach Sectio, Mehrfachauswahl", async ({ page }, info) => {
  test.skip(info.project.name !== "ipad-quer", "ein Durchlauf genügt");
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("marielena@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: /Marielena/ })).toBeVisible();

  // Demo: Laura Becker – sekundäre Sectio
  await page.goto("/klientinnen");
  await page.getByText("Laura Becker").click();
  await expect(page.getByText("Sekundäre Sectio")).toBeVisible();
  await page.getByRole("link", { name: "Besuch dokumentieren" }).click();
  await page.getByRole("button", { name: /^Mutter/ }).click();
  const narbe = page.getByRole("group", { name: "Kaiserschnittnarbe" });
  await expect(narbe).toBeVisible();
  await narbe.getByRole("button", { name: "reizlos" }).click();
  await narbe.getByRole("button", { name: "Fäden/Klammern entfernt" }).click();
  await expect(narbe.getByRole("button", { pressed: true })).toHaveCount(2);
  const brust = page.getByRole("group", { name: "Brust" });
  await brust.getByRole("button", { name: "gefüllt" }).click();
  await brust.getByRole("button", { name: "wunde Mamillen" }).click();
  await expect(brust.getByRole("button", { pressed: true })).toHaveCount(2);
  // zugeklappt zeigt die Kachel beide Werte
  await page.getByRole("button", { name: /^Mutter/ }).click();
  await expect(page.getByText(/Kaiserschnittnarbe reizlos, Fäden\/Klammern entfernt/)).toBeVisible();

  // Spontangeburt (Paul & Emma Hansen: primäre Sectio im Demo; Jonas Koch: vaginal-operativ) → kein Narbenfeld
  await page.goto("/klientinnen");
  await page.getByText("Svenja Koch").click();
  await page.getByRole("link", { name: "Besuch dokumentieren" }).click();
  await page.getByRole("button", { name: /^Mutter/ }).click();
  await expect(page.getByRole("group", { name: "Brust" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Kaiserschnittnarbe" })).toHaveCount(0);
});
