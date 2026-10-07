import { expect, test } from "@playwright/test";

// 1×1-Pixel-PNG (kein echtes Foto)
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

/** M17: Fotos in der Akte – Verlauf, Aufnahme, Löschen, Sperre ohne Einwilligung. */
test("Fotoverlauf ansehen, Foto aufnehmen und löschen", async ({ page }, info) => {
  test.skip(info.project.name !== "ipad-quer", "ändert gemeinsame Daten – ein Durchlauf genügt");
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("johanna@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: /Johanna/ })).toBeVisible();

  // Demo: Anna Schulz – Nabelverlauf von Mats (3 Fotos)
  await page.goto("/klientinnen");
  await page.getByRole("link", { name: /Schulz/ }).first().click();
  const karte = page.locator("section").filter({ has: page.getByRole("heading", { name: "Fotos" }) });
  await expect(karte.getByTestId("foto")).toHaveCount(3);
  await expect(karte.getByRole("button", { name: "Nabel (3)" })).toBeVisible();
  // Bild wird entschlüsselt geladen
  await karte.getByTestId("foto").first().scrollIntoViewIfNeeded(); // Bilder laden erst sichtbar (lazy)
  await expect.poll(async () => karte.getByTestId("foto").first().locator("img").evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);

  // Neues Foto (Haut, Mats)
  await karte.getByRole("combobox", { name: "Bereich" }).selectOption({ label: "Haut" });
  await karte.getByRole("combobox", { name: "Kind" }).selectOption({ label: "Mats" });
  await karte.getByLabel("Notiz (optional)").fill("E2E Ausschlag Wange");
  await karte.getByLabel("Foto aufnehmen").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
  await expect(karte.getByText("Foto gespeichert.")).toBeVisible();
  await expect(karte.getByRole("button", { name: "Haut (1)" })).toHaveAttribute("aria-pressed", "true");
  const neu = karte.getByTestId("foto").filter({ hasText: "E2E Ausschlag Wange" });
  await expect(neu).toContainText("Haut · Mats");

  // Vergrößern und löschen
  await neu.getByRole("button", { name: /vergrößern/ }).click();
  const dialog = page.getByRole("dialog", { name: "Foto" });
  await expect(dialog.getByRole("img")).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await dialog.getByRole("button", { name: "Löschen" }).click();
  await expect(dialog).toHaveCount(0);
  await karte.getByRole("button", { name: /^Alle/ }).click();
  await expect(karte.getByTestId("foto")).toHaveCount(3);

  // Ohne Einwilligung (Demo: Laura Becker hat Fotos abgelehnt): keine Aufnahme möglich
  await page.goto("/klientinnen");
  await page.getByRole("link", { name: /Becker/ }).first().click();
  const becker = page.locator("section").filter({ has: page.getByRole("heading", { name: "Fotos" }) });
  await expect(becker.getByText("Fotos nur mit Einwilligung")).toBeVisible();
  await expect(becker.getByLabel("Foto aufnehmen")).toHaveCount(0);
});
