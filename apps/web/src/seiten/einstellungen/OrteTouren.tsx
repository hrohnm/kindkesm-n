import { ORT_TYPEN, ORT_TYP_LABEL, WOCHENTAGE_KURZ, type OrtTyp } from "@kindkesmoeoen/shared";
import { useState } from "react";
import { Feld, Laden, Meldung } from "../../komponenten/Formular";
import { IconMuell, IconOrt, IconPlus, IconStift } from "../../komponenten/Icons";
import { api } from "../../lib/api";
import type { Ort, Tourvorlage } from "../../lib/typen";
import { useDaten } from "../../lib/useDaten";
import { useFormular } from "../../lib/useFormular";

export function OrteTouren() {
  const orte = useDaten<Ort[]>("/api/ich/orte");
  const touren = useDaten<Tourvorlage[]>("/api/ich/tourvorlagen");
  const [ortBearbeiten, setOrtBearbeiten] = useState<Ort | "neu" | null>(null);
  const [tourBearbeiten, setTourBearbeiten] = useState<Tourvorlage | "neu" | null>(null);
  const [fehler, setFehler] = useState<string>();

  if (!orte.daten || !touren.daten) return <Laden />;
  const ortName = (id: string) => orte.daten!.find((o) => o.id === id)?.bezeichnung ?? "?";

  async function ortLoeschen(o: Ort) {
    if (!confirm(`„${o.bezeichnung}“ löschen?`)) return;
    try {
      await api(`/api/ich/orte/${o.id}`, { method: "DELETE" });
      setFehler(undefined);
      await orte.laden();
    } catch (e) {
      setFehler((e as Error).message);
    }
  }

  async function tourLoeschen(t: Tourvorlage) {
    if (!confirm(`Tourvorlage „${t.name}“ löschen?`)) return;
    await api(`/api/ich/tourvorlagen/${t.id}`, { method: "DELETE" });
    await touren.laden();
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Orte</h2>
            <p className="text-sm text-slate-500">Start- und Endpunkte für die Tourenplanung, z. B. Zuhause, Schule oder Kita.</p>
          </div>
          <button type="button" className="knopf-sekundaer shrink-0" onClick={() => setOrtBearbeiten("neu")}>
            <IconPlus className="size-5" /> Ort
          </button>
        </div>
        {fehler && <div className="mb-3"><Meldung art="fehler">{fehler}</Meldung></div>}
        {ortBearbeiten && (
          <OrtFormular
            ort={ortBearbeiten === "neu" ? undefined : ortBearbeiten}
            fertig={async () => {
              setOrtBearbeiten(null);
              await orte.laden();
            }}
          />
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {orte.daten.map((o) => (
            <div key={o.id} className="karte flex items-start gap-3">
              <IconOrt className="mt-0.5 size-6 shrink-0 text-salbei-600" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{o.bezeichnung}</div>
                <div className="text-sm text-slate-500">{ORT_TYP_LABEL[o.typ]}{o.abholzeit ? ` · Abholung ${o.abholzeit} Uhr` : ""}</div>
                <div className="mt-1 text-sm">{o.anschrift}</div>
              </div>
              {o.typ === "praxis" ? (
                <span className="text-xs text-slate-500">gemeinsam</span>
              ) : (
                <div className="flex shrink-0 gap-1">
                  <button type="button" aria-label="Bearbeiten" className="flex size-11 items-center justify-center rounded-lg hover:bg-sand-100 dark:hover:bg-salbei-700/50" onClick={() => setOrtBearbeiten(o)}>
                    <IconStift className="size-5" />
                  </button>
                  <button type="button" aria-label="Löschen" className="flex size-11 items-center justify-center rounded-lg text-tulpe-500 hover:bg-tulpe-100" onClick={() => ortLoeschen(o)}>
                    <IconMuell className="size-5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Tourvorlagen</h2>
            <p className="text-sm text-slate-500">Je Wochentag: wo die Tour beginnt und endet. Das Wegegeld wird ab dem Ausgangspunkt berechnet (Standard: Wohnort).</p>
          </div>
          <button type="button" className="knopf-sekundaer shrink-0" onClick={() => setTourBearbeiten("neu")}>
            <IconPlus className="size-5" /> Vorlage
          </button>
        </div>
        {tourBearbeiten && (
          <TourFormular
            tour={tourBearbeiten === "neu" ? undefined : tourBearbeiten}
            orte={orte.daten}
            fertig={async () => {
              setTourBearbeiten(null);
              await touren.laden();
            }}
          />
        )}
        {touren.daten.length === 0 && !tourBearbeiten && <p className="text-slate-500">Noch keine Tourvorlage angelegt.</p>}
        <div className="grid gap-3">
          {touren.daten.map((t) => (
            <div key={t.id} className="karte flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{t.name}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {WOCHENTAGE_KURZ.map((w, i) => (
                    <span key={w} className={`rounded-md px-2 py-0.5 text-xs font-medium ${t.wochentage.includes(i + 1) ? "bg-salbei-100 text-salbei-700" : "bg-sand-100 text-slate-400 dark:bg-salbei-900"}`}>{w}</span>
                  ))}
                </div>
                <div className="mt-2 text-sm">
                  {ortName(t.startOrtId)} → {ortName(t.endeOrtId)}
                  {t.endeSpaetestens ? ` (spätestens ${t.endeSpaetestens} Uhr)` : ""}
                </div>
                <div className="text-sm text-slate-500">Wegegeld ab: {ortName(t.wegegeldAusgangsOrtId)}</div>
              </div>
              <div className="flex gap-1">
                <button type="button" aria-label="Bearbeiten" className="flex size-11 items-center justify-center rounded-lg hover:bg-sand-100 dark:hover:bg-salbei-700/50" onClick={() => setTourBearbeiten(t)}>
                  <IconStift className="size-5" />
                </button>
                <button type="button" aria-label="Löschen" className="flex size-11 items-center justify-center rounded-lg text-tulpe-500 hover:bg-tulpe-100" onClick={() => tourLoeschen(t)}>
                  <IconMuell className="size-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function OrtFormular({ ort, fertig }: { ort?: Ort; fertig: () => void }) {
  const f = useFormular({ bezeichnung: ort?.bezeichnung ?? "", typ: (ort?.typ ?? "privat") as OrtTyp, anschrift: ort?.anschrift ?? "", abholzeit: ort?.abholzeit ?? "" });
  return (
    <form
      className="karte mb-4 space-y-4 border-salbei-200"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await f.speichern((w) => api(ort ? `/api/ich/orte/${ort.id}` : "/api/ich/orte", { method: ort ? "PUT" : "POST", body: w }));
        if (ok) fertig();
      }}
    >
      {f.meldung?.art === "fehler" && <Meldung art="fehler">{f.meldung.text}</Meldung>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Feld label="Bezeichnung" fehler={f.felder.bezeichnung}>
          <input className="feld" placeholder="z. B. Schule der Tochter" value={f.werte.bezeichnung} onChange={(e) => f.setze("bezeichnung", e.target.value)} />
        </Feld>
        <Feld label="Art" fehler={f.felder.typ}>
          <select className="feld" value={f.werte.typ} onChange={(e) => f.setze("typ", e.target.value as OrtTyp)}>
            {ORT_TYPEN.filter((t) => t !== "praxis").map((t) => (
              <option key={t} value={t}>{ORT_TYP_LABEL[t]}</option>
            ))}
          </select>
        </Feld>
        <Feld label="Anschrift" fehler={f.felder.anschrift}>
          <input className="feld" placeholder="Straße Nr., PLZ Ort" value={f.werte.anschrift} onChange={(e) => f.setze("anschrift", e.target.value)} />
        </Feld>
        <Feld label="Abholzeit (optional)" fehler={f.felder.abholzeit} hilfe="Z. B. Schulschluss; wird als spätestes Tourende vorgeschlagen.">
          <input className="feld" type="time" value={f.werte.abholzeit} onChange={(e) => f.setze("abholzeit", e.target.value)} />
        </Feld>
      </div>
      <div className="flex gap-2">
        <button className="knopf-primaer" disabled={f.speichert}>Speichern</button>
        <button type="button" className="knopf-sekundaer" onClick={fertig}>Abbrechen</button>
      </div>
    </form>
  );
}

function TourFormular({ tour, orte, fertig }: { tour?: Tourvorlage; orte: Ort[]; fertig: () => void }) {
  const privat = orte.find((o) => o.typ === "privat")?.id ?? orte[0]?.id ?? "";
  const f = useFormular({
    name: tour?.name ?? "",
    wochentage: tour?.wochentage ?? [1, 2, 3, 4, 5],
    startOrtId: tour?.startOrtId ?? privat,
    endeOrtId: tour?.endeOrtId ?? privat,
    endeSpaetestens: tour?.endeSpaetestens ?? "",
    wegegeldAusgangsOrtId: tour?.wegegeldAusgangsOrtId ?? privat,
  });
  const ortAuswahl = (feld: "startOrtId" | "endeOrtId" | "wegegeldAusgangsOrtId") => (
    <select
      className="feld"
      value={f.werte[feld]}
      onChange={(e) => {
        f.setze(feld, e.target.value);
        // Abholzeit des Zielorts als spätestes Ende vorschlagen
        const ziel = orte.find((o) => o.id === e.target.value);
        if (feld === "endeOrtId" && ziel?.abholzeit) f.setze("endeSpaetestens", ziel.abholzeit);
      }}
    >
      {orte.map((o) => (
        <option key={o.id} value={o.id}>{o.bezeichnung}</option>
      ))}
    </select>
  );
  const tagUmschalten = (tag: number) =>
    f.setze("wochentage", f.werte.wochentage.includes(tag) ? f.werte.wochentage.filter((t) => t !== tag) : [...f.werte.wochentage, tag].sort());

  return (
    <form
      className="karte mb-4 space-y-4 border-salbei-200"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await f.speichern((w) => api(tour ? `/api/ich/tourvorlagen/${tour.id}` : "/api/ich/tourvorlagen", { method: tour ? "PUT" : "POST", body: w }));
        if (ok) fertig();
      }}
    >
      {f.meldung?.art === "fehler" && <Meldung art="fehler">{f.meldung.text}</Meldung>}
      <Feld label="Name" fehler={f.felder.name}>
        <input className="feld" placeholder="z. B. Schultag" value={f.werte.name} onChange={(e) => f.setze("name", e.target.value)} />
      </Feld>
      <div>
        <span className="etikett">Wochentage</span>
        <div className="flex flex-wrap gap-2">
          {WOCHENTAGE_KURZ.map((w, i) => (
            <button
              key={w}
              type="button"
              aria-pressed={f.werte.wochentage.includes(i + 1)}
              onClick={() => tagUmschalten(i + 1)}
              className={`size-12 rounded-xl font-medium ${f.werte.wochentage.includes(i + 1) ? "bg-salbei-600 text-white" : "border border-sand-200 bg-white dark:border-salbei-700 dark:bg-salbei-900/40"}`}
            >
              {w}
            </button>
          ))}
        </div>
        {f.felder.wochentage && <span className="mt-1.5 block text-sm text-tulpe-500">{f.felder.wochentage}</span>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Feld label="Start">{ortAuswahl("startOrtId")}</Feld>
        <Feld label="Ende">{ortAuswahl("endeOrtId")}</Feld>
        <Feld label="Ende spätestens (optional)" fehler={f.felder.endeSpaetestens}>
          <input className="feld" type="time" value={f.werte.endeSpaetestens} onChange={(e) => f.setze("endeSpaetestens", e.target.value)} />
        </Feld>
        <Feld label="Wegegeld ab" hilfe="Abrechenbar ist die kürzeste Strecke von hier zur Familie (§ 11 Anlage 1.1).">{ortAuswahl("wegegeldAusgangsOrtId")}</Feld>
      </div>
      <div className="flex gap-2">
        <button className="knopf-primaer" disabled={f.speichert}>Speichern</button>
        <button type="button" className="knopf-sekundaer" onClick={fertig}>Abbrechen</button>
      </div>
    </form>
  );
}
