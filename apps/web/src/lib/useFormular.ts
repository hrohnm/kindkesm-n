import { useState } from "react";
import { ApiFehler } from "./api";

/** Formularzustand mit Speichern, Feldfehlern und Erfolgsmeldung. */
export function useFormular<T extends object>(start: T) {
  const [werte, setWerte] = useState<T>(start);
  const [felder, setFelder] = useState<Record<string, string>>({});
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler" | "hinweis"; text: string }>();
  const [speichert, setSpeichert] = useState(false);

  const setze = <K extends keyof T>(feld: K, wert: T[K]) => setWerte((w) => ({ ...w, [feld]: wert }));

  async function speichern(aktion: (w: T) => Promise<unknown>, okText = "Gespeichert.") {
    setSpeichert(true);
    setFelder({});
    setMeldung(undefined);
    try {
      const ergebnis = (await aktion(werte)) as { hinweis?: string } | undefined;
      setMeldung(ergebnis?.hinweis ? { art: "hinweis", text: ergebnis.hinweis } : { art: "ok", text: okText });
      return true;
    } catch (e) {
      if (e instanceof ApiFehler) setFelder(e.felder);
      setMeldung({ art: "fehler", text: (e as Error).message });
      return false;
    } finally {
      setSpeichert(false);
    }
  }

  return { werte, setWerte, setze, felder, meldung, speichert, speichern };
}
