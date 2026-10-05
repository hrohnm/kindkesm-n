// Öffentliche Website der Praxis: statisch gebaut, ohne Datenbank, ohne Cookies, ohne externe Schriften.
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: process.env.SITE_URL ?? "https://www.hebammen-landkreisrostock.de",
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [sitemap()],
  // Alte Wix-Adressen (im Betrieb leitet Caddy sie zusätzlich mit 301 weiter)
  redirects: {
    "/hebammen-team": "/hebammen",
    "/general-clean": "/praxis",
    "/hebammenbetreuung-leistungen": "/leistungen",
    "/kopie-von-leistungen": "/kurse",
    "/hebammenpraxis-kontakt": "/kontakt",
    "/cookies": "/datenschutz",
  },
  vite: { plugins: [tailwindcss()] },
});
