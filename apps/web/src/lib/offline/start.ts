/** Startet die Offline-Funktionen für die angemeldete Person: Abgleich, Aufräumen, automatisches Vorladen. */
import { abgleichen, eigeneEintraege, zaehlen } from "./ausgang";
import { cachePflegen } from "./cache";
import { geraetLoeschen } from "./speicher";
import { fuerUnterwegsLaden, letzterVorrat } from "./vorrat";
import { benutzerSetzen, offlineZustand, zustandSetzen } from "./zustand";

const VORRAT_ALLE_MS = 60 * 60 * 1000;
let stopp: (() => void) | null = null;

async function verbindungPruefen() {
  try {
    const r = await fetch("/api/gesundheit", { cache: "no-store", signal: AbortSignal.timeout(8000) });
    zustandSetzen({ verbunden: r.ok });
    return r.ok;
  } catch {
    zustandSetzen({ verbunden: false });
    return false;
  }
}

async function wennVerbunden() {
  await abgleichen();
  const v = letzterVorrat();
  if (offlineZustand().verbunden && (!v || Date.now() - v.zeit > VORRAT_ALLE_MS)) await fuerUnterwegsLaden().catch(() => {});
}

export function offlineStarten(benutzerId: string) {
  stopp?.();
  benutzerSetzen(benutzerId);
  void cachePflegen(benutzerId);
  void zaehlen();
  // Etwas später, damit die erste Seite zuerst lädt
  const start = setTimeout(() => void wennVerbunden(), 3000);

  const online = () => void verbindungPruefen().then((ok) => (ok ? wennVerbunden() : undefined));
  const offline = () => zustandSetzen({ verbunden: false });
  const sichtbar = () => document.visibilityState === "visible" && online();
  const takt = setInterval(() => {
    const z = offlineZustand();
    if (!z.verbunden) online();
    else if (z.ausstehend > z.konflikte + z.fehler) void abgleichen();
  }, 30_000);
  window.addEventListener("online", online);
  window.addEventListener("offline", offline);
  document.addEventListener("visibilitychange", sichtbar);
  stopp = () => {
    clearTimeout(start);
    clearInterval(takt);
    window.removeEventListener("online", online);
    window.removeEventListener("offline", offline);
    document.removeEventListener("visibilitychange", sichtbar);
  };
}

export function offlineBeenden() {
  stopp?.();
  stopp = null;
  benutzerSetzen(null);
}

/** Anzahl noch nicht übertragener Änderungen (Warnung beim Abmelden). */
export const nichtUebertragen = async () => (await eigeneEintraege().catch(() => [])).length;

/** Abmelden: Gerätedaten vollständig löschen. */
export async function geraetsdatenLoeschen() {
  const b = (() => {
    try {
      return Object.keys(localStorage).filter((k) => k.startsWith("kk:"));
    } catch {
      return [];
    }
  })();
  b.forEach((k) => localStorage.removeItem(k));
  await geraetLoeschen();
  zustandSetzen({ ausstehend: 0, konflikte: 0, fehler: 0, cacheStand: null });
}
