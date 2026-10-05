import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { anmelden, bild, karte, nurTablet, unterschreiben } from "./hilfen";

const iso = (tage: number) => {
  const d = new Date();
  d.setDate(d.getDate() + tage);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const cli = (...args: string[]) => execFileSync("node", ["apps/api/dist/cli.js", ...args], { cwd: "../..", encoding: "utf8" });

// ------------------------------------------------------------------ I. Kurse
test("I1+I2 Kurs anlegen, Termine, Teilnehmerinnen mit Warteliste", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await page.goto("/kurse");
  await page.getByRole("button", { name: "Kurs anlegen" }).click();
  await page.getByLabel("Titel").fill("Rückbildung am Abend");
  await page.getByLabel("Kursart").selectOption({ label: "Rückbildung" });
  await page.getByLabel("Abrechnung").selectOption({ label: "Krankenkasse (Formular 3.4)" });
  await page.getByLabel("Ort").fill("Praxis, Neue Reihe 46b");
  await page.getByLabel("Plätze").fill("2");
  await page.getByLabel("Beschreibung (auch auf der Anmeldeseite)").fill("Acht Abende Rückbildung mit Babysitter-Ecke.");
  await page.getByText("Online-Anmeldung über die Website").click();
  await bild(page, info, "I1-kurs-formular", false);
  await page.getByRole("button", { name: "Kurs anlegen" }).last().click();
  // nach dem Anlegen öffnet sich der Kurs
  await expect(page.getByRole("heading", { name: /Rückbildung am Abend/ })).toBeVisible();
  // Terminserie
  await page.getByRole("button", { name: "Termine", exact: true }).click();
  await page.getByLabel("Erster Termin").fill(iso(7));
  await page.getByLabel("Von").fill("19:00");
  await page.getByLabel("Bis").fill("20:00");
  await page.getByLabel("Anzahl").fill("8");
  await page.getByLabel("Abstand (Tage)").fill("7");
  await page.getByLabel("Thema").fill("Beckenboden");
  await page.getByRole("button", { name: "Termine anlegen" }).click();
  await expect(page.getByRole("heading", { name: "Termine (8)" })).toBeVisible();
  // Teilnehmerinnen: aus der Akte, ohne Akte, dann voll -> Warteliste
  const tn = page.locator("section", { has: page.getByRole("heading", { name: /^Plätze/ }) });
  const hinzu = async (name: string, akte?: string) => {
    await tn.getByRole("button", { name: "Teilnehmerin" }).click();
    if (akte) await tn.getByLabel("Aus der Akte").selectOption({ label: akte });
    else await tn.getByLabel("Name").fill(name);
    await tn.getByRole("button", { name: "Hinzufügen" }).click();
  };
  await hinzu("Lena Krüger", "Krüger, Lena (Bad Doberan)");
  await hinzu("Gast Ohneakte");
  await expect(tn.getByTestId("teilnahme").filter({ hasText: "Gast Ohneakte" }).getByText("keine Akte")).toBeVisible();
  await hinzu("Wanda Warteliste");
  await expect(page.getByRole("status").filter({ hasText: "Der Kurs ist voll – auf die Warteliste gesetzt." })).toBeVisible();
  await expect(tn.getByText("Warteliste (1)")).toBeVisible(); // sofort sichtbar, ohne Neuladen
  // ⚠️ Nachrücken bei vollem Kurs
  const wanda = tn.getByTestId("teilnahme").filter({ hasText: "Wanda Warteliste" });
  await wanda.getByRole("button", { name: "Nachrücken" }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  // Platz frei machen und nachrücken
  const gast = tn.getByTestId("teilnahme").filter({ hasText: "Gast Ohneakte" });
  page.once("dialog", (d) => d.accept());
  await gast.getByRole("button", { name: "Stornieren" }).click();
  await wanda.getByRole("button", { name: "Nachrücken" }).click();
  await expect(wanda.getByText("bestätigt")).toBeVisible();
  await wanda.getByLabel("Akte für Wanda Warteliste zuordnen").selectOption({ label: "Berger, Sophie" });
  await expect(wanda.getByRole("link", { name: "Akte" })).toBeVisible();
  await bild(page, info, "I2-teilnehmerinnen");
});

test("I3 Online-Anmeldung über die öffentliche Seite", async ({ browser, page }, info) => {
  const extern = await browser.newContext({ locale: "de-DE", ...(info.project.name === "handy" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {}) });
  const p = await extern.newPage();
  await p.goto("/anmeldung");
  await expect(p.getByRole("heading", { name: "Kursanmeldung" })).toBeVisible();
  await expect(p.getByText(/Paula Beispiel|Sophie Berger/)).toHaveCount(0); // keine Namen anderer
  await bild(p, info, "I3-anmeldeseite");
  const gv = p.locator("li", { has: p.getByRole("heading", { name: "Geburtsvorbereitung am Wochenende" }) });
  await gv.getByRole("button", { name: /Anmelden|Warteliste/ }).click();
  const name = info.project.name === "handy" ? "Hanna Handy" : "Tina Tablet";
  await p.getByLabel("Vor- und Nachname").fill(name);
  // je Gerät eine eigene Adresse: dieselbe E-Mail gilt als doppelte Anmeldung
  await p.getByLabel("E-Mail").fill(`test-${info.project.name}@example.org`);
  await p.getByLabel(/Errechneter Termin|Geburtsdatum/).fill(iso(70));
  await p.getByLabel("Krankenkasse").fill("Musterkasse Nord").catch(() => {});
  await p.getByRole("button", { name: /Verbindlich anmelden|Auf die Warteliste/ }).click();
  await expect(p.getByText(/zustimmen/)).toBeVisible(); // ⚠️ ohne Einwilligung
  await p.getByText(/Ich bin einverstanden/).click();
  await p.getByRole("button", { name: /Verbindlich anmelden|Auf die Warteliste/ }).click();
  await expect(p.getByRole("heading", { name: "Vielen Dank!" })).toBeVisible();
  await bild(p, info, "I3-danke", false);
  await extern.close();
  // Kursleitung sieht die Anmeldung
  await anmelden(page, "johanna");
  await expect(page.getByRole("link", { name: /neue Online-Anmeldungen?: Geburtsvorbereitung am Wochenende/ })).toBeVisible();
  await page.getByRole("link", { name: /neue Online-Anmeldungen?: Geburtsvorbereitung am Wochenende/ }).click();
  const eintrag = page.getByTestId("teilnahme").filter({ hasText: name });
  await expect(eintrag.getByText("online", { exact: true })).toBeVisible();
});

test("I4 Anwesenheit und Kassenabrechnung", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await page.goto("/kurse");
  await page.getByRole("link", { name: /Geburtsvorbereitung am Wochenende/ }).click();
  await page.getByRole("link", { name: "Anwesenheit" }).nth(1).click();
  await expect(page.getByRole("heading", { name: /Anwesenheit/ })).toBeVisible();
  const zeilen = page.getByTestId("anwesenheit");
  const n = await zeilen.count();
  for (let i = 0; i < n; i++) {
    const z = zeilen.nth(i);
    const name = (await z.locator(".font-semibold").first().textContent())!.replace(" + Partner", "").trim();
    await z.getByRole("button", { name: `${name} anwesend` }).click();
    const tablet = z.getByRole("button", { name: "Auf dem Tablet unterschreiben" });
    if (i > 0 && (await tablet.count())) await z.getByText("auf Papier unterschrieben").click();
    else if (await tablet.count()) {
      await tablet.click();
      await unterschreiben(page, z.getByLabel("Unterschriftenfeld"));
      await z.getByRole("button", { name: "Fertig" }).click();
    }
  }
  await bild(page, info, "I4-anwesenheit");
  await page.getByRole("button", { name: "Termin abschließen" }).click();
  await expect(page.getByRole("status").or(page.getByRole("alert")).filter({ hasText: /Termin abgeschlossen|keine Abrechnung/ }).first()).toBeVisible();
  await bild(page, info, "I4-abgeschlossen", false);
  // Kurseinheit erscheint in der Akte
  await page.goto("/klientinnen");
  await page.getByRole("link", { name: /Sophie Berger/ }).click();
  await expect(page.getByRole("link", { name: /Geburtsvorbereitungskurs.*Geburtsvorbereitung am Wochenende/ }).first()).toBeVisible();
});

