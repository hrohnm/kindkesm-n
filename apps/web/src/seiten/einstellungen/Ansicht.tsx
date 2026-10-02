import { DOKU_FELDER, standardAnsicht, type Ansicht as AnsichtTyp, type DokuFeld } from "@kindkesmoeoen/shared";
import { useEffect, useState } from "react";
import { Laden, Meldung } from "../../komponenten/Formular";
import { api } from "../../lib/api";
import { useDaten } from "../../lib/useDaten";

/** Persönliche Standardansicht der Besuchsdokumentation. */
export function Ansicht() {
  const gespeichert = useDaten<AnsichtTyp>("/api/ich/ansicht");
  const [w, setW] = useState<AnsichtTyp | null>(null);
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string }>();
  useEffect(() => {
    if (gespeichert.daten) setW(gespeichert.daten);
  }, [gespeichert.daten]);
  if (!w) return <Laden />;

  const setzeFeld = (gruppe: "mutter" | "kind", id: string, k: "sichtbar" | "vergleich", v: boolean) =>
    setW({ ...w, [gruppe]: { ...w[gruppe], [id]: { ...w[gruppe][id]!, [k]: v } } });

  async function speichern(neu: AnsichtTyp) {
    try {
      setW(await api<AnsichtTyp>("/api/ich/ansicht", { method: "PUT", body: neu }));
      setMeldung({ art: "ok", text: "Gespeichert. Gilt ab dem nächsten geöffneten Besuch." });
    } catch (e) {
      setMeldung({ art: "fehler", text: (e as Error).message });
    }
  }

  const tabelle = (gruppe: "mutter" | "kind", titel: string, felder: DokuFeld[], offen: "mutterOffen" | "kindOffen") => (
    <section className="karte space-y-3">
      <h2 className="text-lg font-semibold">{titel}</h2>
      <Schalter label="Kachel beim Öffnen aufgeklappt" an={w[offen]} aendern={(v) => setW({ ...w, [offen]: v })} />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-2 pr-2 font-medium">Feld</th>
            <th className="w-24 py-2 text-center font-medium">Anzeigen</th>
            <th className="w-28 py-2 text-center font-medium">Letzter Wert</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sand-200 dark:divide-salbei-700">
          {felder.map((f) => {
            const e = w[gruppe][f.id]!;
            return (
              <tr key={f.id}>
                <td className="py-1 pr-2">
                  {f.label}
                  {f.nachGeburt && <span className="text-slate-500"> (Wochenbett)</span>}
                </td>
                <td className="py-1 text-center">
                  <input type="checkbox" aria-label={`${f.label} anzeigen`} className="size-6 accent-salbei-600" checked={e.sichtbar} onChange={(ev) => setzeFeld(gruppe, f.id, "sichtbar", ev.target.checked)} />
                </td>
                <td className="py-1 text-center">
                  <input type="checkbox" aria-label={`${f.label}: letzten Wert zeigen`} className="size-6 accent-salbei-600" checked={e.vergleich} onChange={(ev) => setzeFeld(gruppe, f.id, "vergleich", ev.target.checked)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );

  return (
    <div className="space-y-4">
      <p className="text-slate-600 dark:text-slate-300">
        Lege fest, welche Felder beim Dokumentieren eines Besuchs sichtbar sind. Ausgeblendete Felder lassen sich im Besuch jederzeit mit „Weitere Felder“ einblenden; Felder mit Wert werden immer angezeigt. „Letzter Wert“ zeigt den Wert des vorigen Besuchs zum Vergleich.
      </p>
      {meldung && <Meldung art={meldung.art}>{meldung.text}</Meldung>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {tabelle("mutter", "Mutter", DOKU_FELDER.mutter, "mutterOffen")}
        {tabelle("kind", "Kind", DOKU_FELDER.kind, "kindOffen")}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="knopf-primaer" onClick={() => speichern(w)}>Speichern</button>
        <button type="button" className="knopf-sekundaer" onClick={() => speichern(standardAnsicht())}>Auf Standard zurücksetzen</button>
      </div>
    </div>
  );
}

function Schalter({ label, an, aendern }: { label: string; an: boolean; aendern: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3">
      <input type="checkbox" className="size-6 accent-salbei-600" checked={an} onChange={(e) => aendern(e.target.checked)} />
      {label}
    </label>
  );
}
