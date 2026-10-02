import { useEffect, useState } from "react";
import { eigeneEintraege, type AusgangEintrag } from "./ausgang";

/** Einträge der Warteschlange (aktualisiert sich bei jeder Änderung). */
export function useAusgang(): AusgangEintrag[] {
  const [liste, setListe] = useState<AusgangEintrag[]>([]);
  useEffect(() => {
    let aktiv = true;
    const laden = () => void eigeneEintraege().then((l) => aktiv && setListe(l), () => {});
    laden();
    window.addEventListener("kk:ausgang", laden);
    return () => {
      aktiv = false;
      window.removeEventListener("kk:ausgang", laden);
    };
  }, []);
  return liste;
}