test("I5 Selbstzahlerkurs", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "marielena");
  await page.goto("/kurse");
  await page.getByRole("link", { name: /Babymassage dienstags/ }).click();
  const tn = page.getByTestId("teilnahme").first();
  const bezahlt = tn.getByLabel("bezahlt");
  const vorher = await bezahlt.isChecked();
  await bezahlt.click();
  await expect(bezahlt).toBeChecked({ checked: !vorher });
  await expect(page.getByText("keine Akte")).toHaveCount(0); // Selbstzahler brauchen keine Akte
  await bild(page, info, "I5-selbstzahler", false);
});

// ------------------------------------------------------------------ J. Regelwerk
test("J1 Regelwerk ansehen", async ({ page }, info) => {
  await anmelden(page, "johanna");
  await page.goto("/regelwerk");
  await page.getByPlaceholder("GPOS oder Bezeichnung suchen").fill("301");
  await expect(page.getByText("30101").first()).toBeVisible();
  await page.getByPlaceholder("GPOS oder Bezeichnung suchen").fill("");
  await page.getByLabel("Kategorie").selectOption({ index: 1 });
  await bild(page, info, "J1-regelwerk");
});

test("J3 CSV exportieren und importieren (als Vorschlag)", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "johanna");
  await page.goto("/regelwerk");
  await page.getByRole("button", { name: /ab 01\.11\.2025/ }).click();
  const href = await page.getByRole("link", { name: "CSV exportieren" }).first().getAttribute("href");
  const csv = await (await page.request.get(href!)).text();
  expect(csv.split("\n").length).toBeGreaterThan(20);
  // eine Zeile ändern: Betrag von 30401
  const zeilen = csv.split("\n");
  const i = zeilen.findIndex((z) => z.includes("30401"));
  expect(i).toBeGreaterThan(0);
  const trenner = zeilen[0]!.includes(";") ? ";" : ",";
  const kopf = zeilen[0]!.split(trenner).map((s) => s.replace(/"/g, ""));
  const spalte = kopf.findIndex((k) => /betrag/i.test(k));
  const felder = zeilen[i]!.split(trenner);
  felder[spalte] = "8,88";
  zeilen[i] = felder.join(trenner);
  writeFileSync("test-results/positionen-geaendert.csv", zeilen.join("\n"));
  await page.getByRole("button", { name: "CSV importieren" }).first().click();
  await page.getByLabel("CSV-Datei").setInputFiles("test-results/positionen-geaendert.csv");
  await expect(page.getByText(/30401/).first()).toBeVisible();
  await page.getByLabel("Begründung / Quelle").fill("Walkthrough J3");
  await page.getByRole("button", { name: "Zur Freigabe vorschlagen" }).click();
  await expect(page.getByText(/Vorschlag gespeichert/)).toBeVisible();
  await bild(page, info, "J3-csv-vorschlag", false);
});

