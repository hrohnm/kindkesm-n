import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

/** Lädt Daten von der API und bietet ein Neu-Laden an (auch automatisch nach einem Offline-Abgleich). */
export function useDaten<T>(pfad: string | null) {
  const [daten, setDaten] = useState<T | undefined>(undefined);
  const [fehler, setFehler] = useState<string | undefined>(undefined);
  const [laedt, setLaedt] = useState(Boolean(pfad));

  const laden = useCallback(async () => {
    if (!pfad) return;
    setLaedt(true);
    try {
      setDaten(await api<T>(pfad));
      setFehler(undefined);
    } catch (e) {
      setFehler((e as Error).message);
    } finally {
      setLaedt(false);
    }
  }, [pfad]);

  useEffect(() => {
    void laden();
    const neu = () => void laden();
    window.addEventListener("kk:synchronisiert", neu);
    return () => window.removeEventListener("kk:synchronisiert", neu);
  }, [laden]);

  return { daten, fehler, laedt, laden, setDaten };
}
