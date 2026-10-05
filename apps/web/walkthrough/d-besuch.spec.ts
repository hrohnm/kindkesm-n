import { expect, test, type Page } from "@playwright/test";
import { anmelden, bild, karte, nurTablet } from "./hilfen";

async function akteOeffnen(page: Page, name: string) {
  await page.goto("/klientinnen");
  await page.getByRole("button", { name: "Alle", exact: true }).last().click();
  await page.getByRole("link", { name: new RegExp(name) }).first().click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test("D1 Wochenbett-Hausbesuch aus der Tour (Papier-Unterschrift)", async ({ page }, info) => {
  await anmelden(page, info.project.name === "handy" ? "marielena" : "johanna");
  await page.goto("/tour");
  const termin = page.locator("li.karte", { has: page.getByRole("link", { name: "Dokumentieren", exact: true }) }).first();
  const name = (await termin.locator("a").first().textContent())!;
  await bild(page, info, "D1-tour");
  await termin.getByRole("link", { name: "Dokumentieren", exact: true }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`${name} · Besuch dokumentieren`) })).toBeVisible();
  await expect(page.getByRole("link", { name: "‹ Tour" })).toBeVisible();
  await page.getByLabel("Beginn").fill("08:15");
  await page.getByLabel("Ende").fill("08:55");
  await page.getByRole("button", { name: /^Mutter/ }).click();
  await page.getByLabel("Notiz / Beratung").fill("Stillberatung, Anlegen geübt");
  await page.getByRole("button", { name: /Einzelheiten/ }).click();
  await expect(page.getByText(/× 5 Min\./).first()).toBeVisible();
  const papier = page.getByLabel(/hat die Zeile auf dem Formular unterschrieben/);
  if (!(await papier.isVisible())) await page.getByRole("button", { name: "Stattdessen auf Papier" }).click();
  await expect(page.getByText(/Auf Formular 3\.\d eintragen:/)).toBeVisible();
  await page.getByLabel(/hat die Zeile auf dem Formular unterschrieben/).check();
  await bild(page, info, "D1-besuch");
  await page.getByRole("button", { name: "Abschließen" }).click();
  await expect(page).toHaveURL(/\/tour\//);
  const erledigt = page.locator("li.karte", { hasText: name });
  await expect(erledigt.getByRole("link", { name: "Besuch ansehen" })).toBeVisible();
  await expect(erledigt.getByText("✓")).toBeVisible();
});

test("D3 Vorsorge in der Praxis mit Material", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await akteOeffnen(page, "Sophie Berger");
  await page.getByRole("link", { name: "Besuch dokumentieren" }).click();
  await page.getByRole("button", { name: "In der Praxis", exact: true }).click();
  await page.getByRole("combobox", { name: "Leistung" }).selectOption({ label: "Vorsorgeuntersuchung" });
  await page.getByLabel("Beginn").fill("09:00");
  await page.getByLabel("Ende").fill("09:40");
  const material = page.locator("div", { has: page.locator("span.etikett", { hasText: "Material" }) }).last().getByRole("button");
  await material.first().click();
  await expect(material.first()).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Einzelheiten/ }).click();
  const tabelle = page.locator("table").first();
  await expect(tabelle).toContainText(/602|603|604|605|607/);
  await expect(tabelle).not.toContainText(/5010|5020/); // kein Wegegeld
  await bild(page, info, "D3-vorsorge-material", false);
});

test("D4 Entwurf, weiterdokumentieren, löschen", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await akteOeffnen(page, "Sophie Berger");
  await page.getByRole("link", { name: "Besuch dokumentieren" }).click();
  await page.getByLabel("Beginn").fill("14:00");
  await page.getByLabel("Ende").fill("14:30");
  await page.getByRole("button", { name: "Entwurf", exact: true }).click();
  // zurück in der Akte, Besuch als Entwurf gelistet
  await expect(page.getByRole("heading", { level: 1, name: "Sophie Berger" })).toBeVisible();
  await expect(page.getByRole("link", { name: /14:00–14:30.*Entwurf/ })).toBeVisible();
  await page.goto("/");
  const offen = page.locator("section", { has: page.getByRole("heading", { name: "Offene Dokumentationen" }) });
  await expect(offen.getByRole("link", { name: /Sophie Berger/ }).first()).toBeVisible();
  await bild(page, info, "D4-offene-dokumentationen", false);
  await offen.getByRole("link", { name: /Sophie Berger/ }).first().click();
  await expect(page.getByRole("heading", { name: /Sophie Berger · Besuch bearbeiten/ })).toBeVisible();
  await expect(page.getByLabel("Ende")).toHaveValue("14:30");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Löschen" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sophie Berger" })).toBeVisible();
  await expect(page.locator("section", { has: page.getByRole("heading", { name: "Besuche", exact: true }) }).getByText("Entwurf")).toHaveCount(0);
});