test("J5 Neue Fassung vorschlagen", async ({ page }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  await anmelden(page, "marielena");
  await page.goto("/regelwerk");
  await page.getByRole("button", { name: "Neue Fassung" }).click();
  await page.getByLabel("Gültig ab").fill("2027-01-01");
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByLabel("Begründung / Quelle").fill("Neue Vergütungsvereinbarung (Walkthrough)");
  await page.getByRole("button", { name: "Zur Freigabe vorschlagen" }).click();
  await expect(page.getByText(/Vorschlag gespeichert/)).toBeVisible();
  // M1: Lorina (Babypause) darf nicht freigeben
  await page.getByRole("button", { name: "Abmelden" }).first().click();
  await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
  await anmelden(page, "lorina");
  await page.goto("/regelwerk");
  await page.getByRole("button", { name: /^Änderungen/ }).click();
  await expect(page.getByText(/Neue Fassung ab 01\.01\.2027/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Freigeben", exact: true })).toHaveCount(0);
  await bild(page, info, "M1-lorina-keine-freigabe", false);
});

// ------------------------------------------------------------------ K. Team
test("K1 Team ansehen", async ({ page }, info) => {
  await anmelden(page, "johanna");
  await page.goto("/team");
  await expect(page.getByText("Lorina Gosemann")).toBeVisible();
  await expect(page.getByText(/Babypause bis 01.03.2027/)).toBeVisible();
  await bild(page, info, "K1-team");
});

// ------------------------------------------------------------------ L. Offline
async function geraet(browser: Browser, info: { project: { name: string } }) {
  const ctx = await browser.newContext({ locale: "de-DE", timezoneId: "Europe/Berlin", ...(info.project.name === "handy" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {}) });
  return { ctx, page: await ctx.newPage() };
}
async function vorladen(page: Page) {
  await page.goto("/einstellungen/offline");
  await page.getByRole("button", { name: "Für unterwegs laden" }).click();
  await expect(page.getByText(/Datensätze für heute und morgen auf dem Gerät gespeichert/)).toBeVisible({ timeout: 30_000 });
}

test("L1 Für unterwegs laden", async ({ page }, info) => {
  await anmelden(page, "johanna");
  await vorladen(page);
  await bild(page, info, "L1-offline-seite", false);
});

test("L4 Konflikt zwischen zwei Geräten", async ({ browser }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  const a = await geraet(browser, info);
  const b = await geraet(browser, info);
  await anmelden(a.page, "johanna");
  await anmelden(b.page, "johanna");
  // Entwurf von heute (Demo: Lena Krüger 09:00)
  const tag = await (await a.page.request.get(`/api/touren/${iso(0)}`)).json();
  const lena = tag.termine.find((t: { klientin: { name: string }; besuchId: string | null }) => t.klientin.name.includes("Krüger") && t.besuchId);
  test.skip(!lena, "kein Entwurf in der Tour von heute");
  const url = `/besuche/${lena.besuchId}`;
  await vorladen(a.page);
  await a.page.goto(url);
  await expect(a.page.getByLabel("Notiz / Beratung")).toBeVisible();
  // Gerät A offline: Notiz und Beginn ändern
  await a.ctx.setOffline(true);
  await a.page.getByLabel("Notiz / Beratung").fill("Gerät A: Stillprobleme besprochen");
  await a.page.getByRole("button", { name: "Entwurf", exact: true }).click();
  await expect(a.page.getByText(/Ohne Verbindung/).first()).toBeVisible();
  // Gerät B online: gleiche Notiz anders, außerdem Ende geändert
  await b.page.goto(url);
  await b.page.getByLabel("Notiz / Beratung").fill("Gerät B: Nabelpflege erklärt");
  await b.page.getByRole("button", { name: "Entwurf", exact: true }).click();
  await expect(b.page).not.toHaveURL(url);
  // Gerät A wieder online -> Konflikt
  await a.ctx.setOffline(false);
  await a.page.goto("/einstellungen/offline");
  await expect(a.page.getByText("Gerät A: Stillprobleme besprochen")).toBeVisible({ timeout: 30_000 });
  await expect(a.page.getByText("Gerät B: Nabelpflege erklärt")).toBeVisible();
  await bild(a.page, info, "L4-konflikt");
  await a.page.getByRole("button", { name: "Diese Fassung übernehmen" }).click();
  await expect(a.page.getByText("Alle Änderungen sind auf dem Server.")).toBeVisible({ timeout: 30_000 });
  const besuch = await (await a.page.request.get(`/api/besuche/${lena.besuchId}`)).json();
  expect(besuch.notiz ?? besuch.dokumentation?.notiz).toContain("Gerät A");
  await a.ctx.close();
  await b.ctx.close();
});

test("L5 Abmelden mit offenen Änderungen", async ({ browser }, info) => {
  test.skip(!nurTablet(info), "ändert Daten");
  const a = await geraet(browser, info);
  await anmelden(a.page, "johanna");
  await vorladen(a.page);
  await a.page.goto("/klientinnen");
  await a.page.getByRole("link", { name: /Lena Krüger/ }).click();
  await a.page.getByRole("link", { name: "Besuch dokumentieren" }).click();
  await a.page.getByLabel("Beginn").fill("16:00");
  await a.ctx.setOffline(true);
  await a.page.getByLabel("Ende").fill("16:30");
  await a.page.getByRole("button", { name: "Entwurf", exact: true }).click();
  await expect(a.page.getByText(/Ohne Verbindung/).first()).toBeVisible();
  let meldung = "";
  a.page.once("dialog", async (d) => {
    meldung = d.message();
    await d.dismiss();
  });
  await a.page.getByRole("button", { name: "Abmelden" }).first().click();
  await expect.poll(() => meldung).toContain("noch nicht übertragen");
  // abgelehnt: weiterhin angemeldet
  await expect(a.page.getByRole("button", { name: "Abmelden" }).first()).toBeVisible();
  await a.ctx.close();
});

test("L6 Nur online mögliche Aktionen", async ({ page, context }, info) => {
  test.skip(!nurTablet(info), "ein Durchlauf genügt");
  await anmelden(page, "johanna");
  await vorladen(page);
  await page.goto("/klientinnen");
  await page.getByRole("link", { name: /Lena Krüger/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Lena Krüger" })).toBeVisible();
  await context.setOffline(true);
  const m = karte(page, "Merkmale");
  await m.getByRole("button", { name: "Bearbeiten" }).click();
  await m.getByLabel("Allergien").fill("Nüsse");
  await m.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Keine Verbindung – das ist nur mit Verbindung möglich.").first()).toBeVisible();
  await bild(page, info, "L6-nur-online", false);
  await context.setOffline(false);
});

// ------------------------------------------------------------------ M. Rollen
test("M2+M3 Büro-Konto und Kontoverwaltung über die Kommandozeile", async ({ page, request }, info) => {
  test.skip(!nurTablet(info), "ein Durchlauf genügt");
  const email = `buero-${Date.now()}@kindkesmoeoen.test`;
  const ausgabe = cli("benutzer-anlegen", "--email", email, "--name", "Büro Test", "--kuerzel", "BT", "--rolle", "buero");
  const passwort = ausgabe.match(/Vorläufiges Passwort: (\S+)/)![1]!;
  const r = await request.post("/api/auth/anmelden", { data: { email, passwort } });
  expect(r.ok()).toBe(true);
  for (const pfad of ["/api/klientinnen", "/api/kurse"]) expect((await request.get(pfad)).status(), pfad).toBe(403);
  await page.goto("/");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(passwort);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { level: 1 }).first()).toContainText("Büro");
  await bild(page, info, "M2-buero", false);
  // M3: Passwort zurücksetzen beendet Sitzungen, Sperren verhindert Anmeldung
  const neu = cli("passwort-zuruecksetzen", "--email", email).match(/Passwort für .*: (\S+)/)![1]!;
  expect((await request.get("/api/auth/ich")).status()).toBe(401);
  expect((await request.post("/api/auth/anmelden", { data: { email, passwort: neu } })).ok()).toBe(true);
  cli("benutzer-sperren", "--email", email);
  expect((await request.post("/api/auth/anmelden", { data: { email, passwort: neu } })).ok()).toBe(false);
});
