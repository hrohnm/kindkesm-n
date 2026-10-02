import { DOKU_FELDER } from "@kindkesmoeoen/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Meldung } from "../../komponenten/Formular";
import { abgleichen, eigeneFassungUebernehmen, erneutVersuchen, verwerfen, type AusgangEintrag } from "../../lib/offline/ausgang";
import { useAusgang } from "../../lib/offline/hooks";
import { speicherVerfuegbar } from "../../lib/offline/speicher";
import { fuerUnterwegsLaden, letzterVorrat } from "../../lib/offline/vorrat";
import { useOffline } from "../../lib/offline/zustand";

const zeit = (t: number) => new Date(t).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const LEISTUNG_LABEL: Record<string, string> = { datum: "Datum", von: "Beginn", bis: "Ende", typ: "Leistung", art: "Art", material: "Material", unterschrift: "Unterschrift", notiz: "Notiz" };

function feldName(k: string) {
  if (LEISTUNG_LABEL[k]) return LEISTUNG_LABEL[k];
  const [bereich, a, b] = k.split(".");
  if (bereich === "mutter") return `Mutter · ${DOKU_FELDER.mutter.find((f) => f.id === a)?.label ?? a}`;
  if (bereich === "kinder") return `Kind · ${DOKU_FELDER.kind.find((f) => f.id === b)?.label ?? b}`;
  return k;
}

/** Offline-Betrieb: Daten für unterwegs laden, Warteschlange ansehen, Konflikte entscheiden. */
export function Offline() {
  const z = useOffline();
  const liste = useAusgang();
  const [vorrat, setVorrat] = useState(letzterVorrat());
  const [laedt, setLaedt] = useState(false);
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string }>();

  useEffect(() => {
    const neu = () => setVorrat(letzterVorrat());
    window.addEventListener("kk:vorrat", neu);
    return () => window.removeEventListener("kk:vorrat", neu);
  }, []);

  async function vorladen() {
    setLaedt(true);
    setMeldung(undefined);
    try {
      const r = await fuerUnterwegsLaden();
      setMeldung(r.fehler ? { art: "fehler", text: `${r.anzahl} Datensätze geladen, ${r.fehler} konnten nicht geladen werden.` } : { art: "ok", text: `${r.anzahl} Datensätze für heute und morgen auf dem Gerät gespeichert.` });
    } catch (e) {
      setMeldung({ art: "fehler", text: (e as Error).message });
    } finally {
      setLaedt(false);
    }
  }

  return (
    <div className="space-y-5">
      {!speicherVerfuegbar && <Meldung art="fehler">Dieser Browser bietet keinen verschlüsselten Speicher (nur über HTTPS verfügbar). Offline-Betrieb ist hier nicht möglich.</Meldung>}

      <section className="karte space-y-3">
        <h2 className="text-lg font-semibold">Für unterwegs</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Lädt Tour, Akten, frühere Besuche, Gewichtsverläufe und das gültige Regelwerk für <strong>heute und morgen</strong> auf das Gerät. Das passiert automatisch beim Start und stündlich, solange Verbindung besteht – vor einer Tour in ein Funkloch lohnt sich ein Druck auf den Knopf.
        </p>
        <p className="text-sm">
          Verbindung: <strong data-testid="verbindung">{z.verbunden ? "online" : "offline"}</strong>
          {vorrat ? ` · zuletzt geladen ${zeit(vorrat.zeit)} (${vorrat.anzahl} Datensätze)` : " · noch nichts geladen"}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="knopf-primaer" disabled={laedt || !z.verbunden || !speicherVerfuegbar} onClick={vorladen}>
            {laedt ? "Lädt …" : "Für unterwegs laden"}
          </button>
          <button type="button" className="knopf-sekundaer" disabled={!z.verbunden || z.synchronisiert} onClick={() => void abgleichen()}>
            Jetzt abgleichen
          </button>
        </div>
        {meldung && <Meldung art={meldung.art}>{meldung.text}</Meldung>}
      </section>

      <section className="karte space-y-3">
        <h2 className="text-lg font-semibold">Noch nicht übertragen {liste.length ? `(${liste.length})` : ""}</h2>
        {!liste.length && <p className="text-sm text-slate-500">Alle Änderungen sind auf dem Server.</p>}
        {liste.map((e) => (
          <Eintrag key={e.id} e={e} />
        ))}
      </section>

      <section className="karte space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Datenschutz auf dem Gerät</h2>
        <p>Gespeicherte Daten sind verschlüsselt (AES-256) und gehören nur zu Ihrer Anmeldung. Sie werden nach 14 Tagen verworfen und beim Abmelden vollständig gelöscht.</p>
        <p>Wichtig bleibt eine Bildschirmsperre mit PIN und die Geräteverschlüsselung des Tablets bzw. Handys.</p>
      </section>
    </div>
  );
}

