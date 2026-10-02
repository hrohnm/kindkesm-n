import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, istOffline } from "./api";
import { geraetsdatenLoeschen, nichtUebertragen, offlineBeenden, offlineStarten } from "./offline/start";
import type { Ich } from "./typen";

type AuthKontext = { ich: Ich | null | undefined; anmelden: (email: string, passwort: string) => Promise<void>; abmelden: () => Promise<void> };
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
    async (email: string, passwort: string) => {
      const i = await api<Ich>("/api/auth/anmelden", { method: "POST", body: { email, passwort } });
      // Andere Person am selben Gerät: deren Daten hier nicht weiter vorhalten
      const vorher = (() => {
        try {
          return localStorage.getItem("kk:letzte");
        } catch {
          return null;
        }
      })();
      if (vorher && vorher !== i.id) await geraetsdatenLoeschen();
      merken(i);
      setIch(i);
    },
    [setIch],
  );
  const abmelden = useCallback(async () => {
    const offen = await nichtUebertragen();
    if (offen && !confirm(`${offen} Änderung(en) wurden noch nicht übertragen und gehen beim Abmelden verloren.\n\nTrotzdem abmelden?`)) return;
    await api("/api/auth/abmelden", { method: "POST" }).catch(() => {});
    await geraetsdatenLoeschen();
    setIch(null);
  }, [setIch]);

  return <Kontext.Provider value={{ ich, anmelden, abmelden }}>{children}</Kontext.Provider>;
}

export function useAuth() {
  const k = useContext(Kontext);
  if (!k) throw new Error("AuthProvider fehlt");
  return k;
}
