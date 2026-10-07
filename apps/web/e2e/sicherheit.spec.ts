import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const SCREENSHOTS = process.env.SCREENSHOT_ORDNER;
const PASSWORT = process.env.DEMO_PASSWORT ?? "kindkes-demo-2026";

/** TOTP wie eine Authenticator-App (RFC 6238, SHA-1, 30 s, 6 Ziffern) */
function totp(geheimnis: string, versatz = 0) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const z of geheimnis.replace(/\s/g, "")) bits += alphabet.indexOf(z).toString(2).padStart(5, "0");
  const schluessel = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const zaehler = Buffer.alloc(8);
  zaehler.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + versatz));
  const h = createHmac("sha1", schluessel).update(zaehler).digest();
  const o = h[h.length - 1]! & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

async function anmeldenBis(page: Page, email: string) {
  await page.goto("/");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(PASSWORT);
  await page.getByRole("button", { name: "Anmelden" }).click();
}

/** M25: Zwei-Faktor-Anmeldung einrichten und nutzen, App-Sperre, Geräte abmelden. */
test("Zwei-Faktor-Anmeldung, App-Sperre und Geräte", async ({ page, browser }, info) => {
  test.skip(info.project.name !== "ipad-quer", "ändert ein gemeinsames Konto – ein Durchlauf genügt");
  // Lorina (Babypause) – wird in den anderen Browser-Tests nicht angemeldet
  await anmeldenBis(page, "lorina@kindkesmoeoen.test");
  await expect(page.getByRole("heading", { name: /Lorina/ })).toBeVisible();
  await page.goto("/einstellungen/sicherheit");
  await expect(page.getByRole("heading", { name: "Zwei-Faktor-Anmeldung" })).toBeVisible();
  await page.getByRole("button", { name: "Einrichten" }).click();
  await page.getByLabel("1. Passwort eingeben").fill(PASSWORT);
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page.getByAltText("QR-Code für die Authenticator-App")).toBeVisible();
  const geheimnis = (await page.getByTestId("totp-schluessel").textContent())!;
  await page.getByLabel(/3\. Angezeigten/).fill(totp(geheimnis));
  await page.getByRole("button", { name: "Einschalten" }).click();
  const codes = page.getByTestId("wiederherstellungscodes").getByRole("listitem");
  await expect(codes).toHaveCount(8);
  if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/${info.project.name}-sicherheit.png`, fullPage: true });
  const ersatz = (await codes.first().textContent())!;
  await page.getByRole("button", { name: "Ich habe die Codes gespeichert" }).click();
  await expect(page.getByText("eingeschaltet")).toBeVisible();

  // Zweites Gerät: Anmeldung verlangt den Code; Wiederherstellungscode geht auch
  const tablet = await browser.newContext();
  const p2 = await tablet.newPage();
  await anmeldenBis(p2, "lorina@kindkesmoeoen.test");
  await expect(p2.getByText("Bitte den 6-stelligen Code")).toBeVisible();
  await p2.getByLabel("Code").fill("000000");
  await p2.getByRole("button", { name: "Bestätigen" }).click();
  await expect(p2.getByText(/Code ist falsch/)).toBeVisible();
  await p2.getByLabel("Code").fill(ersatz);
  await p2.getByRole("button", { name: "Bestätigen" }).click();
  await expect(p2.getByRole("heading", { name: /Lorina/ })).toBeVisible();

  // Geräteliste auf dem ersten Gerät: das zweite abmelden
  await page.reload();
  const geraete = page.getByTestId("geraet");
  await expect(geraete.filter({ hasText: "dieses Gerät" })).toHaveCount(1);
  expect(await geraete.count()).toBeGreaterThanOrEqual(2);
  await page.getByRole("button", { name: "Alle anderen Geräte abmelden" }).click();
  await expect(page.getByText(/Geräte? abgemeldet\./)).toBeVisible();
  await expect(geraete).toHaveCount(1);
  await p2.reload();
  await expect(p2.getByRole("button", { name: "Anmelden" })).toBeVisible();
  await tablet.close();

  // App-Sperre: nach 5 Minuten ohne Bedienung
  await page.getByLabel("Sperren nach").selectOption("5");
  await expect(page.getByText("Gespeichert")).toBeVisible();
  await page.clock.install();
  await page.reload();
  await page.clock.fastForward("06:00");
  const sperre = page.getByRole("dialog");
  await expect(sperre.getByRole("heading", { name: "Gesperrt" })).toBeVisible();
  // Hintergrund ist während der Sperre nicht bedienbar
  expect(await page.locator("#app-inhalt").evaluate((e) => (e as HTMLElement).inert)).toBe(true);
  await sperre.getByLabel("Passwort").fill("falsch-falsch");
  await sperre.getByRole("button", { name: "Entsperren" }).click();
  await expect(sperre.getByText("Das Passwort ist falsch.")).toBeVisible();
  await sperre.getByLabel("Passwort").fill(PASSWORT);
  await sperre.getByRole("button", { name: "Entsperren" }).click();
  await expect(page.getByRole("heading", { name: "Gesperrt" })).toHaveCount(0);
  await page.getByLabel("Sperren nach").selectOption("15");

  // Aufräumen: Zwei-Faktor wieder aus
  await page.getByLabel("Passwort (zur Bestätigung)").fill(PASSWORT);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Ausschalten" }).click();
  await expect(page.getByText("Zwei-Faktor-Anmeldung ausgeschaltet.")).toBeVisible();
});
