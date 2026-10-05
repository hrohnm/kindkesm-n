import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { anmelden, bild, karte, nurTablet } from "./hilfen";

const iso = (tage: number) => {
  const d = new Date();
  d.setDate(d.getDate() + tage);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

async function kindSeite(page: Page, klientin: string, kind: string, link: "Wachstum und Perzentilen ›" | "Kinderurkunde ›") {
  await page.goto("/klientinnen");
  await page.getByRole("button", { name: "Alle", exact: true }).last().click();
  await page.getByRole("link", { name: new RegExp(klientin) }).first().click();
  await page.locator(".karte", { hasText: kind }).filter({ has: page.getByRole("link", { name: link }) }).first().getByRole("link", { name: link }).click();
}

// ------------------------------------------------------------------ E. Wachstum und Kinderurkunde
test("E1 Wachstumsseite mit Gewicht, Länge, Kopfumfang", async ({ page }, info) => {
  await anmelden(page, "johanna");
  await kindSeite(page, "Lena Krüger", "Ole", "Wachstum und Perzentilen ›");
  await expect(page.getByRole("tab", { name: "Gewicht" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Tiefster Wert")).toBeVisible();
  await expect(page.getByRole("img", { name: /Gewichtskurve/ })).toBeVisible();
  await bild(page, info, "E1-gewicht");
  await page.getByRole("tab", { name: "Länge" }).click();
  await expect(page.getByRole("img", { name: /Länge/ })).toBeVisible();
  await page.getByRole("tab", { name: "Kopfumfang" }).click();
  await expect(page.getByRole("img", { name: /Kopfumfang/ })).toBeVisible();
  await bild(page, info, "E1-kopfumfang");
});

test("E2 Kinderurkunde in allen Gestaltungen", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "marielena");
  await kindSeite(page, "Laura Becker", "Frieda", "Kinderurkunde ›");
  await expect(page.getByRole("heading", { name: "Kinderurkunde Frieda" })).toBeVisible();
  await expect(page.getByText(/Einwilligung der Eltern zur Kinderurkunde/)).toHaveCount(0); // Einwilligung liegt vor
  const kindId = page.url().match(/kinder\/([^/]+)\/urkunde/)![1];
  const daten = await (await page.request.get(`/api/kinder/${kindId}/urkunde`)).json();
  mkdirSync("test-results/urkunden", { recursive: true });
  for (const design of ["kindkesmoeoen", "ostsee", "leuchtturm", "schlicht"]) {
    const textVorlage = design === "leuchtturm" ? "platt" : "warm";
    const text = daten.texte.find((t: { id: string }) => t.id === textVorlage).text;
    const res = await page.request.post(`/api/kinder/${kindId}/urkunde/vorschau.pdf`, { data: { ...daten.vorschlag, design, textVorlage, text, optionen: { ...daten.vorschlag.optionen, perzentilen: design === "schlicht" } } });
    expect(res.status(), design).toBe(200);
    const pdf = await res.body();
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    writeFileSync(`test-results/urkunden/${design}.pdf`, pdf);
  }
  // In der Oberfläche: Gestaltung, Vorlage, Wochenwerte, Meilenstein, speichern
  await page.getByRole("button", { name: "Leuchtturm" }).click();
  await page.getByLabel("Vorlage").selectOption({ label: "Mit plattdeutschem Gruß" });
  await expect(page.getByLabel("Text")).toHaveValue(/Moin, lütt Frieda/);
  await page.getByRole("button", { name: "Nur Wochenwerte" }).click();
  await page.getByRole("button", { name: "+ Eigener" }).click();
  await page.getByPlaceholder(/Meilenstein|z\. B\./).last().fill("Erstes Lächeln");
  await page.getByRole("button", { name: "Entwurf speichern" }).click();
  await expect(page.getByText(/Entwurf, zuletzt gespeichert/)).toBeVisible();
  await page.getByRole("button", { name: "PDF-Vorschau", exact: true }).click();
  await expect(page.locator("iframe, embed, object").first()).toBeVisible({ timeout: 15_000 });
  await bild(page, info, "E2-urkunde", false);
  await page.getByRole("button", { name: "Fertig" }).click();
  await expect(page.getByText(/Fertig, zuletzt gespeichert/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Gespeichertes PDF öffnen" })).toBeVisible();
});

test("E3 Urkunde ohne Einwilligung", async ({ page }, info) => {
  await anmelden(page, "johanna");
  await kindSeite(page, "Lena Krüger", "Ole", "Kinderurkunde ›");
  await expect(page.getByText("Die Einwilligung der Eltern zur Kinderurkunde ist noch nicht erfasst.")).toBeVisible();
  await expect(page.getByRole("link", { name: "In der Akte unter „Einwilligungen“ erfassen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entwurf speichern" })).toBeEnabled();
  await bild(page, info, "E3-ohne-einwilligung", false);
});

test("E4 Erinnerung an die Kinderurkunde im Cockpit", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  // Testfamilie mit Kind, dessen 12. Lebenswoche in 5 Tagen endet
  const me = await (await page.request.get("/api/auth/ich")).json();
  const k = await (await page.request.post("/api/klientinnen", { data: { vorname: "Erika", nachname: "Erinnerung", et: iso(-80), telefon: "", strasse: "", plz: "", ort: "", zustaendigeHebammeId: me.id } })).json();
  const akte = await (await page.request.get(`/api/klientinnen/${k.id}`)).json();
  const r = await page.request.post(`/api/betreuungen/${akte.betreuungen[0].id}/kinder`, { data: { vorname: "Ida", nachname: "", geburtsdatum: iso(-78), geburtszeit: "", geschlecht: "weiblich", geburtsgewicht: "3200", laenge: "", kopfumfang: "", geburtsmodus: "" } });
  expect(r.ok()).toBe(true);
  await page.goto("/");
  const hinweis = page.getByRole("link", { name: /Kinderurkunde für Ida vorbereiten/ });
  await expect(hinweis).toBeVisible();
  await bild(page, info, "E4-cockpit-erinnerung", false);
  await hinweis.click();
  await expect(page.getByRole("heading", { name: "Kinderurkunde Ida" })).toBeVisible();
  await page.getByRole("button", { name: "Fertig" }).click();
  await expect(page.getByText(/Fertig, zuletzt gespeichert/)).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Fristen und Hinweise")).toBeVisible();
  await expect(page.getByRole("link", { name: /Kinderurkunde für Ida vorbereiten/ })).toHaveCount(0);
});

// ------------------------------------------------------------------ F. Tourenplanung
test("F1 Tag planen mit Vorschlägen und Optimierung", async ({ page }, info) => {
  await anmelden(page, "johanna");
  await page.goto(`/tour/${iso(info.project.name === "handy" ? 12 : 11)}`);
  await page.getByRole("button", { name: "Besuch einplanen" }).click();
  await page.getByLabel("Familie").selectOption({ label: "Krüger, Lena (Bad Doberan)" });
  await page.getByRole("button", { name: "Zeitfenster" }).click();
  await page.getByLabel("Frühestens").fill("09:00");
  await page.getByLabel("Spätestens").fill("11:00");
  await page.getByLabel("Notiz").fill("Gewichtskontrolle");
  await page.getByRole("button", { name: "Termin anlegen" }).click();
  await expect(page.getByText(/09:00.?–.?11:00|zwischen 09:00 und 11:00/).first()).toBeVisible();
  // Vorschlag übernehmen
  const vorschlag = page.locator("li", { has: page.getByRole("button", { name: "Einplanen" }) }).first();
  if (await vorschlag.count()) await vorschlag.getByRole("button", { name: "Einplanen" }).click();
  await page.getByRole("button", { name: "Route optimieren" }).click();
  await expect(page.getByText("Strecke", { exact: true })).toBeVisible();
  await expect(page.locator("li.karte span.tabular-nums").first()).toHaveText(/\d\d:\d\d/);
  await bild(page, info, "F1-tour-geplant");
});

test("F2 Start, Ziel und Zeiten", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await page.goto("/tour");
  await page.getByRole("button", { name: "Start, Ziel und Zeiten ändern" }).first().click();
  await page.getByLabel("Abfahrt").fill("07:30");
  await page.getByLabel("Ankunft spätestens").fill("09:00");
  await page.getByLabel("Puffer nach jedem Besuch (Min.)").fill("10");
  await page.getByRole("button", { name: "Übernehmen" }).click();
  await expect(page.getByText(/07:30/).first()).toBeVisible();
  await expect(page.getByText(/spätestens|überschritten|zu spät/i).first()).toBeVisible();
  await bild(page, info, "F2-start-ziel");
});

test("F3 Unterwegs: Navigation und Anruf", async ({ page }, info) => {
  await anmelden(page, "johanna");
  await page.goto("/tour");
  const termin = page.locator("li.karte").filter({ hasText: "Lena Krüger" }).first();
  await expect(termin.getByRole("link", { name: "Apple Karten" })).toHaveAttribute("href", /maps\.apple\.com/);
  await expect(termin.getByRole("link", { name: "Google Maps" })).toHaveAttribute("href", /google\.[a-z]+\/maps/);
  await expect(termin.getByRole("link", { name: "Anrufen" })).toHaveAttribute("href", /^tel:0170/);
  await termin.scrollIntoViewIfNeeded();
  await bild(page, info, "F3-unterwegs", false);
});

test("F4 Termine ändern, verschieben, absagen, löschen", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "marielena");
  await page.goto("/tour");
  const liste = page.locator("li.karte");
  const zweiter = (await liste.nth(1).locator("a").first().textContent())!;
  await liste.nth(1).getByRole("button", { name: "Früher" }).click();
  await expect(liste.first()).toContainText(zweiter);
  // bearbeiten und auf morgen verschieben
  await liste.first().getByRole("button", { name: "Termin bearbeiten" }).click();
  const tagFeld = page.getByLabel(/^Tag|Datum$/).last();
  if (await tagFeld.count()) {
    await tagFeld.fill(iso(1));
    await page.getByRole("button", { name: /Speichern|Termin speichern/ }).click();
    await expect(page.locator("li.karte").filter({ hasText: zweiter })).toHaveCount(0);
  } else {
    await page.getByRole("button", { name: "Abbrechen" }).click();
  }
  // absagen bzw. löschen
  const mitBesuch = page.locator("li.karte", { has: page.getByRole("button", { name: "Absagen" }) }).first();
  if (await mitBesuch.count()) {
    const name = (await mitBesuch.locator("a").first().textContent())!;
    await mitBesuch.getByRole("button", { name: "Absagen" }).click();
    await expect(page.getByText(/Abgesagt \(\d\)/)).toBeVisible();
    await page.getByText(/Abgesagt \(\d\)/).click();
    await expect(page.locator("details").getByText(name)).toBeVisible();
  }
  // neuen Termin (ohne Besuch) einplanen und wieder löschen
  await page.getByRole("button", { name: "Besuch einplanen" }).click();
  await page.getByLabel("Familie").selectOption({ label: "Wolff, Jana (Kühlungsborn)" });
  await page.getByRole("button", { name: "Termin anlegen" }).click();
  const ohneBesuch = page.locator("li.karte", { hasText: "Jana Wolff" }).filter({ has: page.getByRole("button", { name: "Termin löschen" }) }).last();
  await expect(ohneBesuch).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await ohneBesuch.getByRole("button", { name: "Termin löschen" }).click();
  await expect(page.locator("li.karte", { hasText: "Jana Wolff" }).filter({ has: page.getByRole("button", { name: "Termin löschen" }) })).toHaveCount(0);
  await bild(page, info, "F4-geaendert");
});

