import { expect, test, type Page } from "@playwright/test";
import { anmelden, bild, karte, nurTablet, unterschreiben } from "./hilfen";

const inTagen = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

async function akteOeffnen(page: Page, name: string) {
  await page.goto("/klientinnen");
  await page.getByRole("button", { name: "Alle", exact: true }).last().click();
  await page.getByPlaceholder("Name oder Ort suchen").fill(name.split(" ")[1]!);
  await page.getByRole("link", { name: new RegExp(name) }).first().click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test("B1 Tagesstart im Cockpit", async ({ page }, info) => {
  await anmelden(page, "johanna");
  await expect(page.getByRole("heading", { name: "Heute", exact: true })).toBeVisible();
  await expect(page.getByText("Tour heute")).toBeVisible();
  await expect(page.getByRole("link", { name: "Zur Tour ›" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Offene Dokumentationen" })).toBeVisible();
  await expect(page.getByText("Fristen und Hinweise")).toBeVisible();
  await bild(page, info, "B1-cockpit");
  // Hinweise mit Link führen zur passenden Seite
  const hinweisLink = page.locator("section", { hasText: "Fristen und Hinweise" }).getByRole("link").first();
  if (await hinweisLink.count()) {
    const ziel = await hinweisLink.getAttribute("href");
    await hinweisLink.click();
    await expect(page).toHaveURL(new RegExp(ziel!.replace(/[?]/g, "\\?")));
  }
});

test("C1 Neue Klientin anlegen (Position aus Adresse)", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await page.goto("/klientinnen");
  await page.getByRole("button", { name: "Neue Klientin" }).click();
  await page.getByLabel("Vorname").fill("Testa");
  await page.getByLabel("Nachname").fill("Wanderer");
  await page.getByLabel("Errechneter Termin").fill(inTagen(60));
  await page.getByLabel("Telefon").fill("0381 123456");
  await page.getByLabel("Straße und Hausnummer").fill("Am Markt 1");
  await page.getByLabel("PLZ").fill("18209");
  await page.getByLabel("Ort").fill("Bad Doberan");
  await bild(page, info, "C1-formular", false);
  await page.getByRole("button", { name: "Anlegen" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Testa Wanderer" })).toBeVisible();
  await expect(karte(page, "Betreuung").getByText("Schwangerschaft")).toBeVisible();
  await expect(karte(page, "Betreuung").getByText(/heute SSW/)).toBeVisible();
  await expect(karte(page, "Wohnung auf der Karte").getByText(/Position (aus der Adresse|ungefähr)/)).toBeVisible();
  await bild(page, info, "C1-neue-akte");
});

test("C2 Suchen und filtern", async ({ page }, info) => {
  await anmelden(page, "marielena");
  await page.goto("/klientinnen");
  await expect(page.getByRole("link", { name: /Maria Hansen/ })).toContainText("Risiko");
  await page.getByRole("button", { name: "Wochenbett", exact: true }).click();
  await expect(page.getByRole("link", { name: /Sophie Berger/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Laura Becker/ })).toContainText("Lebenstag");
  await page.getByRole("button", { name: "Anfrage", exact: true }).click();
  await expect(page.getByRole("link", { name: /Jana Wolff/ })).toBeVisible();
  await page.getByRole("button", { name: "Alle", exact: true }).last().click();
  await page.getByRole("button", { name: "Meine", exact: true }).click();
  await expect(page.getByRole("link", { name: /Sophie Berger/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Maria Hansen/ })).toBeVisible();
  await page.getByRole("button", { name: "Alle", exact: true }).first().click();
  await page.getByPlaceholder("Name oder Ort suchen").fill("Rerik");
  await page.waitForTimeout(500);
  await bild(page, info, "C2-suche");
  await page.getByPlaceholder("Name oder Ort suchen").fill("Krüger");
  await expect(page.getByRole("link", { name: /Lena Krüger/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Maria Hansen/ })).toHaveCount(0);
});

test("C3 Stammdaten und Anschrift ändern", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await akteOeffnen(page, "Testa Wanderer");
  const stamm = karte(page, "Stammdaten");
  await stamm.getByRole("button", { name: "Bearbeiten" }).click();
  await stamm.getByLabel("Versichertennummer").fill("123");
  await stamm.getByLabel("Kassen-IK").fill("12");
  await stamm.getByRole("button", { name: "Speichern" }).click();
  await expect(stamm.locator(".text-tulpe-500, [role=alert]").first()).toBeVisible();
  await bild(page, info, "C3-feldfehler", false);
  await stamm.getByLabel("Versichertennummer").fill("A123456780");
  await stamm.getByLabel("Kassen-IK").fill("109519005");
  await stamm.getByLabel("Krankenkasse").fill("AOK Nordost");
  await stamm.getByLabel("Straße").fill("Mollistraße 10");
  await stamm.getByRole("button", { name: "Speichern" }).click();
  await expect(stamm.getByText("AOK Nordost (IK 109519005)")).toBeVisible();
  await expect(page.getByText(/Mollistraße 10, 18209 Bad Doberan/)).toBeVisible();
  await expect(karte(page, "Wohnung auf der Karte").getByText(/Position (aus der Adresse|ungefähr)/)).toBeVisible();
});

test("C4 Betreuung bearbeiten", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await akteOeffnen(page, "Testa Wanderer");
  const b = karte(page, "Betreuung");
  await b.getByRole("button", { name: "Bearbeiten" }).click();
  await b.getByLabel("Gravida").fill("2");
  await b.getByLabel("Para").fill("1");
  await b.getByLabel("Geburtsort").fill("Klinikum Südstadt Rostock");
  await b.getByLabel("Art der Geburt").selectOption("sectio_primaer");
  await b.getByLabel("Notizen").fill("Geplante Sectio wegen BEL");
  await bild(page, info, "C4-betreuung-formular", false);
  await b.getByRole("button", { name: "Speichern" }).click();
  await expect(b.getByText("Primäre Sectio (geplant)")).toBeVisible();
  await expect(b.getByText("2 / 1")).toBeVisible();
});

test("C5 Geburt erfassen (Kaiserschnitt → Narbenfeld im Besuch)", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await akteOeffnen(page, "Testa Wanderer");
  await page.getByRole("button", { name: "Geburt / Kind erfassen" }).click();
  const f = page.locator("form", { has: page.getByLabel("Geburtsgewicht (g)") });
  await f.getByLabel("Vorname").fill("Fiete");
  await f.getByLabel("Geburtsdatum").fill(inTagen(-3));
  await f.getByLabel("Uhrzeit").fill("07:42");
  await f.getByLabel("Geschlecht").selectOption({ index: 2 });
  await f.getByLabel("Geburtsgewicht (g)").fill("3480");
  await f.getByLabel("Länge (cm)").fill("51");
  await f.getByLabel("Kopfumfang (cm)").fill("35,5");
  await expect(f.getByLabel("Art der Geburt")).toHaveValue("sectio_primaer");
  await bild(page, info, "C5-kind-formular", false);
  await f.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Fiete")).toBeVisible();
  await expect(karte(page, "Betreuung").getByText("Wochenbett")).toBeVisible();
  await expect(page.getByText(/4\. Lebenstag/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Wachstum und Perzentilen ›" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kinderurkunde ›" })).toBeVisible();
  await bild(page, info, "C5-akte-mit-kind");
  await page.getByRole("link", { name: "Besuch dokumentieren" }).click();
  await page.getByRole("button", { name: /^Mutter/ }).first().click().catch(() => {});
  await expect(page.getByText("Kaiserschnittnarbe").first()).toBeVisible();
});

test("C6 Merkmale", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await akteOeffnen(page, "Testa Wanderer");
  const m = karte(page, "Merkmale");
  await m.getByRole("button", { name: "Bearbeiten" }).click();
  await m.getByRole("button", { name: "Erstgebärend" }).click();
  await m.getByRole("button", { name: "Psychische Belastung" }).click();
  await m.getByLabel("Allergien").fill("Penicillin");
  await m.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Allergien: Penicillin" })).toBeVisible();
  await expect(page.getByText("Psychische Belastung").first()).toBeVisible();
  await page.goto("/klientinnen");
  await expect(page.getByRole("link", { name: /Testa Wanderer/ })).toContainText("Erstgebärend");
});

