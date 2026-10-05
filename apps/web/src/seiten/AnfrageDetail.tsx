import { ANFRAGE_LEISTUNGEN, ANFRAGE_STATUS, sswAusEt } from "@kindkesmoeoen/shared";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Laden, Meldung } from "../komponenten/Formular";
import { IconPost } from "../komponenten/Icons";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { datum } from "../lib/format";
import { useDaten } from "../lib/useDaten";
import { STATUS_STIL, type Anfrage } from "./Anfragen";

type Vorschlag = { hebammeId: string; name: string; frei: number; kapazitaet: number; entfernungKm: number | null; abwesendUmEt: boolean; punkte: number; gruende: string[] };
type Detail = Anfrage & { vorschlag: Vorschlag[] };
const heute = () => new Date().toISOString().slice(0, 10);

/** Antwortvorlagen (E-Mail-Programm öffnet sich vorausgefüllt) – bis der E-Mail-Versand in der App kommt */
function vorlage(art: "zusage" | "warteliste" | "absage", a: Anfrage, absender: string) {
  const anrede = `Hallo ${a.vorname},`;
  const gruss = `\n\nHerzliche Grüße\n${absender}\nHebammenpraxis Kindkesmöön`;
  const text = {
    zusage: `${anrede}\n\nvielen Dank für deine Anfrage. Sehr gern begleiten wir dich in deiner Schwangerschaft und im Wochenbett (ET ${datum(a.et)}). Wir melden uns in den nächsten Tagen, um ein erstes Kennenlernen zu vereinbaren.`,
    warteliste: `${anrede}\n\nvielen Dank für deine Anfrage. Für deinen Entbindungstermin (${datum(a.et)}) sind unsere Plätze im Moment leider belegt. Wir haben dich auf unsere Warteliste gesetzt und melden uns, sobald ein Platz frei wird.`,
    absage: `${anrede}\n\nvielen Dank für deine Anfrage. Leider können wir dich zu deinem Entbindungstermin (${datum(a.et)}) nicht betreuen, da alle Plätze vergeben sind. Freie Hebammen in deiner Nähe findest du z. B. über die Hebammensuche des Landesverbands oder die Hebammenliste deiner Krankenkasse. Wir wünschen dir alles Gute!`,
  }[art];
  return `mailto:${a.email ?? ""}?subject=${encodeURIComponent("Deine Anfrage bei der Hebammenpraxis Kindkesmöön")}&body=${encodeURIComponent(text + gruss)}`;
}