test("D5 Prüfhinweise der Abrechnung", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ein Durchlauf genügt");
  await anmelden(page, "johanna");
  await akteOeffnen(page, "Lena Krüger");
  await page.getByRole("link", { name: "Besuch dokumentieren" }).click();
  // Ende vor Beginn
  await page.getByLabel("Beginn").fill("11:00");
  await page.getByLabel("Ende").fill("10:00");
  await expect(page.getByText(/\d+ Fehler/)).toBeVisible();
  await expect(page.getByText(/Ende liegt vor dem Beginn/)).toBeVisible();
  // Beginn = Ende
  await page.getByLabel("Ende").fill("11:00");
  await expect(page.getByText(/mindestens 5 Minuten/)).toBeVisible();
  await bild(page, info, "D5-ende-vor-beginn", false);
  // sehr lange Dauer
  await page.getByLabel("Beginn").fill("08:00");
  await page.getByLabel("Ende").fill("12:30");
  await page.getByRole("button", { name: /Einzelheiten/ }).click();
  await expect(page.getByText(/über der abrechenbaren Höchstdauer/)).toBeVisible();
  await bild(page, info, "D5-lange-dauer", false);
  // Abschließen ohne Unterschrift wird abgelehnt
  await page.getByLabel("Ende").fill("08:45");
  await page.getByRole("button", { name: "Abschließen" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /Unterschrift/ }).first()).toBeVisible();
  await bild(page, info, "D5-ohne-unterschrift", false);
});

test("D7 Wachstum aus dem Besuch", async ({ page }, info) => {
  await anmelden(page, "johanna");
  await akteOeffnen(page, "Lena Krüger");
  await page.getByRole("link", { name: "Besuch dokumentieren" }).click();
  await page.getByRole("button", { name: /^Ole/ }).click();
  await page.getByLabel("Gewicht (g)").first().fill("3600");
  await page.getByRole("button", { name: "Wachstum", exact: true }).click();
  const fenster = page.getByRole("dialog");
  await expect(fenster).toBeVisible();
  await expect(fenster.getByRole("tab", { name: "Länge" })).toBeVisible();
  await expect(fenster.getByText(/3\.600 g/).first()).toBeVisible();
  await bild(page, info, "D7-wachstum-fenster", false);
  await fenster.getByRole("tab", { name: "Kopfumfang" }).click();
  await page.keyboard.press("Escape");
  await expect(fenster).toHaveCount(0);
  await expect(page.getByLabel("Gewicht (g)").first()).toHaveValue("3600");
});

test("D8 Abgeschlossenen Besuch korrigieren", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await akteOeffnen(page, "Lena Krüger");
  const besuche = page.locator("section", { has: page.getByRole("heading", { name: "Besuche", exact: true }) });
  await besuche.getByRole("link").filter({ hasText: /✓ (Tablet|Papier)-Unterschrift/ }).first().click();
  await expect(page.getByRole("heading", { name: /Besuch \(abgeschlossen\)/ })).toBeVisible();
  await expect(page.getByLabel("Datum")).toBeDisabled();
  await expect(page.getByLabel("Beginn")).toBeDisabled();
  await expect(page.getByText(/Korrekturen laut § 12/)).toBeVisible();
  const url = page.url();
  await page.getByLabel("Notiz / Beratung").fill("Nachtrag: Nabel abgeheilt");
  await page.getByRole("button", { name: "Änderungen speichern" }).click();
  await page.waitForTimeout(1000);
  await page.goto(url);
  await expect(page.getByText(/frühere Version\(en\) gespeichert/)).toBeVisible();
  await expect(page.getByLabel("Notiz / Beratung")).toHaveValue("Nachtrag: Nabel abgeheilt");
  await bild(page, info, "D8-korrektur", false);
});

test("D9 Besuch einer Kollegin nur lesbar", async ({ page }, info) => {
  await anmelden(page, "marielena");
  await akteOeffnen(page, "Lena Krüger");
  const besuche = page.locator("section", { has: page.getByRole("heading", { name: "Besuche", exact: true }) });
  await besuche.getByRole("link").filter({ hasText: /JM · GPOS.*(Tablet|Papier)-Unterschrift/ }).first().click();
  await expect(page.getByText("Dieser Besuch wurde von einer Kollegin dokumentiert und kann nur von ihr geändert werden.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Abschließen|Änderungen speichern/ })).toHaveCount(0);
  await bild(page, info, "D9-kollegin", false);
});
