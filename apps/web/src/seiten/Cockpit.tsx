import { Link } from "react-router";
import { IconGlocke } from "../komponenten/Icons";
import { TourUebersicht } from "../komponenten/TourUebersicht";
import { Laden, Seitenkopf } from "../komponenten/Formular";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { datum, inTagen } from "../lib/format";
import type { Hinweis, RegelwerkKurz, TeamMitglied } from "../lib/typen";

type HeuteBesuch = { id: string; datum: string; von: string; bis: string; status: string; unterschrift: string; art: number; name: string; ort: string | null; klientinId: string };
import { useDaten } from "../lib/useDaten";

const STUFE = {
  dringend: "border-tulpe-500 bg-tulpe-100 dark:bg-tulpe-500/10",
  warnung: "border-amber-400 bg-amber-50 dark:bg-amber-900/20",
  info: "border-salbei-200 bg-white dark:bg-salbei-900/40",
};

function begruessung() {
  const h = new Date().getHours();
  return h < 11 ? "Moin" : h < 17 ? "Hallo" : "Guten Abend";
}

export function Cockpit() {
  const { ich } = useAuth();
  const hinweise = useDaten<Hinweis[]>("/api/hinweise");
  const team = useDaten<TeamMitglied[]>("/api/team");
  const regelwerke = useDaten<RegelwerkKurz[]>("/api/regelwerke");
  const heute = useDaten<{ heute: HeuteBesuch[]; entwuerfe: HeuteBesuch[]; geplant: number; erledigt: number }>(ich?.rolle === "hebamme" ? "/api/heute" : null);
  const vorname = ich?.name.split(" ")[0];
  const aktiv = team.daten?.filter((h) => h.status === "aktiv").length;
  const aktuell = regelwerke.daten?.at(-1);

  return (
    <>
      <Seitenkopf
        titel={`${begruessung()}, ${vorname}!`}
        untertitel={new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="karte">
          <div className="text-sm text-slate-500">Team</div>
          <div className="mt-1 text-3xl font-semibold text-salbei-700 dark:text-salbei-100">{aktiv ?? "–"} aktiv</div>
          <div className="mt-1 text-sm text-slate-500">{team.daten ? `${team.daten.length - (aktiv ?? 0)} in Babypause/abwesend` : ""}</div>
        </div>
        <div className="karte">
          <div className="text-sm text-slate-500">Regelwerk</div>
          <div className="mt-1 text-xl font-semibold text-salbei-700 dark:text-salbei-100">{aktuell ? `ab ${datum(aktuell.gueltigVon)}` : "–"}</div>
          <div className="mt-1 text-sm text-slate-500">{aktuell ? `${aktuell.anzahlPositionen} Gebührenpositionen · ${aktuell.status}` : ""}</div>
        </div>
        <div className="karte">
          <div className="text-sm text-slate-500">Besuche heute</div>
          <div className="mt-1 text-3xl font-semibold text-salbei-700 dark:text-salbei-100">{heute.daten ? Math.max(heute.daten.geplant, heute.daten.heute.length) : "–"}</div>
          <div className="mt-1 text-sm text-slate-500">
            {heute.daten ? `${heute.daten.heute.filter((b) => b.status === "abgeschlossen").length} dokumentiert · ${heute.daten.entwuerfe.length} offene Dokumentation(en)` : ""}
          </div>
          {ich?.rolle === "hebamme" && <Link to="/tour" className="mt-2 inline-block font-medium text-salbei-600 underline">Tour für heute ›</Link>}
        </div>
      </div>

      {ich?.rolle === "hebamme" && <TourUebersicht />}

      {heute.daten && (heute.daten.heute.length > 0 || heute.daten.entwuerfe.length > 0) && (
        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Heute</h2>
            {heute.daten.heute.length === 0 ? (
              <p className="text-slate-500">Noch keine Besuche für heute dokumentiert.</p>
            ) : (
              <ul className="karte divide-y divide-sand-200 p-0 dark:divide-salbei-700">
                {heute.daten.heute.map((b) => (
                  <li key={b.id}>
                    <Link to={`/besuche/${b.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-sand-50 dark:hover:bg-salbei-700/30">
                      <span>
                        <span className="font-medium">{b.von} {b.name}</span>
                        <span className="block text-sm text-slate-500">{b.ort ?? ""}</span>
                      </span>
                      <span className={`text-sm font-medium ${b.status === "entwurf" ? "text-amber-700" : "text-salbei-600"}`}>{b.status === "entwurf" ? "Entwurf" : "✓"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="mb-3 text-lg font-semibold">Offene Dokumentationen</h2>
            {heute.daten.entwuerfe.length === 0 ? (
              <p className="text-slate-500">Alles abgeschlossen.</p>
            ) : (
              <ul className="karte divide-y divide-sand-200 p-0 dark:divide-salbei-700">
                {heute.daten.entwuerfe.map((b) => (
                  <li key={b.id}>
                    <Link to={`/besuche/${b.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-sand-50 dark:hover:bg-salbei-700/30">
                      <span>
                        <span className="font-medium">{b.name}</span>
                        <span className="block text-sm text-slate-500">{datum(b.datum)}, {b.von} Uhr</span>
                      </span>
                      <span className="text-sm font-medium text-amber-700">{b.unterschrift === "keine" && b.art <= 2 ? "Unterschrift fehlt" : "Entwurf"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <IconGlocke className="size-5 text-salbei-600" /> Fristen und Hinweise
        </h2>
        {hinweise.laedt && !hinweise.daten ? (
          <Laden />
        ) : hinweise.daten?.length ? (
          <ul className="space-y-3">
            {hinweise.daten.map((h) => (
              <li key={h.id} className={`flex items-start justify-between gap-4 rounded-2xl border border-l-4 px-5 py-4 ${STUFE[h.stufe]}`}>
                <div>
                  {h.link ? <Link to={h.link} className="font-medium underline decoration-salbei-300 underline-offset-2">{h.titel}</Link> : <div className="font-medium">{h.titel}</div>}
                  <div className="text-sm text-slate-500">{h.quelle}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 text-right text-sm">
                  <div>
                    <div className="font-medium">{datum(h.datum)}</div>
                    <div className="text-slate-500">{inTagen(h.tage)}</div>
                  </div>
                  {h.erledigbar && (
                    <button
                      type="button"
                      className="knopf-sekundaer min-h-9 px-3 text-sm"
                      aria-label={`Erledigt: ${h.titel}`}
                      onClick={async () => {
                        await api(`/api/hinweise/${h.id}/erledigt`, { method: "POST" });
                        hinweise.setDaten(hinweise.daten?.filter((x) => x.id !== h.id));
                      }}
                    >
                      Erledigt
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">Keine offenen Fristen.</p>
        )}
        {hinweise.daten?.some((h) => h.id === "einstellungen") && (
          <Link to="/einstellungen/abrechnung" className="knopf-primaer mt-4">Abrechnung einrichten</Link>
        )}
      </section>
    </>
  );
}
