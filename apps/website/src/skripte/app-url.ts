/**
 * Adresse der Praxis-App für die öffentlichen Schnittstellen (die Website lädt sie im Browser).
 * - Build/Betrieb: PUBLIC_APP_URL (z. B. https://app.example.de); leer → Live-Bausteine bleiben aus.
 * - Entwicklung (astro dev): immer die eigene Adresse („/“). Der Dev-Server leitet /api/oeffentlich an die App
 *   weiter (astro.config.mjs) – so klappt es auch im Codespace, wo „localhost:3000“ im Browser nicht erreichbar ist.
 */
export function appUrl(): string {
  if (import.meta.env.DEV) return "/";
  return (import.meta.env.PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

/** Vollständige Adresse einer Schnittstelle, z. B. api(app, "/api/oeffentlich/kurse") */
export const api = (app: string, pfad: string) => `${app === "/" ? "" : app}${pfad}`;
