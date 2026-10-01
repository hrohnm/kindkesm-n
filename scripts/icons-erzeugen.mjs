// Erzeugt die PNG-Icons der PWA aus public/favicon.svg (einmalig bzw. bei Logo-Änderung ausführen).
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const ordner = new URL("../apps/web/public/", import.meta.url);
const svg = readFileSync(new URL("favicon.svg", ordner), "utf8");
const browser = await chromium.launch(process.env.CHROMIUM_PFAD ? { executablePath: process.env.CHROMIUM_PFAD } : {});
const seite = await browser.newPage();
for (const [datei, groesse, rand] of [["icon-192.png", 192, 0], ["icon-512.png", 512, 0], ["apple-touch-icon.png", 180, 0]]) {
  await seite.setViewportSize({ width: groesse, height: groesse });
  await seite.setContent(`<html><body style="margin:0;background:#1f5f6b">${svg.replace("<svg ", `<svg width="${groesse - rand * 2}" height="${groesse - rand * 2}" `)}</body></html>`);
  await seite.screenshot({ path: new URL(datei, ordner).pathname, omitBackground: false });
}
await browser.close();
console.log("Icons erzeugt.");
