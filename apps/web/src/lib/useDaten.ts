import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

/** Lädt Daten von der API und bietet ein Neu-Laden an. */
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
  }, [laden]);

  return { daten, fehler, laedt, laden, setDaten };
}
