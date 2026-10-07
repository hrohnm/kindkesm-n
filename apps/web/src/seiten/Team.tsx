import { HEBAMME_STATUS_LABEL } from "@kindkesmoeoen/shared";
import { Feld, Laden, Meldung, Seitenkopf } from "../komponenten/Formular";
import { api } from "../lib/api";
import { datum } from "../lib/format";
import type { TeamMitglied } from "../lib/typen";
import { useDaten } from "../lib/useDaten";
import { useFormular } from "../lib/useFormular";

type Ruf = { id: string; hebammeId: string; name: string; kuerzel: string; telefon: string | null; von: string; bis: string; notiz: string | null };
const heuteIso = () => new Date().toISOString().slice(0, 10);

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
      {daten && <Rufbereitschaft team={daten} />}
    </>
  );
}

/** M19: Rufbereitschaftsplan (z. B. Wochenenden, Feiertage) – jede Hebamme kann für das Team planen */
function Rufbereitschaft({ team }: { team: TeamMitglied[] }) {
  const liste = useDaten<Ruf[]>("/api/rufbereitschaft");
  const aktive = team.filter((h) => h.rolle === "hebamme" && h.status === "aktiv");
  const f = useFormular({ hebammeId: aktive[0]?.id ?? "", von: heuteIso(), bis: heuteIso(), notiz: "" });
  const heute = heuteIso();
  return (
    <section className="mt-8" aria-labelledby="ruf-titel">
      <h2 id="ruf-titel" className="mb-3 text-lg font-semibold">Rufbereitschaft</h2>
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="karte">
          {!liste.daten ? (
            <Laden />
          ) : liste.daten.length === 0 ? (
            <p className="text-slate-500">Keine Rufbereitschaft geplant.</p>
          ) : (
            <ul className="divide-y divide-sand-200 dark:divide-salbei-700">
              {liste.daten.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3" data-testid="rufbereitschaft">
                  <span className="flex size-10 items-center justify-center rounded-full bg-salbei-100 font-semibold text-salbei-700">{r.kuerzel}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {r.name}
                      {r.von <= heute && r.bis >= heute && <span className="ml-2 rounded-full bg-salbei-600 px-2 py-0.5 text-xs text-white">heute</span>}
                    </div>
                    <div className="text-sm text-slate-500">{r.von === r.bis ? datum(r.von) : `${datum(r.von)} – ${datum(r.bis)}`}{r.notiz ? ` · ${r.notiz}` : ""}{r.telefon ? ` · ${r.telefon}` : ""}</div>
                  </div>
                  <button
                    type="button"
                    className="knopf-sekundaer min-h-9 px-3 text-sm"
                    aria-label={`Rufbereitschaft ${r.name} ${datum(r.von)} löschen`}
                    onClick={async () => {
                      if (!confirm("Diesen Eintrag löschen?")) return;
                      await api(`/api/rufbereitschaft/${r.id}`, { method: "DELETE" });
                      await liste.laden();
                    }}
                  >
                    Löschen
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <form
          className="karte space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await f.speichern((w) => api("/api/rufbereitschaft", { method: "POST", body: w }), "Eingetragen.")) {
              f.setze("notiz", "");
              await liste.laden();
            }
          }}
        >
          <h3 className="font-semibold">Eintragen</h3>
          {f.meldung && <Meldung art={f.meldung.art}>{f.meldung.text}</Meldung>}
          <Feld label="Hebamme" fehler={f.felder.hebammeId}>
            <select className="feld" value={f.werte.hebammeId} onChange={(e) => f.setze("hebammeId", e.target.value)}>
              {aktive.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </Feld>
          <div className="grid grid-cols-2 gap-3">
            <Feld label="Von" fehler={f.felder.von}><input className="feld" type="date" value={f.werte.von} onChange={(e) => f.setze("von", e.target.value)} /></Feld>
            <Feld label="Bis" fehler={f.felder.bis}><input className="feld" type="date" value={f.werte.bis} onChange={(e) => f.setze("bis", e.target.value)} /></Feld>
          </div>
          <Feld label="Notiz (optional)"><input className="feld" maxLength={200} value={f.werte.notiz} onChange={(e) => f.setze("notiz", e.target.value)} placeholder="z. B. Wochenende, Feiertag" /></Feld>
          <button className="knopf-primaer" disabled={f.speichert}>Eintragen</button>
        </form>
      </div>
    </section>
  );
}
