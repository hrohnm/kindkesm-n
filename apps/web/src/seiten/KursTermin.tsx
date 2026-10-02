import { KURS_FORMATE, type Ergebnis, type KursFormat } from "@kindkesmoeoen/shared";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Laden, Meldung, Seitenkopf } from "../komponenten/Formular";
import { UnterschriftFeld } from "../komponenten/Unterschrift";
import { api } from "../lib/api";
import { datum, euro } from "../lib/format";
import { useDaten } from "../lib/useDaten";
import type { Teilnahme } from "./Kurs";

type Unterschrift = { art: "keine" } | { art: "papier"; zeitpunkt: string } | { art: "tablet"; zeitpunkt: string; bild: string; name?: string | null };
type Eintrag = { teilnahme: Teilnahme; anwesend: boolean; unterschrift: Unterschrift; besuchId: string | null; versendet: boolean; betreuungId: string | null; ergebnis: Ergebnis | null; fehler?: string };
type Daten = {
  termin: { id: string; kursId: string; datum: string; von: string; bis: string; format: KursFormat; hebamme: string; thema: string | null; abgeschlossen: boolean };
  kurs: { id: string; titel: string };
  kasse: boolean;
  teilnehmerinnen: Eintrag[];
};

/** Anwesenheit eines Kurstermins per Tablet; bei Kassenkursen mit Unterschrift je Versicherte (Formular 3.4). */
export function KursTermin() {
  const { terminId } = useParams();
  const d = useDaten<Daten>(`/api/kurstermine/${terminId}`);
  if (!d.daten) return d.fehler ? <Meldung art="fehler">{d.fehler}</Meldung> : <Laden />;
  return <AnwesenheitFormular key={String(d.daten.termin.abgeschlossen) + d.daten.teilnehmerinnen.map((t) => t.besuchId).join()} d={d.daten} neuLaden={d.laden} />;
}

