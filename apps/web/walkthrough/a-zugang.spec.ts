import { expect, test } from "@playwright/test";
import { anmelden, bild, karte, nurTablet, PASSWORT } from "./hilfen";

test("A1 Anmelden mit Demo-Knopf", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByText("Test-Umgebung – Demo-Zugang eintragen:")).toBeVisible();
  await bild(page, info, "A1-anmeldeseite");
  await page.getByRole("button", { name: /Johanna/ }).click();
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^(Moin|Guten (Morgen|Tag|Abend)), Johanna!$/);
  await expect(page.getByRole("link", { name: "Klientinnen" }).first()).toBeVisible();
  await bild(page, info, "A1-startseite", false);
});

test("A2 Falsches Passwort und Sperre nach 10 Versuchen", async ({ page, request }, info) => {
  test.skip(!nurTablet(info), "ein Durchlauf genügt");
  await page.goto("/");
  await page.getByLabel("E-Mail").fill("johanna@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill("falsch-falsch-falsch");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await bild(page, info, "A2-falsches-passwort", false);
  // Sperre: zweite Instanz mit Standardgrenze (10 Versuche / 15 Minuten), siehe docs/walkthrough-protokoll/README.md
  const zweite = process.env.SPERRE_URL;
  test.skip(!zweite, "SPERRE_URL nicht gesetzt");
  const status: number[] = [];
  for (let i = 0; i < 11; i++) {
    const r = await request.post(`${zweite}/api/auth/anmelden`, { data: { email: "johanna@kindkesmoeoen.test", passwort: "falsch" } });
    status.push(r.status());
  }
  // höchstens 10 Fehlversuche, danach 429 (Zähler gilt 15 Minuten je Adresse)
  const erste429 = status.indexOf(429);
  expect(erste429).toBeGreaterThan(-1);
  expect(erste429).toBeLessThanOrEqual(10);
  expect(status.slice(0, erste429).every((s) => s === 401)).toBe(true);
});

test("A3 Abmelden", async ({ page }, info) => {
  await anmelden(page, "johanna");
  if (!nurTablet(info)) await page.goto("/einstellungen");
  await page.getByRole("button", { name: "Abmelden" }).first().click();
  await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
  await page.goto("/klientinnen");
  await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
});

const NEU = "ganz-neues-passwort-2026";
test.afterAll(async ({ request }) => {
  // Falls A4 mittendrin abbricht: Demo-Passwort wiederherstellen
  const r = await request.post("/api/auth/anmelden", { data: { email: "johanna@kindkesmoeoen.test", passwort: NEU } });
  if (r.ok()) await request.post("/api/auth/passwort", { data: { altesPasswort: NEU, neuesPasswort: PASSWORT } });
});

test("A4 Passwort ändern", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  const neu = NEU;
  await anmelden(page, "johanna");
  await page.goto("/einstellungen/passwort");
  await page.getByLabel("Bisheriges Passwort").fill(PASSWORT);
  await page.getByLabel(/^Neues Passwort(?! wiederholen)/).fill(neu);
  await page.getByLabel("Neues Passwort wiederholen").fill(neu + "x");
  await expect(page.getByText("Die Passwörter stimmen nicht überein.")).toBeVisible();
  await bild(page, info, "A4-passwort-ungleich", false);
  await page.getByLabel("Neues Passwort wiederholen").fill(neu);
  await page.getByRole("button", { name: /speichern|ändern/i }).click();
  await expect(page.getByRole("status").or(page.getByText(/geändert/))).toBeVisible();
  await page.getByRole("button", { name: "Abmelden" }).first().click();
  await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
  await anmelden(page, "johanna", neu);
  // zurücksetzen
  await page.goto("/einstellungen/passwort");
  await page.getByLabel("Bisheriges Passwort").fill(neu);
  await page.getByLabel(/^Neues Passwort(?! wiederholen)/).fill(PASSWORT);
  await page.getByLabel("Neues Passwort wiederholen").fill(PASSWORT);
  await page.getByRole("button", { name: /speichern|ändern/i }).click();
  await expect(page.getByText(/geändert/)).toBeVisible();
});

