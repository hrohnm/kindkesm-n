import { Link } from "react-router";
import { IconGlocke } from "../komponenten/Icons";
import { Laden, Seitenkopf } from "../komponenten/Formular";
import { useAuth } from "../lib/auth";
import { datum, inTagen } from "../lib/format";
import type { Hinweis, RegelwerkKurz, TeamMitglied } from "../lib/typen";
import { useDaten } from "../lib/useDaten";

const STUFE = {
  dringend: "border-koralle-500 bg-koralle-100 dark:bg-koralle-500/10",
  warnung: "border-amber-400 bg-amber-50 dark:bg-amber-900/20",
  info: "border-meer-200 bg-white dark:bg-meer-900/40",
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
  const vorname = ich?.name.split(" ")[0];
  const aktiv = team.daten?.filter((h) => h.status === "aktiv").length;
  const aktuell = regelwerke.daten?.at(-1);

  return (
    <>
      <Seitenkopf
        titel={`${begruessung()}, ${vorname}!`}
        untertitel={new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="karte">
          <div className="text-sm text-slate-500">Team</div>
          <div className="mt-1 text-3xl font-semibold text-meer-700 dark:text-meer-100">{aktiv ?? "–"} aktiv</div>
          <div className="mt-1 text-sm text-slate-500">{team.daten ? `${team.daten.length - (aktiv ?? 0)} in Babypause/abwesend` : ""}</div>
        </div>
        <div className="karte">
          <div className="text-sm text-slate-500">Regelwerk</div>
          <div className="mt-1 text-xl font-semibold text-meer-700 dark:text-meer-100">{aktuell ? `ab ${datum(aktuell.gueltigVon)}` : "–"}</div>
          <div className="mt-1 text-sm text-slate-500">{aktuell ? `${aktuell.anzahlPositionen} Gebührenpositionen · ${aktuell.status}` : ""}</div>
        </div>
        <div className="karte">
          <div className="text-sm text-slate-500">Hausbesuche heute</div>
          <div className="mt-1 text-xl font-semibold text-slate-400">kommt mit Meilenstein 2</div>
          <div className="mt-1 text-sm text-slate-500">Akte, Besuche und Touren folgen</div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <IconGlocke className="size-5 text-meer-600" /> Fristen und Hinweise
        </h2>
        {hinweise.laedt && !hinweise.daten ? (
          <Laden />
        ) : hinweise.daten?.length ? (
          <ul className="space-y-3">
            {hinweise.daten.map((h) => (
              <li key={h.id} className={`flex items-start justify-between gap-4 rounded-2xl border border-l-4 px-5 py-4 ${STUFE[h.stufe]}`}>
                <div>
                  <div className="font-medium">{h.titel}</div>
                  <div className="text-sm text-slate-500">{h.quelle}</div>
                </div>
                <div className="shrink-0 text-right text-sm">
                  <div className="font-medium">{datum(h.datum)}</div>
                  <div className="text-slate-500">{inTagen(h.tage)}</div>
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
