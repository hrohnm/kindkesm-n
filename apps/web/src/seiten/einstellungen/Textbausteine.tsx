import { useState } from "react";
import { Feld, Laden, Meldung } from "../../komponenten/Formular";
import { api } from "../../lib/api";
import { useDaten } from "../../lib/useDaten";
import { useFormular } from "../../lib/useFormular";

type Baustein = { id: string; titel: string; text: string; praxis: boolean };
const LEER = { titel: "", text: "", praxis: false };

/** Einstellungen → Textbausteine (M3): eigene und Praxis-Bausteine für die Besuchsnotiz */
export function Textbausteine() {
  const liste = useDaten<Baustein[]>("/api/textbausteine");
  const [bearbeiten, setBearbeiten] = useState<Baustein | null>(null);
  const f = useFormular(LEER);
  const start = (b: Baustein | null) => {
    setBearbeiten(b);
    f.setWerte(b ? { titel: b.titel, text: b.text, praxis: b.praxis } : LEER);
  };
  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-[1fr_22rem]">
      <section className="karte">
        <h2 className="mb-3 text-lg font-semibold">Textbausteine</h2>
        <p className="mb-3 text-sm text-slate-500">Im Besuch unter der Notiz über „Textbaustein einfügen …“ wählbar. Praxis-Bausteine sehen alle Hebammen.</p>
        {!liste.daten ? (
          <Laden />
        ) : liste.daten.length === 0 ? (
          <p className="text-slate-500">Noch keine Textbausteine.</p>
        ) : (
          <ul className="divide-y divide-sand-200 dark:divide-salbei-700">
            {liste.daten.map((b) => (
              <li key={b.id} className="flex flex-wrap items-start gap-3 py-3" data-testid="textbaustein">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{b.titel} {b.praxis && <span className="ml-1 rounded-full bg-sand-100 px-2 py-0.5 text-xs text-slate-700">Praxis</span>}</div>
                  <p className="line-clamp-2 text-sm text-slate-500">{b.text}</p>
                </div>
                <button type="button" className="knopf-sekundaer min-h-9 px-3 text-sm" onClick={() => start(b)}>Bearbeiten</button>
                <button
                  type="button"
                  className="knopf-sekundaer min-h-9 px-3 text-sm"
                  aria-label={`${b.titel} löschen`}
                  onClick={async () => {
                    if (!confirm(`„${b.titel}“ löschen?`)) return;
                    await api(`/api/textbausteine/${b.id}`, { method: "DELETE" });
                    if (bearbeiten?.id === b.id) start(null);
                    await liste.laden();
                  }}
                >
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <form
        className="karte space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await f.speichern((w) => api(bearbeiten ? `/api/textbausteine/${bearbeiten.id}` : "/api/textbausteine", { method: bearbeiten ? "PUT" : "POST", body: w }), "Gespeichert.");
          if (ok) {
            start(null);
            await liste.laden();
          }
        }}
      >
        <h3 className="font-semibold">{bearbeiten ? "Textbaustein bearbeiten" : "Neuer Textbaustein"}</h3>
        {f.meldung && <Meldung art={f.meldung.art}>{f.meldung.text}</Meldung>}
        <Feld label="Titel" fehler={f.felder.titel}><input className="feld" maxLength={60} value={f.werte.titel} onChange={(e) => f.setze("titel", e.target.value)} placeholder="z. B. Stillberatung Anlegen" /></Feld>
        <Feld label="Text" fehler={f.felder.text}><textarea className="feld min-h-32" maxLength={2000} value={f.werte.text} onChange={(e) => f.setze("text", e.target.value)} /></Feld>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" className="size-6 accent-salbei-600" checked={f.werte.praxis} onChange={(e) => f.setze("praxis", e.target.checked)} />
          Für die ganze Praxis
        </label>
        <div className="flex gap-2">
          <button className="knopf-primaer" disabled={f.speichert}>Speichern</button>
          {bearbeiten && <button type="button" className="knopf-sekundaer" onClick={() => start(null)}>Abbrechen</button>}
        </div>
      </form>
    </div>
  );
}
