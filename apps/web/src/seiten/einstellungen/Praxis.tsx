import { Feld, Laden, Meldung } from "../../komponenten/Formular";
import { api } from "../../lib/api";
import type { Praxis as PraxisTyp } from "../../lib/typen";
import { useDaten } from "../../lib/useDaten";
import { useFormular } from "../../lib/useFormular";

export function Praxis() {
  const { daten } = useDaten<PraxisTyp>("/api/praxis");
  return daten ? <PraxisFormular praxis={daten} /> : <Laden />;
}

function PraxisFormular({ praxis }: { praxis: PraxisTyp }) {
  const f = useFormular({ name: praxis.name, anschrift: praxis.anschrift, telefon: praxis.telefon ?? "", email: praxis.email ?? "" });
  return (
    <form
      className="karte space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void f.speichern((w) => api("/api/praxis", { method: "PUT", body: w }));
      }}
    >
      {f.meldung && <Meldung art={f.meldung.art}>{f.meldung.text}</Meldung>}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Feld label="Name der Praxis" fehler={f.felder.name}>
          <input className="feld" value={f.werte.name} onChange={(e) => f.setze("name", e.target.value)} />
        </Feld>
        <Feld label="Praxisstandort" fehler={f.felder.anschrift} hilfe="Steht allen Hebammen als Start- und Endpunkt für Touren zur Verfügung.">
          <input className="feld" value={f.werte.anschrift} onChange={(e) => f.setze("anschrift", e.target.value)} />
        </Feld>
        <Feld label="Telefon" fehler={f.felder.telefon}>
          <input className="feld" inputMode="tel" value={f.werte.telefon} onChange={(e) => f.setze("telefon", e.target.value)} />
        </Feld>
        <Feld label="E-Mail" fehler={f.felder.email} hilfe="Später das Domain-Postfach für Erinnerungen.">
          <input className="feld" type="email" value={f.werte.email} onChange={(e) => f.setze("email", e.target.value)} />
        </Feld>
      </div>
      <button className="knopf-primaer" disabled={f.speichert}>
        Speichern
      </button>
    </form>
  );
}
