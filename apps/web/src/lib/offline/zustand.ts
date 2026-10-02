/** Verbindungs- und Abgleichszustand für die Anzeige (ohne React-Kontext, damit api.ts ihn setzen kann). */
import { useSyncExternalStore } from "react";

export type OfflineZustand = {
  /** Letzte Anfrage hat den Server erreicht */
  verbunden: boolean;
  /** Änderungen in der Warteschlange (wartend, mit Fehler oder Konflikt) */
  ausstehend: number;
  konflikte: number;
  fehler: number;
  synchronisiert: boolean;
  /** Zeitpunkt der zuletzt aus dem Gerätespeicher gelesenen Daten (nur offline) */
  cacheStand: number | null;
  /** Kurzer Hinweis (z. B. „Offline gespeichert“) */
  hinweis: string | null;
};

let zustand: OfflineZustand = {
  verbunden: typeof navigator === "undefined" ? true : navigator.onLine,
  ausstehend: 0,
  konflikte: 0,
  fehler: 0,
  synchronisiert: false,
  cacheStand: null,
  hinweis: null,
};
const hoerer = new Set<() => void>();

export const offlineZustand = () => zustand;

export function zustandSetzen(teil: Partial<OfflineZustand>) {
  const neu = { ...zustand, ...teil };
  if ((Object.keys(teil) as Array<keyof OfflineZustand>).every((k) => neu[k] === zustand[k])) return;
  zustand = neu;
  hoerer.forEach((h) => h());
}

export function useOffline(): OfflineZustand {
  return useSyncExternalStore(
    (h) => {
      hoerer.add(h);
      return () => hoerer.delete(h);
    },
    () => zustand,
  );
}

let hinweisTimer: ReturnType<typeof setTimeout> | undefined;
export function hinweisZeigen(text: string, dauerMs = 6000) {
  clearTimeout(hinweisTimer);
  zustandSetzen({ hinweis: text });
  hinweisTimer = setTimeout(() => zustandSetzen({ hinweis: null }), dauerMs);
}

/** Angemeldete Person: Daten im Gerätespeicher werden je Person getrennt. */
let benutzerId: string | null = null;
export const aktuellerBenutzer = () => benutzerId;
export function benutzerSetzen(id: string | null) {
  benutzerId = id;
}