test("C7 Kontakte anlegen, bearbeiten, löschen", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await akteOeffnen(page, "Testa Wanderer");
  const k = karte(page, "Kontakte");
  await k.getByRole("button", { name: "Kontakt" }).click();
  await k.getByLabel("Art").selectOption({ label: "Partner/in, Begleitperson" });
  await k.getByLabel("Name").fill("Tom Wanderer");
  await k.getByLabel("Telefon").fill("0170 1234567");
  await k.getByLabel("E-Mail").fill("tom@example.org");
  await k.getByRole("button", { name: "Speichern" }).click();
  const eintrag = k.getByTestId("kontakt").filter({ hasText: "Tom Wanderer" });
  await expect(eintrag).toBeVisible();
  await expect(eintrag.locator('a[href^="tel:"]')).toHaveAttribute("href", /tel:0170/);
  await expect(eintrag.locator('a[href^="mailto:"]')).toHaveAttribute("href", "mailto:tom@example.org");
  await eintrag.getByRole("button", { name: "Tom Wanderer bearbeiten" }).click();
  await k.getByLabel("Notiz").fill("erreichbar ab 17 Uhr");
  await k.getByRole("button", { name: "Speichern" }).click();
  await expect(eintrag).toContainText("erreichbar ab 17 Uhr");
  await bild(page, info, "C7-kontakte", false);
  await eintrag.getByRole("button", { name: "Tom Wanderer bearbeiten" }).click();
  page.once("dialog", (d) => d.accept());
  await k.getByRole("button", { name: "Kontakt löschen" }).click();
  await expect(eintrag).toHaveCount(0);
});