function AnwesenheitFormular({ d, neuLaden }: { d: Daten; neuLaden: () => Promise<void> }) {
  const [liste, setListe] = useState(() => d.teilnehmerinnen.map((t) => ({ id: t.teilnahme.id, anwesend: t.anwesend, unterschrift: t.unterschrift })));
  const [tablet, setTablet] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler" | "hinweis"; text: string }>();
  const [speichert, setSpeichert] = useState(false);
  const t = d.termin;
  const setze = (id: string, teil: Partial<(typeof liste)[number]>) => setListe((alt) => alt.map((x) => (x.id === id ? { ...x, ...teil } : x)));

  async function speichern(abschliessen: boolean) {
    setSpeichert(true);
    setMeldung(undefined);
    try {
      const r = await api<{ hinweise: string[] }>(`/api/kurstermine/${t.id}/anwesenheit`, { method: "PUT", body: { abschliessen, eintraege: liste.map((x) => ({ teilnahmeId: x.id, anwesend: x.anwesend, unterschrift: x.anwesend ? x.unterschrift : { art: "keine" } })) } });
      setMeldung(r.hinweise.length ? { art: "hinweis", text: r.hinweise.join(" ") } : { art: "ok", text: abschliessen ? (d.kasse ? "Termin abgeschlossen – die Kurseinheiten stehen zur Abrechnung bereit." : "Termin abgeschlossen.") : "Gespeichert." });
      await neuLaden();
    } catch (e) {
      setMeldung({ art: "fehler", text: (e as Error).message });
    } finally {
      setSpeichert(false);
    }
  }

  const anwesend = liste.filter((x) => x.anwesend).length;
  return (
    <>
      <Link to={`/kurse/${d.kurs.id}`} className="mb-3 inline-flex min-h-11 items-center text-salbei-600">‹ {d.kurs.titel}</Link>
      <Seitenkopf
        titel={`Anwesenheit ${datum(t.datum)}`}
        untertitel={`${t.format === 6 ? "Selbstlerneinheit" : `${t.von}–${t.bis} Uhr`} · ${KURS_FORMATE[t.format]} · rechnet ab: ${t.hebamme}${t.thema ? ` · ${t.thema}` : ""}`}
        aktion={
          <div className="flex gap-2">
            <button type="button" className="knopf-sekundaer" disabled={speichert} onClick={() => speichern(false)}>Zwischenspeichern</button>
            <button type="button" className="knopf-primaer" disabled={speichert} onClick={() => speichern(true)}>{t.abgeschlossen ? "Erneut abschließen" : "Termin abschließen"}</button>
          </div>
        }
      />
      {meldung && <div className="mb-4"><Meldung art={meldung.art}>{meldung.text}</Meldung></div>}
      {d.kasse && <p className="mb-4 text-sm text-slate-500">Kassenkurs: Jede anwesende Versicherte bestätigt die Kurseinheit mit ihrer Unterschrift (Formular 3.4). Beim Abschließen entsteht je Versicherte eine abrechenbare Kurseinheit.</p>}
      <p className="mb-3 font-medium">{anwesend} von {liste.length} anwesend</p>

      <ul className="space-y-3">
        {d.teilnehmerinnen.map((e) => {
          const x = liste.find((y) => y.id === e.teilnahme.id)!;
          return (
            <li key={e.teilnahme.id} className="karte" data-testid="anwesenheit">
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" aria-pressed={x.anwesend} disabled={e.versendet} onClick={() => setze(x.id, { anwesend: !x.anwesend })} className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold ${x.anwesend ? "bg-salbei-600 text-white" : "border-2 border-sand-200 bg-white text-transparent dark:border-salbei-700 dark:bg-salbei-900/40"}`} aria-label={`${e.teilnahme.name} anwesend`}>✓</button>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{e.teilnahme.name}{e.teilnahme.partner ? " + Partner" : ""}</div>
                  {d.kasse && (
                    <div className="text-sm text-slate-500">
                      {e.fehler ? <span className="text-tulpe-500">{e.fehler}</span> : e.ergebnis ? <>{e.ergebnis.einheitenAbrechenbar * 5} Min. · {euro(e.ergebnis.summe)}{e.ergebnis.hinweise.filter((h) => h.stufe !== "info").map((h) => <span key={h.text} className={`block ${h.stufe === "fehler" ? "text-tulpe-500" : "text-amber-800"}`}>{h.text}</span>)}</> : null}
                      {e.versendet && <span className="block font-medium">Bereits versendet – nicht mehr änderbar.</span>}
                    </div>
                  )}
                </div>
                {d.kasse && x.anwesend && !e.versendet && (
                  <div className="flex flex-wrap items-center gap-2">
                    {x.unterschrift.art === "tablet" ? (
                      <><img src={x.unterschrift.bild} alt="Unterschrift" className="h-12 rounded border border-sand-200 bg-white" /><button type="button" className="knopf-sekundaer min-h-10 px-3 text-sm" onClick={() => setze(x.id, { unterschrift: { art: "keine" } })}>Neu</button></>
                    ) : (
                      <>
                        <button type="button" className="knopf-sekundaer min-h-10 px-3 text-sm" onClick={() => setTablet(x.id)}>Auf dem Tablet unterschreiben</button>
                        <label className="flex min-h-10 items-center gap-2 text-sm">
                          <input type="checkbox" className="size-5 accent-salbei-600" checked={x.unterschrift.art === "papier"} onChange={(ev) => setze(x.id, { unterschrift: ev.target.checked ? { art: "papier", zeitpunkt: new Date().toISOString() } : { art: "keine" } })} />
                          auf Papier unterschrieben
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>
              {tablet === x.id && (
                <div className="mt-3 space-y-2">
                  <UnterschriftFeld aendern={(bild) => bild && setze(x.id, { unterschrift: { art: "tablet", zeitpunkt: new Date().toISOString(), bild, name: e.teilnahme.name } })} />
                  <button type="button" className="knopf-primaer min-h-10 px-4 text-sm" onClick={() => setTablet(null)}>Fertig</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {!liste.length && <p className="text-slate-500">Keine bestätigten Teilnehmerinnen.</p>}
    </>
  );
}
