/**
 * Öffentlicher Praxis-Status aus der App (Kapazitätsampel je ET-Monat, Team-Status).
 * Wird von mehreren Bausteinen genutzt, aber nur einmal je Seitenaufruf geladen.
 */
export type PraxisStatus = {
  kapazitaet: Array<{ monat: string; name: string; stufe: "frei" | "knapp" | "ausgebucht" }>;
  team: Array<{ name: string; status: "aktiv" | "babypause"; babypauseBis: string | null; abwesendBis?: string | null }>;
  /** Namen der Hebammen mit Rufbereitschaft heute */
  rufbereitschaft?: string[];
};

import { api } from "./app-url";

let laden: Promise<PraxisStatus | null> | undefined;

export function praxisStatus(app: string): Promise<PraxisStatus | null> {
  laden ??= fetch(api(app, "/api/oeffentlich/praxis"))
    .then((r) => (r.ok ? (r.json() as Promise<PraxisStatus>) : null))
    .catch(() => null);
  return laden;
}

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
/** „2027-03“ → „März 2027“ */
export const monatText = (monat: string) => `${MONATE[Number(monat.slice(5, 7)) - 1]} ${monat.slice(0, 4)}`;

const tagMonat = (iso: string) => `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}.`;

/**
 * Team-Status in Elementen mit data-team-status="Name" aktualisieren (z. B. „in Babypause, voraussichtlich zurück
 * im März 2027“ oder „bis 14.8. nicht erreichbar“) und die Rufbereitschaft in [data-rufbereitschaft] zeigen.
 */
export async function teamStatusAnzeigen(app: string) {
  const elemente = document.querySelectorAll<HTMLElement>("[data-team-status]");
  if (!elemente.length && !document.querySelector("[data-rufbereitschaft]")) return;
  const status = await praxisStatus(app);
  if (!status) return;
  for (const el of elemente) {
    const h = status.team.find((t) => t.name === el.dataset.teamStatus);
    if (!h) continue;
    if (h.status === "babypause") {
      el.textContent = h.babypauseBis ? `in Babypause, voraussichtlich zurück im ${monatText(h.babypauseBis)}` : "aktuell in Babypause";
      el.hidden = false;
    } else if (h.abwesendBis) {
      el.textContent = `bis ${tagMonat(h.abwesendBis)} nicht erreichbar – das Team vertritt`;
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-rufbereitschaft]")) {
    const namen = status.rufbereitschaft ?? [];
    const text = el.querySelector<HTMLElement>("[data-rufbereitschaft-name]");
    if (namen.length && text) {
      text.textContent = namen.join(" und ");
      el.hidden = false;
    }
  }
}