test("C8 Einwilligungen erteilen und widerrufen", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await akteOeffnen(page, "Testa Wanderer");
  const urkunde = page.getByTestId("einwilligung").filter({ hasText: "Kinderurkunde" });
  await urkunde.getByRole("button", { name: "Erfassen" }).click();
  await urkunde.getByLabel("Form").selectOption({ label: "auf dem Tablet unterschrieben" });
  await expect(urkunde.getByRole("button", { name: "Einwilligung erteilt" })).toBeDisabled();
  await unterschreiben(page, urkunde.getByLabel("Unterschriftenfeld"));
  await urkunde.getByRole("button", { name: "Einwilligung erteilt" }).click();
  await expect(urkunde.getByText(/✓ erteilt .* auf dem Tablet unterschrieben/)).toBeVisible();

  const mail = page.getByTestId("einwilligung").filter({ hasText: "Kontakt per E-Mail" });
  await mail.getByRole("button", { name: "Erfassen" }).click();
  await mail.getByLabel("Form").selectOption({ label: "mündlich" });
  await mail.getByRole("button", { name: "Einwilligung erteilt" }).click();
  await expect(mail.getByText(/✓ erteilt .* mündlich/)).toBeVisible();
  await mail.getByRole("button", { name: "Ändern" }).click();
  page.once("dialog", (d) => d.accept());
  await mail.getByRole("button", { name: "Widerrufen" }).click();
  await expect(mail.getByText(/widerrufen \d\d\.\d\d\.\d{4}/)).toBeVisible();
  await urkunde.getByRole("button", { name: "Ändern" }).click();
  await expect(urkunde.getByRole("img", { name: "Unterschrift zur Einwilligung" })).toBeVisible();
  await bild(page, info, "C8-einwilligungen");
});

