import { HEBAMME_STATUS_LABEL } from "@kindkesmoeoen/shared";
import { Laden, Seitenkopf } from "../komponenten/Formular";
import { datum } from "../lib/format";
import type { TeamMitglied } from "../lib/typen";
import { useDaten } from "../lib/useDaten";

export function Team() {
  const { daten } = useDaten<TeamMitglied[]>("/api/team");
  return (
    <>
      <Seitenkopf titel="Team" untertitel="Alle drei Hebammen sind freiberuflich und rechnen einzeln ab." />
      {!daten ? (
        <Laden />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {daten.map((h) => (
            <div key={h.id} className="karte">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-full bg-salbei-100 text-lg font-semibold text-salbei-700">{h.kuerzel}</span>
                <div>
                  <div className="font-semibold">{h.name}</div>
                  <span className={`mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${h.status === "aktiv" ? "bg-salbei-100 text-salbei-700" : "bg-amber-100 text-amber-800"}`}>
                    {HEBAMME_STATUS_LABEL[h.status]}
                    {h.status === "babypause" && h.babypauseBis ? ` bis ${datum(h.babypauseBis)}` : ""}
                  </span>
                </div>
              </div>
              <dl className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between gap-2"><dt className="text-slate-500">E-Mail</dt><dd className="truncate">{h.email}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Telefon</dt><dd>{h.telefon ?? "–"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-slate-500">IK</dt><dd>{h.ikHinterlegt ? "hinterlegt" : "fehlt"}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
