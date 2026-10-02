import { isoDatum } from "@kindkesmoeoen/shared";
import { useMemo } from "react";
import { Link } from "react-router";
import { useDaten } from "../lib/useDaten";
import { Karte, type KartenPunkt } from "./Karte";

type Tag = {
  tour: { meter: number | null; fahrSek: number | null; ankunftEnde: string | null; startZeit: string; startOrtId: string; endeOrtId: string; geometrie: Array<[number, number]> | null; status: string } | null;
  einstellung: { startZeit: string; startOrtId: string; endeOrtId: string } | null;
  orte: Array<{ id: string; bezeichnung: string; lat: string | null; lon: string | null }>;
  termine: Array<{
    id: string;
    ankunft: string | null;
    status: "geplant" | "erledigt" | "abgesagt";
    besuchId: string | null;
    betreuungId: string;
    typ: string;
    wichtig: boolean;
    klientin: { klientinId: string; name: string; ort: string | null; lat: number | null; lon: number | null; lebenstag: number | null; besuchStatus: string | null };
  }>;
  vorschlaege: Array<{ betreuungId: string; name: string; wichtig: boolean }>;
};

/** Kompakte Übersicht der heutigen Tour für die Startseite. */
export function TourUebersicht() {
  const heute = isoDatum(new Date());
  const { daten } = useDaten<Tag>(`/api/touren/${heute}`);
  const aktiv = useMemo(() => (daten?.termine ?? []).filter((t) => t.status !== "abgesagt"), [daten]);
  const e = daten?.tour ?? daten?.einstellung;
  const ort = (id?: string) => daten?.orte.find((o) => o.id === id);
  const start = ort(e?.startOrtId);
  const ende = ort(e?.endeOrtId);
  const punkte = useMemo<KartenPunkt[]>(() => {
    const p: KartenPunkt[] = [];
    if (start?.lat) p.push({ lat: Number(start.lat), lon: Number(start.lon), text: "S", art: "start", titel: start.bezeichnung });
    aktiv.forEach((t, i) => t.klientin.lat != null && p.push({ lat: t.klientin.lat, lon: t.klientin.lon!, text: String(i + 1), art: t.status === "erledigt" ? "erledigt" : "besuch", titel: t.klientin.name }));
    if (ende?.lat && ende.id !== start?.id) p.push({ lat: Number(ende.lat), lon: Number(ende.lon), text: "Z", art: "ende", titel: ende.bezeichnung });
    return p;
  }, [aktiv, start, ende]);

  if (!daten || !e) return null;
  const erledigt = aktiv.filter((t) => t.status === "erledigt").length;
  const naechster = aktiv.find((t) => t.status !== "erledigt");
  const wichtigOffen = daten.vorschlaege.filter((v) => v.wichtig);

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">Tour heute</h2>
        <Link to="/tour" className="font-medium text-salbei-600 underline">Zur Tour ›</Link>
      </div>
      {aktiv.length === 0 ? (
        <div className="karte flex flex-wrap items-center justify-between gap-3">
          <span className="text-slate-500">Für heute sind keine Hausbesuche eingeplant.</span>
          <Link to="/tour" className="knopf-sekundaer">Besuche einplanen</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="karte p-0">
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-sand-200 px-5 py-3 text-sm text-slate-600 dark:border-salbei-700 dark:text-slate-300">
              <span><strong>{aktiv.length}</strong> Besuche · {erledigt} erledigt</span>
              {daten.tour?.meter != null && <span>{(daten.tour.meter / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km</span>}
              {daten.tour?.fahrSek != null && <span>{Math.round(daten.tour.fahrSek / 60)} Min. Fahrt</span>}
              <span>Abfahrt {e.startZeit}{daten.tour?.ankunftEnde ? ` · ${ende?.bezeichnung ?? "Ziel"} ${daten.tour.ankunftEnde}` : ""}</span>
            </div>
            <ol className="divide-y divide-sand-200 dark:divide-salbei-700">
              {aktiv.map((t, i) => {
                const fertig = t.status === "erledigt";
                const ziel = t.besuchId ? `/besuche/${t.besuchId}?zurueck=%2F` : `/betreuungen/${t.betreuungId}/besuch?termin=${t.id}&datum=${heute}&typ=${t.typ}&zurueck=%2F`;
                return (
                  <li key={t.id}>
                    <Link to={ziel} className={`flex items-center gap-3 px-5 py-3 hover:bg-sand-50 dark:hover:bg-salbei-700/30 ${fertig ? "opacity-60" : ""}`}>
                      <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${fertig ? "bg-slate-400" : "bg-orange-700"}`}>{fertig ? "✓" : i + 1}</span>
                      <span className="w-12 shrink-0 font-semibold tabular-nums">{t.ankunft ?? "–"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{t.klientin.name}</span>
                        <span className="block truncate text-sm text-slate-500">
                          {t.klientin.ort ?? ""}
                          {t.klientin.lebenstag != null && t.klientin.lebenstag >= 0 ? ` · LT ${t.klientin.lebenstag}` : ""}
                          {t.wichtig ? " · muss heute" : ""}
                        </span>
                      </span>
                      <span className={`shrink-0 text-sm font-medium ${fertig ? "text-salbei-600" : t.besuchId ? "text-amber-700" : "text-slate-500"}`}>
                        {fertig ? "dokumentiert" : t === naechster ? "als Nächstes" : t.besuchId ? "Entwurf" : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
            {wichtigOffen.length > 0 && (
              <div className="border-t border-sand-200 px-5 py-3 text-sm text-tulpe-500 dark:border-salbei-700">
                Noch nicht eingeplant, aber heute wichtig: {wichtigOffen.map((v) => v.name).join(", ")}
              </div>
            )}
          </div>
          <Karte punkte={punkte} linie={daten.tour?.geometrie} hoehe="h-64 lg:h-full lg:min-h-64" />
        </div>
      )}
    </section>
  );
}
