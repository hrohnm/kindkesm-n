import { ABWESENHEIT_ARTEN, monatsName, type AbwesenheitArt, type MonatBelegung, type Stufe } from "@kindkesmoeoen/shared";
import { useSearchParams } from "react-router";
import { Feld, Laden, Meldung, Seitenkopf } from "../komponenten/Formular";
import { IconMuell } from "../komponenten/Icons";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { datum } from "../lib/format";
import { useDaten } from "../lib/useDaten";
import { useFormular } from "../lib/useFormular";

type Daten = {
  hebammen: Array<{ id: string; name: string; kuerzel: string; status: string; babypauseBis: string | null; wochenbettenProMonat: number }>;
  plan: MonatBelegung[];
  abwesenheiten: Array<{ id: string; benutzerId: string; von: string; bis: string; art: AbwesenheitArt; notiz: string | null }>;
};

export const STUFE_STIL: Record<Stufe, string> = {
  frei: "bg-salbei-100 text-salbei-700 dark:bg-salbei-700/40 dark:text-salbei-100",
  knapp: "bg-amber-100 text-amber-800",
  voll: "bg-tulpe-100 text-tulpe-500",
  abwesend: "bg-sand-200 text-slate-500 dark:bg-salbei-900 dark:text-slate-400",
};
const STUFE_TEXT: Record<Stufe, string> = { frei: "frei", knapp: "knapp", voll: "voll", abwesend: "abwesend" };

