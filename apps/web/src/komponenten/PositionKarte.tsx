import { useState } from "react";
import { Meldung } from "./Formular";
import { Karte } from "./Karte";

const QUELLE = {
  adresse: "aus der Adresse",
  strasse: "ungefähr (Mitte der Straße) – bitte prüfen",
  manuell: "von Hand gesetzt",
};

/** Position einer Wohnung bzw. eines Ortes anzeigen und per Tippen auf die Karte korrigieren. */
export function PositionKarte({
  titel,
  position,
  quelle,
  speichern,
  ausAdresse,
}: {
  titel: string;
  position: { lat: number; lon: number } | null;
  quelle?: keyof typeof QUELLE | null;
  speichern: (lat: number, lon: number) => Promise<void>;
  /** Position aus der Anschrift bestimmen lassen */
  ausAdresse?: () => Promise<void>;
}) {
  const [setzen, setSetzen] = useState(false);
  const [fehler, setFehler] = useState<string>();
  const [sucht, setSucht] = useState(false);
  return (
    <section className="karte space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{titel}</h2>
          <p className="text-sm text-slate-500">
            {position ? `Position ${quelle ? QUELLE[quelle] : "bekannt"}.` : "Position unbekannt – für Tourenplanung und Wegegeld aus der Adresse ermitteln oder auf der Karte setzen."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ausAdresse && (
            <button
              type="button"
              className="knopf-sekundaer"
              disabled={sucht}
              onClick={async () => {
                setFehler(undefined);
                setSucht(true);
                try {
                  await ausAdresse();
                } catch (e) {
                  setFehler((e as Error).message);
                } finally {
                  setSucht(false);
                }
              }}
            >
              {sucht ? "Sucht …" : "Aus Adresse ermitteln"}
            </button>
          )}
          <button type="button" className={setzen ? "knopf-primaer" : "knopf-sekundaer"} onClick={() => setSetzen((x) => !x)}>
            {setzen ? "Fertig" : position ? "Position korrigieren" : "Auf der Karte setzen"}
          </button>
        </div>
      </div>
      {setzen && <Meldung art="hinweis">Auf die Karte tippen, wo sich die Haustür befindet.</Meldung>}
      {fehler && <Meldung art="fehler">{fehler}</Meldung>}
      <Karte
        hoehe="h-56"
        punkte={position ? [{ ...position, text: "⌂", art: "besuch" }] : []}
        setzen={
          setzen
            ? (lat, lon) => {
                setFehler(undefined);
                speichern(lat, lon).catch((e: Error) => setFehler(e.message));
              }
            : undefined
        }
      />
    </section>
  );
}