test("F5 Tour bestätigen und ins Fahrtenbuch", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await page.goto("/tour");
  await page.getByRole("button", { name: "Tour bestätigen" }).click();
  await expect(page.getByText("Tour bestätigt.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Tour bestätigen" })).toBeDisabled();
  await page.getByRole("button", { name: "Ins Fahrtenbuch" }).click();
  await expect(page.getByText("Fahrtenbuch-Eintrag erstellt bzw. aktualisiert.")).toBeVisible();
  await page.getByRole("link", { name: "Fahrtenbuch öffnen" }).click();
  await expect(page.getByRole("heading", { name: "Fahrtenbuch" })).toBeVisible();
  await expect(page.getByText(/Hausbesuche \(\d+\)/).first()).toBeVisible();
});

test("F6 Wegegeld prüfen und anpassen", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna"); // D1 hat heute einen Hausbesuch abgeschlossen
  await page.goto("/tour");
  const wegegeld = page.locator("section", { has: page.getByRole("heading", { name: "Wegegeld" }) }).last();
  await expect(wegegeld.getByText(/5010\d|5020\d/).first()).toBeVisible();
  await wegegeld.scrollIntoViewIfNeeded();
  await bild(page, info, "F6-wegegeld", false);
  await wegegeld.getByText("Anpassen").click();
  await wegegeld.getByLabel("Gesamtstrecke von Hand (km)").fill("42");
  await wegegeld.getByRole("button", { name: "Übernehmen" }).click();
  await expect(wegegeld.getByText(/42/).first()).toBeVisible();
  const begruendung = wegegeld.getByLabel(/Begründung über 25 km/).first();
  if (await begruendung.count()) await expect(begruendung).toBeVisible();
});