test("A5 Mein Profil", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await page.goto("/einstellungen");
  await page.getByLabel("Telefon").fill("038203 12345");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(/gespeichert/i)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Telefon")).toHaveValue("038203 12345");
  await bild(page, info, "A5-profil");
});

test("A6 Orte mit Position aus der Adresse und Tourvorlage", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await page.goto("/einstellungen/orte");
  const orte = karte(page, "Orte");
  await orte.getByRole("button", { name: "Ort", exact: true }).click();
  await page.getByLabel("Bezeichnung").fill("Kita Kleine Strolche");
  await page.getByLabel("Art").selectOption({ index: 1 });
  await page.getByRole("textbox", { name: "Anschrift" }).fill("Am Markt 1, 18209 Bad Doberan");
  await page.getByLabel("Abholzeit (optional)").fill("15:30");
  await page.getByRole("button", { name: "Speichern" }).click();
  const neu = page.locator(".karte", { hasText: "Kita Kleine Strolche" });
  await expect(neu).toBeVisible();
  await expect(neu.getByRole("button", { name: "Auf der Karte zeigen" })).toBeVisible({ timeout: 15_000 });
  await neu.getByRole("button", { name: "Auf der Karte zeigen" }).click();
  await expect(karte(page, "Kita Kleine Strolche").getByText("Position aus der Adresse.")).toBeVisible();
  await bild(page, info, "A6-ort-aus-adresse");

  // ⚠️ Unbekannte Anschrift
  await orte.getByRole("button", { name: "Ort", exact: true }).click();
  await page.getByLabel("Bezeichnung").fill("Unbekannter Ort");
  await page.getByRole("textbox", { name: "Anschrift" }).fill("Gibtsnichtweg 999, 18209 Bad Doberan");
  await page.getByRole("button", { name: "Speichern" }).click();
  const unbekannt = page.locator(".karte", { hasText: "Unbekannter Ort" });
  await expect(unbekannt.getByRole("button", { name: "Position fehlt – auf der Karte setzen" })).toBeVisible();
  await unbekannt.getByRole("button", { name: "Position fehlt – auf der Karte setzen" }).click();
  const k = karte(page, "Unbekannter Ort");
  await k.getByRole("button", { name: "Aus Adresse ermitteln" }).click();
  await expect(k.getByRole("alert")).toBeVisible({ timeout: 15_000 });
  await bild(page, info, "A6-unbekannte-anschrift");
  // Von Hand setzen
  await k.getByRole("button", { name: "Auf der Karte setzen", exact: true }).click();
  const box = (await k.locator(".leaflet-container").boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(unbekannt.getByRole("button", { name: "Auf der Karte zeigen" })).toBeVisible();

  // Tourvorlage
  const vorlagen = karte(page, "Tourvorlagen");
  await vorlagen.getByRole("button", { name: /Tourvorlage|Vorlage/ }).first().click();
  await page.getByLabel("Name").fill("Freitagstour");
  await page.getByRole("button", { name: "Fr", exact: true }).click();
  await page.getByLabel("Abfahrt").fill("08:30");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Freitagstour")).toBeVisible();
  await bild(page, info, "A6-tourvorlage");
});

test("A7 Abrechnungseinstellungen", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await page.goto("/einstellungen/abrechnung");
  await page.getByLabel("Stichtag im Monat").fill("5");
  await page.getByLabel("Erinnerung (Tage vorher)").fill("3");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(/gespeichert/i)).toBeVisible();
  await expect(page.getByText(/Nächster Versand: 05\./)).toBeVisible();
  await bild(page, info, "A7-abrechnung");
});

test("A8 Praxisdaten", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await page.goto("/einstellungen/praxis");
  await expect(page.getByLabel("Name der Praxis")).not.toHaveValue("");
  await page.getByLabel("Telefon").fill("038203 99999");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(/gespeichert/i)).toBeVisible();
  await bild(page, info, "A8-praxis");
});

test("A9 Persönliche Ansicht der Dokumentation", async ({ page }, info) => {
  await anmelden(page, "johanna");
  await page.goto("/einstellungen/dokumentation");
  await expect(page.getByText("(nach Kaiserschnitt)").first()).toBeVisible();
  await bild(page, info, "A9-ansicht");
});