/** M11: Belegung je Hebamme und ET-Monat mit Ampel; Urlaub und Babypause kürzen die Kapazität. */
export function Belegung() {
  const [suche, setSuche] = useSearchParams();
  const start = suche.get("start") ?? new Date().toISOString().slice(0, 7);
  const d = useDaten<Daten>(`/api/belegung?start=${start}&monate=12`);
  /** Startmonat um n Monate verschieben */
  const verschieben = (n: number) => setSuche({ start: new Date(Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1 + n, 1)).toISOString().slice(0, 7) });

  return (
    <>
      <Seitenkopf titel="Belegungsplan" untertitel="Neue Wochenbetten je Hebamme nach ET-Monat" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className="knopf-sekundaer px-4" aria-label="Früher" onClick={() => verschieben(-3)}>‹ 3 Monate</button>
        <button type="button" className="knopf-sekundaer" onClick={() => setSuche({})}>Ab heute</button>
        <button type="button" className="knopf-sekundaer px-4" aria-label="Später" onClick={() => verschieben(3)}>3 Monate ›</button>
      </div>

      {!d.daten ? (
        <Laden />
      ) : (
        <>
          <div className="karte overflow-x-auto p-0">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-sand-200 text-left dark:border-salbei-700">
                  <th className="px-4 py-3 font-medium">ET-Monat</th>
                  {d.daten.hebammen.map((h) => (
                    <th key={h.id} className="px-3 py-3 font-medium" title={h.name}>
                      {h.name.split(" ")[0]}
                      <span className="block text-xs font-normal text-slate-500">{h.wochenbettenProMonat} / Monat{h.status === "babypause" ? ` · Babypause${h.babypauseBis ? ` bis ${datum(h.babypauseBis)}` : ""}` : ""}</span>
                    </th>
                  ))}
                  <th className="px-3 py-3 font-medium">Praxis</th>
                  <th className="px-3 py-3 font-medium">offene Anfragen</th>
                </tr>
              </thead>
              <tbody>
                {d.daten.plan.map((m) => (
                  <tr key={m.monat} className="border-b border-sand-100 last:border-0 dark:border-salbei-800" data-testid="belegung-monat">
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap">{monatsName(m.monat)}</td>
                    {m.je.map((z) => (
                      <td key={z.hebammeId} className="px-2 py-1.5">
                        <span className={`inline-flex min-w-24 flex-col rounded-lg px-2.5 py-1 ${STUFE_STIL[z.stufe]}`} title={z.abwesendTage ? `${z.abwesendTage} Tage abwesend` : undefined}>
                          <span className="font-semibold">{z.stufe === "abwesend" ? "–" : `${z.belegt} / ${z.kapazitaet}`}</span>
                          <span className="text-xs">{STUFE_TEXT[z.stufe]}{z.abwesendTage && z.stufe !== "abwesend" ? ` · ${z.abwesendTage} T. weg` : ""}</span>
                        </span>
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      <span className={`inline-flex min-w-20 flex-col rounded-lg px-2.5 py-1 ${STUFE_STIL[m.gesamt.stufe]}`}>
                        <span className="font-semibold">{m.gesamt.belegt} / {m.gesamt.kapazitaet}</span>
                        <span className="text-xs">{STUFE_TEXT[m.gesamt.stufe]}</span>
                      </span>
                    </td>
                    <td className="px-3 py-1.5">{m.offen ? <span className="rounded-full bg-tulpe-100 px-2.5 py-0.5 font-medium text-tulpe-500">{m.offen}</span> : <span className="text-slate-400">–</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Gezählt werden laufende Betreuungen im Monat der Geburt bzw. des ET. Die Kapazität („Wochenbetten pro Monat“) stellt jede Hebamme unter Einstellungen → Mein Profil ein. Auf der Website erscheint daraus eine Ampel je Monat (frei / knapp / ausgebucht) – ohne Zahlen.
          </p>
          <Abwesenheiten daten={d.daten} neuLaden={d.laden} />
        </>
      )}
    </>
  );
}

function Abwesenheiten({ daten, neuLaden }: { daten: Daten; neuLaden: () => Promise<void> }) {
  const { ich } = useAuth();
  const f = useFormular({ von: "", bis: "", art: "urlaub" as AbwesenheitArt, notiz: "" });
  const name = (id: string) => daten.hebammen.find((h) => h.id === id)?.name ?? "";
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">Urlaub und Abwesenheiten</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <form
          className="karte space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await f.speichern((w) => api("/api/abwesenheiten", { method: "POST", body: w }), "Eingetragen.")) {
              f.setWerte({ von: "", bis: "", art: "urlaub", notiz: "" });
              await neuLaden();
            }
          }}
        >
          <p className="font-medium">Eigene Abwesenheit eintragen</p>
          {f.meldung && <Meldung art={f.meldung.art}>{f.meldung.text}</Meldung>}
          <div className="grid grid-cols-2 gap-3">
            <Feld label="Von" fehler={f.felder.von}><input className="feld" type="date" value={f.werte.von} onChange={(e) => f.setze("von", e.target.value)} /></Feld>
            <Feld label="Bis" fehler={f.felder.bis}><input className="feld" type="date" value={f.werte.bis} onChange={(e) => f.setze("bis", e.target.value)} /></Feld>
            <Feld label="Art">
              <select className="feld" value={f.werte.art} onChange={(e) => f.setze("art", e.target.value as AbwesenheitArt)}>
                {Object.entries(ABWESENHEIT_ARTEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Feld>
            <Feld label="Notiz (optional)"><input className="feld" value={f.werte.notiz} onChange={(e) => f.setze("notiz", e.target.value)} /></Feld>
          </div>
          <button className="knopf-primaer" disabled={f.speichert}>Eintragen</button>
        </form>
        <div className="karte p-0">
          {daten.abwesenheiten.length === 0 ? (
            <p className="p-5 text-slate-500">Keine Abwesenheiten eingetragen.</p>
          ) : (
            <ul className="divide-y divide-sand-200 dark:divide-salbei-700">
              {daten.abwesenheiten.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3" data-testid="abwesenheit">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{name(a.benutzerId)} · {ABWESENHEIT_ARTEN[a.art]}</div>
                    <div className="text-sm text-slate-500">{datum(a.von)} – {datum(a.bis)}{a.notiz ? ` · ${a.notiz}` : ""}</div>
                  </div>
                  {a.benutzerId === ich?.id && (
                    <button type="button" aria-label="Abwesenheit löschen" className="flex size-11 items-center justify-center rounded-lg text-tulpe-500 hover:bg-tulpe-100" onClick={async () => { if (confirm("Abwesenheit löschen?")) { await api(`/api/abwesenheiten/${a.id}`, { method: "DELETE" }); await neuLaden(); } }}>
                      <IconMuell className="size-5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
