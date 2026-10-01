import { BETREUUNG_STATUS_LABEL, type BetreuungStatus } from "@kindkesmoeoen/shared";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Feld, Laden, Meldung, Seitenkopf } from "../komponenten/Formular";
import { IconPlus } from "../komponenten/Icons";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { datum } from "../lib/format";
import type { KlientinListe, TeamMitglied } from "../lib/typen";
import { useDaten } from "../lib/useDaten";
import { useFormular } from "../lib/useFormular";

export const STATUS_FARBE: Record<string, string> = {
  anfrage: "bg-amber-100 text-amber-800",
  schwangerschaft: "bg-salbei-100 text-salbei-700",
  wochenbett: "bg-tulpe-100 text-tulpe-500",
  abgeschlossen: "bg-sand-200 text-slate-600",
};

export function Klientinnen() {
  const [suche, setSuche] = useState("");
  const [nur, setNur] = useState<"meine" | "alle">("alle");
  const [neu, setNeu] = useState(false);
  const liste = useDaten<KlientinListe[]>(`/api/klientinnen?nur=${nur}${suche ? `&q=${encodeURIComponent(suche)}` : ""}`);

  return (
    <>
      <Seitenkopf
        titel="Klientinnen"
        untertitel="Familien in Schwangerschaft und Wochenbett"
        aktion={
          <button type="button" className="knopf-primaer" onClick={() => setNeu(true)}>
            <IconPlus className="size-5" /> Neue Klientin
          </button>
        }
      />
      {neu && <NeueKlientin abbrechen={() => setNeu(false)} />}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input className="feld sm:max-w-sm" placeholder="Name oder Ort suchen" value={suche} onChange={(e) => setSuche(e.target.value)} />
        <div className="flex gap-2">
          {(["alle", "meine"] as const).map((n) => (
            <button key={n} type="button" onClick={() => setNur(n)} className={`min-h-12 rounded-full px-5 font-medium ${nur === n ? "bg-salbei-600 text-white" : "bg-white text-slate-600 dark:bg-salbei-900/50 dark:text-slate-300"}`}>
              {n === "alle" ? "Alle" : "Meine"}
            </button>
          ))}
        </div>
      </div>

      {!liste.daten ? (
        <Laden />
      ) : liste.daten.length === 0 ? (
        <p className="text-slate-500">Keine Klientinnen gefunden.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {liste.daten.map((k) => (
            <Link key={k.id} to={`/klientinnen/${k.id}`} className="karte flex items-center gap-4 transition hover:border-salbei-300 active:scale-[0.99]">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-salbei-100 font-semibold text-salbei-700">
                {k.vorname[0]}
                {k.nachname[0]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">
                  {k.vorname} {k.nachname}
                </div>
                <div className="truncate text-sm text-slate-500">
                  {k.ort ?? "–"} · zuständig {k.zustaendig}
                  {k.betreuung?.kinder.length ? ` · ${k.betreuung.kinder.join(" & ")}` : ""}
                </div>
              </div>
              {k.betreuung && (
                <div className="shrink-0 text-right">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_FARBE[k.betreuung.status]}`}>
                    {BETREUUNG_STATUS_LABEL[k.betreuung.status as BetreuungStatus]}
                  </span>
                  <div className="mt-1 text-sm font-medium">
                    {k.betreuung.lebenstag ? `${k.betreuung.lebenstag}. Lebenstag` : k.betreuung.ssw ? `SSW ${k.betreuung.ssw}` : k.betreuung.et ? `ET ${datum(k.betreuung.et)}` : ""}
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function NeueKlientin({ abbrechen }: { abbrechen: () => void }) {
  const { ich } = useAuth();
  const team = useDaten<TeamMitglied[]>("/api/team");
  const navigate = useNavigate();
  const f = useFormular({ vorname: "", nachname: "", et: "", telefon: "", strasse: "", plz: "", ort: "", zustaendigeHebammeId: ich?.id ?? "" });

  return (
    <form
      className="karte mb-6 space-y-4 border-salbei-300"
      onSubmit={async (e) => {
        e.preventDefault();
        let id = "";
        const ok = await f.speichern(async (w) => {
          id = (await api<{ id: string }>("/api/klientinnen", { method: "POST", body: w })).id;
        });
        if (ok) navigate(`/klientinnen/${id}`);
      }}
    >
      <h2 className="text-lg font-semibold">Neue Klientin</h2>
      {f.meldung?.art === "fehler" && <Meldung art="fehler">{f.meldung.text}</Meldung>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Feld label="Vorname" fehler={f.felder.vorname}>
          <input className="feld" value={f.werte.vorname} onChange={(e) => f.setze("vorname", e.target.value)} autoFocus />
        </Feld>
        <Feld label="Nachname" fehler={f.felder.nachname}>
          <input className="feld" value={f.werte.nachname} onChange={(e) => f.setze("nachname", e.target.value)} />
        </Feld>
        <Feld label="Errechneter Termin" fehler={f.felder.et}>
          <input className="feld" type="date" value={f.werte.et} onChange={(e) => f.setze("et", e.target.value)} />
        </Feld>
        <Feld label="Telefon" fehler={f.felder.telefon}>
          <input className="feld" inputMode="tel" value={f.werte.telefon} onChange={(e) => f.setze("telefon", e.target.value)} />
        </Feld>
        <Feld label="Straße und Hausnummer" fehler={f.felder.strasse}>
          <input className="feld" value={f.werte.strasse} onChange={(e) => f.setze("strasse", e.target.value)} />
        </Feld>
        <div className="grid grid-cols-[7rem_1fr] gap-3">
          <Feld label="PLZ" fehler={f.felder.plz}>
            <input className="feld" inputMode="numeric" maxLength={5} value={f.werte.plz} onChange={(e) => f.setze("plz", e.target.value)} />
          </Feld>
          <Feld label="Ort" fehler={f.felder.ort}>
            <input className="feld" value={f.werte.ort} onChange={(e) => f.setze("ort", e.target.value)} />
          </Feld>
        </div>
        <Feld label="Zuständige Hebamme" fehler={f.felder.zustaendigeHebammeId}>
          <select className="feld" value={f.werte.zustaendigeHebammeId} onChange={(e) => f.setze("zustaendigeHebammeId", e.target.value)}>
            {team.daten?.filter((h) => h.rolle === "hebamme").map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
                {h.status !== "aktiv" ? " (abwesend)" : ""}
              </option>
            ))}
          </select>
        </Feld>
      </div>
      <p className="text-sm text-slate-500">Krankenkasse und Versichertennummer lassen sich danach in der Akte ergänzen.</p>
      <div className="flex gap-2">
        <button className="knopf-primaer" disabled={f.speichert}>Anlegen</button>
        <button type="button" className="knopf-sekundaer" onClick={abbrechen}>Abbrechen</button>
      </div>
    </form>
  );
}
