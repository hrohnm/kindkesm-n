import { expect, test } from "@playwright/test";

const SCREENSHOTS = process.env.SCREENSHOT_ORDNER;

/** Funkloch: Tour vorladen, ohne Verbindung einen Besuch dokumentieren und abschließen, danach automatisch übertragen. */
test("Besuch ohne Verbindung dokumentieren und später übertragen", async ({ page, context }, info) => {
  // Je Projekt eine andere Familie aus Marielenas Tour von heute
  const familie = info.project.name === "handy" ? "Becker" : "Wolff";

  await page.goto("/");
  await page.getByLabel("E-Mail").fill("marielena@kindkesmoeoen.test");
  await page.getByLabel("Passwort").fill(process.env.DEMO_PASSWORT ?? "kindkes-demo-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: /Marielena/ })).toBeVisible();

  // Für unterwegs laden
  await page.goto("/einstellungen/offline");
  await page.getByRole("button", { name: "Für unterwegs laden" }).click();
  await expect(page.getByText(/Datensätze für heute und morgen auf dem Gerät gespeichert/)).toBeVisible({ timeout: 30_000 });

  await page.goto("/tour");
  const karte = page.locator("li", { hasText: familie }).filter({ has: page.getByRole("link", { name: "Dokumentieren" }) });
  await expect(karte).toBeVisible();

  // ---------------------------------------------------- Funkloch
  await context.setOffline(true);
  await karte.getByRole("link", { name: "Dokumentieren" }).click();
  await expect(page.getByRole("heading", { name: /Besuch dokumentieren/ })).toBeVisible();
  await page.getByLabel("Beginn").fill("08:00");
  await page.getByLabel("Ende").fill("08:40");
  await expect(page.getByText("vorläufig (offline)")).toBeVisible();
  if (await page.getByRole("button", { name: "Stattdessen auf Papier" }).isVisible()) await page.getByRole("button", { name: "Stattdessen auf Papier" }).click();
  await page.getByLabel(/hat die Zeile auf dem Formular unterschrieben/).check();
  await page.getByRole("button", { name: "Abschließen" }).click();

  // Zurück in der Tour: auf dem Gerät gespeichert, wartet auf Übertragung
  await expect(page.getByRole("heading", { name: "Tour" })).toBeVisible();
  await expect(page.getByText(/Ohne Verbindung auf dem Gerät gespeichert/).filter({ visible: true })).toBeVisible();
  await expect(page.locator("li", { hasText: familie }).getByTestId("offline-dokumentiert")).toBeVisible();
  await expect(page.getByTestId("offline-status").filter({ visible: true })).toContainText("1 Änderung warten");
  if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/${info.project.name}-offline.png`, fullPage: true });

  // App ohne Netz neu öffnen: Seite aus dem Service Worker, Anmeldung und Daten vom Gerät
  await page.reload();
  await expect(page.getByRole("heading", { name: "Tour" })).toBeVisible();
  await expect(page.locator("li", { hasText: familie }).getByTestId("offline-dokumentiert")).toBeVisible();

  // ---------------------------------------------------- wieder Netz
  await context.setOffline(false);
  await expect(page.getByTestId("offline-status").filter({ visible: true })).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator("li", { hasText: familie }).getByRole("link", { name: "Besuch ansehen" })).toBeVisible({ timeout: 15_000 });

  // Auf dem Server angekommen: Termin erledigt, Besuch abgeschlossen
  const heute = new Date();
  const iso = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, "0")}-${String(heute.getDate()).padStart(2, "0")}`;
  const tag = await (await page.request.get(`/api/touren/${iso}`)).json();
  const termin = tag.termine.find((t: { klientin: { name: string } }) => t.klientin.name.includes(familie));
  expect(termin.status).toBe("erledigt");
  expect(termin.klientin.besuchStatus).toBe("abgeschlossen");
});
