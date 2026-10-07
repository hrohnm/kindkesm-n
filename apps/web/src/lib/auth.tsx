import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, istOffline } from "./api";
import { geraetsdatenLoeschen, nichtUebertragen, offlineBeenden, offlineStarten } from "./offline/start";
import { aktivMerken, pruefwertMerken, sperreVergessen } from "./sperre";
import type { Ich } from "./typen";

type AuthKontext = {
  ich: Ich | null | undefined;
  /** Liefert "zweiter_faktor", wenn noch der Code aus der Authenticator-App fehlt */
  anmelden: (email: string, passwort: string, code?: string) => Promise<void | "zweiter_faktor">;
  abmelden: () => Promise<void>;
  /** Angaben zur angemeldeten Person neu laden (z. B. nach dem Einrichten der Zwei-Faktor-Anmeldung) */
  neuLaden: () => Promise<void>;
};
const Kontext = createContext<AuthKontext | null>(null);

// Ohne Verbindung bleibt die Anmeldung auf dem Gerät erhalten (nur Name/Rolle, keine Gesundheitsdaten)
const ICH_KEY = "kk:ich";
const gemerkt = (): Ich | null => {
  try {
    return JSON.parse(localStorage.getItem(ICH_KEY) ?? "null");
  } catch {
    return null;
  }
};
const merken = (i: Ich | null) => {
  try {
    if (i) {
      localStorage.setItem(ICH_KEY, JSON.stringify(i));
      localStorage.setItem("kk:letzte", i.id);
    }
    else localStorage.removeItem(ICH_KEY);
  } catch {
    /* privat-Modus */
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ich, setIchRoh] = useState<Ich | null | undefined>(undefined);
  const setIch = useCallback((i: Ich | null) => {
    if (i) offlineStarten(i.id);
    else offlineBeenden();
    setIchRoh(i);
  }, []);

  useEffect(() => {
    api<Ich>("/api/auth/ich").then(
      (i) => {
        merken(i);
        setIch(i);
      },
      (e) => {
        if (istOffline(e)) return setIch(gemerkt());
        merken(null);
        setIch(null);
      },
    );
    const weg = () => {
      merken(null);
      setIch(null);
    };
    window.addEventListener("kk:abgemeldet", weg);
    return () => window.removeEventListener("kk:abgemeldet", weg);
  }, [setIch]);

  const anmelden = useCallback(
    async (email: string, passwort: string, code?: string) => {
      const antwort = await api<Ich | { zweiterFaktor: true }>("/api/auth/anmelden", { method: "POST", body: { email, passwort, ...(code ? { code } : {}) } });
      if ("zweiterFaktor" in antwort) return "zweiter_faktor";
      const i = antwort;
      // Andere Person am selben Gerät: deren Daten hier nicht weiter vorhalten
      const vorher = (() => {
        try {
          return localStorage.getItem("kk:letzte");
        } catch {
          return null;
        }
      })();
      if (vorher && vorher !== i.id) await geraetsdatenLoeschen();
      // Für die App-Sperre ohne Verbindung
      await pruefwertMerken(passwort, i.id);
      aktivMerken();
      merken(i);
      setIch(i);
    },
    [setIch],
  );
  const neuLaden = useCallback(async () => {
    const i = await api<Ich>("/api/auth/ich");
    merken(i);
    setIchRoh(i);
  }, []);
  const abmelden = useCallback(async () => {
    const offen = await nichtUebertragen();
    if (offen && !confirm(`${offen} Änderung(en) wurden noch nicht übertragen und gehen beim Abmelden verloren.\n\nTrotzdem abmelden?`)) return;
    await api("/api/auth/abmelden", { method: "POST" }).catch(() => {});
    await geraetsdatenLoeschen();
    sperreVergessen();
    setIch(null);
  }, [setIch]);

  return <Kontext.Provider value={{ ich, anmelden, abmelden, neuLaden }}>{children}</Kontext.Provider>;
}

export function useAuth() {
  const k = useContext(Kontext);
  if (!k) throw new Error("AuthProvider fehlt");
  return k;
}