// ------------------------------------------------------------------ G. Fahrtenbuch
test("G1 Fahrtenbuch führen und exportieren", async ({ page }, info) => {
  await anmelden(page, "johanna");
  await page.goto("/fahrtenbuch");
  await expect(page.getByRole("heading", { name: "Fahrtenbuch" })).toBeVisible();
  if (nurTablet(info)) {
    await page.getByRole("button", { name: /Fahrt eintragen/ }).click();
    await page.getByLabel("km-Stand Beginn").fill("45210");
    await page.getByLabel("km-Stand Ende").fill("45262");
    await page.getByLabel("Strecke").fill("Bad Doberan – Rostock – Bad Doberan");
    await page.getByLabel("Zweck").fill("Fortbildung Stillberatung");
    await page.getByLabel("km dienstlich").fill("52");
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByText("Fortbildung Stillberatung")).toBeVisible();
  }
  for (const art of ["PDF", "CSV (Excel)"]) {
    const link = page.getByRole("link", { name: art, exact: true });
    const res = await page.request.get((await link.getAttribute("href"))!);
    expect(res.status(), art).toBe(200);
    const body = await res.body();
    if (art === "PDF") expect(body.subarray(0, 4).toString()).toBe("%PDF");
    else expect(body.toString("utf8")).toMatch(/km/i);
  }
  await bild(page, info, "G1-fahrtenbuch");
});