test("C9 Wohnung auf der Karte", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await akteOeffnen(page, "Testa Wanderer");
  const k = karte(page, "Wohnung auf der Karte");
  await k.getByRole("button", { name: "Position korrigieren" }).click();
  await expect(k.getByText("Auf die Karte tippen, wo sich die Haustür befindet.")).toBeVisible();
  // Karte erst ins Bild holen – Mausklicks wirken nur im sichtbaren Bereich
  await k.locator(".leaflet-container").scrollIntoViewIfNeeded();
  const box = (await k.locator(".leaflet-container").boundingBox())!;
  await page.mouse.click(box.x + box.width / 2 + 40, box.y + box.height / 2 + 20);
  await expect(k.getByText("Position von Hand gesetzt.")).toBeVisible();
  await k.getByRole("button", { name: "Fertig" }).click();
  await bild(page, info, "C9-von-hand");
  await k.getByRole("button", { name: "Aus Adresse ermitteln" }).click();
  await expect(k.getByText(/Position (aus der Adresse|ungefähr)/)).toBeVisible();

  // ⚠️ Anschrift nicht auffindbar
  const stamm = karte(page, "Stammdaten");
  await stamm.getByRole("button", { name: "Bearbeiten" }).click();
  await stamm.getByLabel("Straße").fill("Gibtsnichtweg 999");
  await stamm.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(/Gibtsnichtweg 999/).first()).toBeVisible();
  await k.getByRole("button", { name: "Aus Adresse ermitteln" }).click();
  await expect(k.getByRole("alert")).toBeVisible({ timeout: 15_000 });
  await bild(page, info, "C9-nicht-gefunden", false);
  // zurück auf eine gültige Anschrift
  await stamm.getByRole("button", { name: "Bearbeiten" }).click();
  await stamm.getByLabel("Straße").fill("Mollistraße 10");
  await stamm.getByRole("button", { name: "Speichern" }).click();
});

test("C10 Vertretung", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await akteOeffnen(page, "Lena Krüger");
  const b = karte(page, "Betreuung");
  await b.getByRole("button", { name: "Bearbeiten" }).click();
  await b.getByRole("combobox", { name: /^Vertretung/ }).selectOption({ label: "Marielena Pontus" });
  await b.getByRole("button", { name: "Speichern" }).click();
  await expect(b.getByText("Marielena Pontus")).toBeVisible();
  await page.getByRole("button", { name: "Abmelden" }).first().click();
  await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
  await anmelden(page, "marielena");
  await page.goto("/klientinnen");
  await page.getByRole("button", { name: "Meine", exact: true }).click();
  await expect(page.getByRole("link", { name: /Lena Krüger/ })).toContainText("Vertretung durch mich");
  await bild(page, info, "C10-vertretung");
});

test("C11 Formular für die Mappe drucken", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ein Durchlauf genügt");
  await anmelden(page, "johanna");
  for (const [name, nr] of [["Sophie Berger", "3.1"], ["Lena Krüger", "3.3"]] as const) {
    await akteOeffnen(page, name);
    const link = page.getByRole("link", { name: `Formular ${nr} drucken` });
    await expect(link).toBeVisible();
    const res = await page.request.get((await link.getAttribute("href"))!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
    expect((await res.body()).subarray(0, 4).toString()).toBe("%PDF");
  }
});

test("C12 Kontingente und Besuchsliste", async ({ page }, info) => {
  await anmelden(page, "johanna");
  await akteOeffnen(page, "Lena Krüger");
  await expect(page.getByRole("heading", { name: "Kontingente" })).toBeVisible();
  await expect(page.getByRole("progressbar").first()).toBeVisible();
  const besuche = page.locator("section", { has: page.getByRole("heading", { name: "Besuche", exact: true }) });
  await expect(besuche.getByText(/GPOS \d+XX/).first()).toBeVisible();
  await expect(besuche.getByText(/✓ (Tablet|Papier)-Unterschrift/).first()).toBeVisible();
  await page.getByRole("heading", { name: "Kontingente" }).scrollIntoViewIfNeeded();
  await bild(page, info, "C12-kontingente-besuche", false);
});
