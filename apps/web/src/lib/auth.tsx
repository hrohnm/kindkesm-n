import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { Ich } from "./typen";

type AuthKontext = { ich: Ich | null | undefined; anmelden: (email: string, passwort: string) => Promise<void>; abmelden: () => Promise<void> };
const Kontext = createContext<AuthKontext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ich, setIch] = useState<Ich | null | undefined>(undefined);

  useEffect(() => {
    api<Ich>("/api/auth/ich").then(setIch, () => setIch(null));
    const weg = () => setIch(null);
    window.addEventListener("kk:abgemeldet", weg);
    return () => window.removeEventListener("kk:abgemeldet", weg);
  }, []);

  const anmelden = useCallback(async (email: string, passwort: string) => {
    setIch(await api<Ich>("/api/auth/anmelden", { method: "POST", body: { email, passwort } }));
  }, []);
  const abmelden = useCallback(async () => {
    await api("/api/auth/abmelden", { method: "POST" }).catch(() => {});
    setIch(null);
  }, []);

  return <Kontext.Provider value={{ ich, anmelden, abmelden }}>{children}</Kontext.Provider>;
}

export function useAuth() {
  const k = useContext(Kontext);
  if (!k) throw new Error("AuthProvider fehlt");
  return k;
}
