import { Link } from "react-router";
import { useOffline, type OfflineZustand } from "../lib/offline/zustand";

const uhrzeit = (t: number) => new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

function beschreibung(z: OfflineZustand): { text: string; stil: string } {
  if (z.konflikte) return { text: `${z.konflikte} Konflikt${z.konflikte > 1 ? "e" : ""} – bitte entscheiden`, stil: "bg-tulpe-100 text-tulpe-500" };
  if (z.fehler) return { text: `${z.fehler} Änderung${z.fehler > 1 ? "en" : ""} mit Fehler`, stil: "bg-tulpe-100 text-tulpe-500" };
  if (z.synchronisiert) return { text: "Wird synchronisiert …", stil: "bg-salbei-100 text-salbei-700" };
  if (!z.verbunden) {
    const offen = z.ausstehend ? ` – ${z.ausstehend} Änderung${z.ausstehend > 1 ? "en" : ""} warten` : "";
    const stand = z.cacheStand ? ` · Stand ${uhrzeit(z.cacheStand)}` : "";
    return { text: `Offline${offen}${stand}`, stil: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" };
  }
  if (z.ausstehend) return { text: `${z.ausstehend} Änderung${z.ausstehend > 1 ? "en" : ""} warten auf Übertragung`, stil: "bg-amber-100 text-amber-800" };
  return { text: "Online", stil: "text-slate-500" };
}

/** Verbindungs- und Abgleichsstatus. Seitenleiste: immer sichtbar; Handy: nur wenn es etwas zu melden gibt. */
export function OfflineStatus({ variante }: { variante: "seitenleiste" | "handy" }) {
  const z = useOffline();
  const b = beschreibung(z);
  const ruhig = b.text === "Online";
  if (variante === "handy") {
    return (
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 flex flex-col items-center gap-1 px-3 pb-2 md:hidden" aria-live="polite">
        {z.hinweis && <div className="rounded-full bg-salbei-700 px-4 py-2 text-sm text-white shadow-lg">{z.hinweis}</div>}
        {!ruhig && (
          <Link to="/einstellungen/offline" className={`rounded-full px-4 py-1.5 text-sm font-medium shadow ${b.stil}`} data-testid="offline-status">
            {b.text}
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-2" aria-live="polite">
      {z.hinweis && <div className="rounded-xl bg-salbei-700 px-3 py-2 text-sm text-white">{z.hinweis}</div>}
      <Link to="/einstellungen/offline" className={`flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium ${b.stil}`} data-testid={ruhig ? undefined : "offline-status"}>
        <span className={`size-2.5 shrink-0 rounded-full ${ruhig ? "bg-salbei-500" : z.verbunden ? "bg-amber-500" : "bg-slate-400"}`} />
        {b.text}
      </Link>
    </div>
  );
}