function Eintrag({ e }: { e: AusgangEintrag }) {
  const oeffnen = e.methode === "POST" ? `/betreuungen/${e.betreuungId}/besuch?ausgang=${e.id}&zurueck=/einstellungen/offline` : `/besuche/${e.id}?zurueck=/einstellungen/offline`;
  const status = { wartet: ["wartet", "bg-amber-100 text-amber-800"], fehler: ["Fehler", "bg-tulpe-100 text-tulpe-500"], konflikt: ["Konflikt", "bg-tulpe-100 text-tulpe-500"] }[e.status];
  return (
    <div className="rounded-xl border border-sand-200 p-3 dark:border-salbei-700" data-testid="ausgang-eintrag">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{e.titel}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status[1]}`}>{status[0]}</span>
        <span className="text-xs text-slate-500">{e.methode === "POST" ? "neuer Besuch" : "Änderung"} · {zeit(e.erstellt)}</span>
      </div>
      {e.status === "fehler" && <p className="mt-2 text-sm text-tulpe-500">{e.fehler}</p>}
      {e.status === "konflikt" && (
        <div className="mt-2 space-y-2 text-sm">
          <p>Dieser Besuch wurde inzwischen auf einem anderen Gerät geändert. Diese Felder unterscheiden sich:</p>
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1 pr-2 font-medium">Feld</th>
                <th className="py-1 pr-2 font-medium">Dieses Gerät</th>
                <th className="py-1 font-medium">Anderes Gerät</th>
              </tr>
            </thead>
            <tbody>
              {e.konfliktFelder?.map((k) => (
                <tr key={k.feld} className="border-t border-sand-200 dark:border-salbei-700">
                  <td className="py-1 pr-2">{feldName(k.feld)}</td>
                  <td className="py-1 pr-2 font-medium">{k.mein}</td>
                  <td className="py-1">{k.anderes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500">Alle übrigen Änderungen beider Geräte werden zusammengeführt.</p>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {e.status === "konflikt" ? (
          <>
            <button type="button" className="knopf-primaer min-h-11 px-4 text-sm" onClick={() => void eigeneFassungUebernehmen(e.id)}>Diese Fassung übernehmen</button>
            <button type="button" className="knopf-sekundaer min-h-11 px-4 text-sm" onClick={() => confirm("Die Änderung dieses Geräts verwerfen und die Fassung des anderen Geräts behalten?") && void verwerfen(e.id)}>Andere Fassung behalten</button>
          </>
        ) : (
          <>
            <Link to={oeffnen} className="knopf-sekundaer min-h-11 px-4 text-sm">Öffnen</Link>
            {e.status === "fehler" && <button type="button" className="knopf-sekundaer min-h-11 px-4 text-sm" onClick={() => void erneutVersuchen(e.id)}>Erneut senden</button>}
            <button type="button" className="knopf-gefahr min-h-11 px-4 text-sm" onClick={() => confirm("Diese Änderung endgültig verwerfen? Sie wurde noch nicht übertragen.") && void verwerfen(e.id)}>Verwerfen</button>
          </>
        )}
      </div>
    </div>
  );
}
