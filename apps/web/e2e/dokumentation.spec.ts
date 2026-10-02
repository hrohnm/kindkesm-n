import { expect, test } from "@playwright/test";

test("Eigene Ansicht, Felder einblenden, Kacheln zuklappen und Gewichtsverlauf", async ({ page }, info) => {
  test.skip(info.project.name !== "ipad-quer", "Einstellungen sind je Konto gespeichert – ein Durchlauf genügt");
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("johanna@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: "Tour heute" })).toBeVisible();

  // Puls ausblenden
  await page.goto("/einstellungen/dokumentation");
  await page.getByLabel("Puls anzeigen").uncheck();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Gespeichert.")).toBeVisible();

  // Im Besuch: Puls verborgen, aber einblendbar; letzter Wert sichtbar
  await page.goto("/klientinnen");
  await page.getByText("Lena Krüger").click();
  await page.getByRole("link", { name: "Besuch dokumentieren" }).click();
  // Kacheln sind standardmäßig zugeklappt
  await expect(page.getByLabel("RR systolisch (mmHg)")).toHaveCount(0);
  await page.getByRole("button", { name: /^Mutter/ }).click();
  await page.getByRole("button", { name: /^Ole/ }).click();
  await expect(page.getByLabel("RR systolisch (mmHg)")).toBeVisible();
  await expect(page.getByLabel("Puls (/min)")).toHaveCount(0);
  await page.getByRole("button", { name: /Weitere Felder einblenden \(Puls\)/ }).click();
  await expect(page.getByLabel("Puls (/min)")).toBeVisible();
  // je nach Uhrzeit ist der Entwurf von heute 9:00 (3.310 g) oder der Besuch von gestern (3.270 g) der letzte
  await expect(page.getByText(/Zuletzt .*: 3\.?(270|310) g/).first()).toBeVisible();

  // Kachel Mutter zuklappen
  await page.getByRole("button", { name: "Mutter", exact: true }).click();
  await expect(page.getByLabel("RR systolisch (mmHg)")).toHaveCount(0);

  // Einstellung zurücksetzen (andere Tests erwarten den Standard)
  await page.goto("/einstellungen/dokumentation");
  await page.getByRole("button", { name: "Auf Standard zurücksetzen" }).click();
  await expect(page.getByLabel("Puls anzeigen")).toBeChecked();

  // Gewichtsseite
  await page.goto("/klientinnen");
  await page.getByText("Lena Krüger").click();
  await page.getByRole("link", { name: /Wachstum und Perzentilen/ }).click();
  await expect(page.getByRole("heading", { name: "Wachstum Ole" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Gewichtskurve/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: "3.480 g" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Geburt" })).toBeVisible();
  // Länge und Kopfumfang (WHO)
  await page.getByRole("tab", { name: "Länge" }).click();
  await expect(page.getByRole("img", { name: /Längenkurve/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: "52 cm" })).toBeVisible();
  await page.getByRole("tab", { name: "Kopfumfang" }).click();
  await expect(page.getByRole("img", { name: /Kopfumfangskurve/ })).toBeVisible();
});