export function AnfrageDetail() {
  const { id } = useParams();
  const { ich } = useAuth();
  const navigate = useNavigate();
  const d = useDaten<Detail>(`/api/anfragen/${id}`);
  const [notiz, setNotiz] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string }>();
  const [laeuft, setLaeuft] = useState(false);
  if (!d.daten) return d.fehler ? <Meldung art="fehler">{d.fehler}</Meldung> : <Laden />;
  const a = d.daten;
  const offen = a.status !== "zugesagt";

  async function aktion(body: Record<string, unknown>, ok: string) {
    setLaeuft(true);
    setMeldung(undefined);
    try {
      const r = await api<{ klientinId?: string }>(`/api/anfragen/${a.id}/aktion`, { method: "POST", body });
      if (r.klientinId) return navigate(`/klientinnen/${r.klientinId}`);
      setMeldung({ art: "ok", text: ok });
      setNotiz(null);
      await d.laden();
    } catch (e) {
      setMeldung({ art: "fehler", text: (e as Error).message });
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <>
      <Link to="/anfragen" className="mb-3 inline-flex min-h-11 items-center text-salbei-600">‹ Anfragen</Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-salbei-700 sm:text-3xl dark:text-salbei-100">{a.vorname} {a.nachname}</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Anfrage vom {datum(a.erstelltAm.slice(0, 10))} · {a.quelle === "website" ? "über die Website" : "telefonisch erfasst"}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_STIL[a.status]}`}>{ANFRAGE_STATUS[a.status]}</span>
      </div>
      {meldung && <div className="mb-4"><Meldung art={meldung.art}>{meldung.text}</Meldung></div>}
      {a.klientinId && <div className="mb-4"><Meldung art="ok">Zugesagt an {a.hebamme?.name}. <Link className="underline" to={`/klientinnen/${a.klientinId}`}>Zur Akte ›</Link></Meldung></div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="karte">
          <h2 className="mb-3 text-lg font-semibold">Angaben</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-slate-500">ET</dt><dd><strong>{datum(a.et)}</strong>{a.et >= heute() ? ` · heute SSW ${sswAusEt(a.et, heute()).text}` : ""}</dd>
            <dt className="text-slate-500">Wohnort</dt><dd>{[a.strasse, [a.plz, a.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</dd>
            <dt className="text-slate-500">Erstes Kind</dt><dd>{a.erstesKind === null ? "keine Angabe" : a.erstesKind ? "ja" : "nein"}</dd>
            <dt className="text-slate-500">Wünsche</dt><dd>{a.leistungen.map((l) => ANFRAGE_LEISTUNGEN[l]).join(", ") || "–"}</dd>
            <dt className="text-slate-500">Telefon</dt><dd>{a.telefon ? <a className="text-salbei-600 underline" href={`tel:${a.telefon}`}>{a.telefon}</a> : "–"}</dd>
            <dt className="text-slate-500">E-Mail</dt><dd className="truncate">{a.email ? <a className="text-salbei-600 underline" href={`mailto:${a.email}`}>{a.email}</a> : "–"}</dd>
            {a.einwilligungAm && (<><dt className="text-slate-500">Einwilligung</dt><dd>{new Date(a.einwilligungAm).toLocaleString("de-DE")} (Website)</dd></>)}
          </dl>
          {a.nachricht && <p className="mt-4 rounded-xl bg-sand-50 p-3 text-sm italic dark:bg-salbei-900/40">„{a.nachricht}“</p>}
        </section>

        <section className="karte">
          <h2 className="mb-1 text-lg font-semibold">Vorschlag</h2>
          <p className="mb-3 text-sm text-slate-500">Nach freier Kapazität im ET-Monat, Abwesenheiten rund um den ET und Entfernung.</p>
          <ul className="space-y-2">
            {a.vorschlag.map((v, i) => (
              <li key={v.hebammeId} className={`rounded-xl border p-3 ${i === 0 && v.kapazitaet > 0 ? "border-salbei-300 bg-salbei-50 dark:bg-salbei-700/30" : "border-sand-200 dark:border-salbei-700"}`} data-testid="vorschlag">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{v.name}{i === 0 && v.kapazitaet > 0 ? " · passt am besten" : ""}</span>
                  {offen && v.kapazitaet > 0 && (
                    <button type="button" disabled={laeuft} className="knopf-primaer min-h-10 px-4 text-sm" onClick={() => confirm(`Betreuung durch ${v.name} zusagen? Es wird eine Akte angelegt.`) && aktion({ aktion: "zusagen", hebammeId: v.hebammeId }, "Zugesagt.")}>
                      Zusagen
                    </button>
                  )}
                </div>
                <p className={`mt-1 text-sm ${v.frei > 0 && !v.abwesendUmEt ? "text-salbei-700 dark:text-salbei-200" : "text-amber-800 dark:text-amber-200"}`}>{v.gruende.join(" · ")}</p>
              </li>
            ))}
          </ul>
          <Link to={`/belegung?start=${a.et.slice(0, 7)}`} className="mt-3 inline-block text-sm text-salbei-600 underline">Belegungsplan ab {datum(a.et).slice(3)} ›</Link>
        </section>
      </div>

      <section className="karte mt-4 space-y-3">
        <h2 className="text-lg font-semibold">Bearbeiten</h2>
        <label className="block">
          <span className="etikett">Interne Notiz (für Warteliste, Absage, Weiterleitung)</span>
          <textarea className="feld min-h-20" value={notiz ?? a.notiz ?? ""} onChange={(e) => setNotiz(e.target.value)} placeholder="z. B. Rückruf am …, weitergeleitet an Hebamme …" />
        </label>
        <div className="flex flex-wrap gap-2">
          {notiz !== null && <button type="button" disabled={laeuft} className="knopf-sekundaer" onClick={() => aktion({ aktion: "notiz", notiz }, "Notiz gespeichert.")}>Notiz speichern</button>}
          {offen && a.status === "neu" && <button type="button" disabled={laeuft} className="knopf-sekundaer" onClick={() => aktion({ aktion: "pruefen" }, "Als „in Prüfung“ markiert.")}>In Prüfung</button>}
          {offen && a.status !== "warteliste" && <button type="button" disabled={laeuft} className="knopf-sekundaer" onClick={() => aktion({ aktion: "warteliste", notiz: notiz && notiz !== a.notiz ? notiz : null }, "Auf die Warteliste gesetzt.")}>Warteliste</button>}
          {offen && <button type="button" disabled={laeuft} className="knopf-sekundaer" onClick={() => aktion({ aktion: "weiterleiten", notiz: notiz && notiz !== a.notiz ? notiz : "" }, "Als weitergeleitet markiert.")}>Weitergeleitet</button>}
          {offen && <button type="button" disabled={laeuft} className="knopf-gefahr" onClick={() => confirm("Anfrage absagen?") && aktion({ aktion: "absagen", notiz: notiz && notiz !== a.notiz ? notiz : null }, "Abgesagt.")}>Absagen</button>}
          <button type="button" className="knopf-gefahr ml-auto" onClick={async () => { if (confirm("Anfrage endgültig löschen?")) { await api(`/api/anfragen/${a.id}`, { method: "DELETE" }); navigate("/anfragen"); } }}>Löschen</button>
        </div>
        {a.email && (
          <div className="border-t border-sand-200 pt-3 dark:border-salbei-700">
            <p className="mb-2 text-sm text-slate-500">Antwort per E-Mail (öffnet das E-Mail-Programm mit Vorlage):</p>
            <div className="flex flex-wrap gap-2">
              {(["zusage", "warteliste", "absage"] as const).map((art) => (
                <a key={art} className="knopf-sekundaer min-h-10 px-4 text-sm" href={vorlage(art, a, ich?.name ?? "")}><IconPost className="size-5" /> {art === "zusage" ? "Zusage" : art === "warteliste" ? "Warteliste" : "Absage"}</a>
              ))}
            </div>
          </div>
        )}
        <p className="text-xs text-slate-500">Abgeschlossene Anfragen werden nach 6 Monaten automatisch gelöscht.</p>
      </section>
    </>
  );
}
