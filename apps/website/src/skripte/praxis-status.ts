/**
 * Öffentlicher Praxis-Status aus der App (Kapazitätsampel je ET-Monat, Team-Status).
 * Wird von mehreren Bausteinen genutzt, aber nur einmal je Seitenaufruf geladen.
 */
export type PraxisStatus = {
  kapazitaet: Array<{ monat: string; name: string; stufe: "frei" | "knapp" | "ausgebucht" }>;
  team: Array<{ name: string; status: "aktiv" | "babypause"; babypauseBis: string | null }>;
};

let laden: Promise<PraxisStatus | null> | undefined;

export function praxisStatus(app: string): Promise<PraxisStatus | null> {
  laden ??= fetch(`${app}/api/oeffentlich/praxis`)
    .then((r) => (r.ok ? (r.json() as Promise<PraxisStatus>) : null))
    .catch(() => null);
  return laden;
}

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
/** „2027-03“ → „März 2027“ */
export const monatText = (monat: string) => `${MONATE[Number(monat.slice(5, 7)) - 1]} ${monat.slice(0, 4)}`;

/** Team-Status in Elementen mit data-team-status="Name" aktualisieren (z. B. „in Babypause bis März 2027“). */
export async function teamStatusAnzeigen(app: string) {
  const elemente = document.querySelectorAll<HTMLElement>("[data-team-status]");
  if (!elemente.length) return;
  const status = await praxisStatus(app);
  if (!status) return;
  for (const el of elemente) {
    const h = status.team.find((t) => t.name === el.dataset.teamStatus);
    if (!h) continue;
    if (h.status === "babypause") {
      el.textContent = h.babypauseBis ? `in Babypause, voraussichtlich zurück im ${monatText(h.babypauseBis)}` : "aktuell in Babypause";
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }
}