// ------------------------------------------------------------------ H. Abrechnung
test("H1–H5 Abrechnung von offenen Fällen bis zur Zahlung", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await page.goto("/abrechnung");
  await expect(page.getByRole("heading", { name: "Noch nicht abgerechnet" })).toBeVisible();
  await expect(page.getByText(/von \d+ Fällen abrechnungsbereit/)).toBeVisible();
  await bild(page, info, "H1-offene-faelle");
  // H2 Versand vorbereiten, Mappe prüfen, H5 auflösen
  await page.getByRole("button", { name: "Versand vorbereiten" }).click();
  await expect(page.getByText(/Versand \d{4}-\d{2}-JM-\d+ vorbereitet/)).toBeVisible();
  const versand = page.locator(".karte", { has: page.getByRole("link", { name: "Versandmappe (PDF)" }) }).first();
  const mappe = await page.request.get((await versand.getByRole("link", { name: "Versandmappe (PDF)" }).getAttribute("href"))!);
  expect(mappe.headers()["content-type"]).toBe("application/pdf");
  writeFileSync("test-results/versandmappe.pdf", await mappe.body());
  page.once("dialog", (d) => d.accept());
  await versand.getByRole("button", { name: "Auflösen" }).click();
  await expect(page.getByText("Noch keine Versände.")).toBeVisible();
  // erneut vorbereiten, H3 versendet melden
  await page.getByRole("button", { name: "Versand vorbereiten" }).click();
  await expect(page.getByText(/Versand \d{4}-\d{2}-JM-\d+ vorbereitet/)).toBeVisible();
  const v2 = page.locator(".karte", { has: page.getByRole("link", { name: "Versandmappe (PDF)" }) }).first();
  await v2.getByRole("button", { name: "Als versendet markieren" }).click();
  await v2.getByLabel("Einschreiben-Nr. (optional)").fill("RR123456785DE");
  await v2.getByRole("button", { name: "Speichern" }).click();
  await expect(v2.getByText(/Einschreiben RR123456785DE/)).toBeVisible();
  await expect(v2.getByRole("button", { name: "Auflösen" })).toHaveCount(0);
  // H4 Zahlung mit Kürzung
  await v2.getByRole("button", { name: "Zahlung erfassen" }).click();
  const kuerzung = v2.getByLabel(/Kürzung|gekürzt/).first();
  if (await kuerzung.count()) {
    await kuerzung.fill("5");
    await v2.getByLabel(/Grund/).first().fill("Doppelte Abrechnung");
  }
  await v2.getByRole("button", { name: "Speichern" }).click();
  await expect(v2.getByText(/bezahlt \d\d\.\d\d\.\d{4}/)).toBeVisible();
  await bild(page, info, "H4-bezahlt");
});

test("H2 ⚠️ Versand ohne IK wird abgelehnt", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "marielena");
  await page.goto("/einstellungen");
  const ik = page.getByLabel("Institutionskennzeichen (IK)");
  const alt = await ik.inputValue();
  await ik.fill("");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(/IK geändert: Bitte Änderungen der IK-Daten unverzüglich der SVI/)).toBeVisible();
  await bild(page, info, "A5-ik-geaendert", false);
  await page.goto("/abrechnung");
  await page.getByRole("button", { name: "Versand vorbereiten" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /IK|Institutionskennzeichen/ })).toBeVisible();
  await bild(page, info, "H2-ohne-ik", false);
  await page.goto("/einstellungen");
  await page.getByLabel("Institutionskennzeichen (IK)").fill(alt);
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(/IK geändert/)).toBeVisible();
});
