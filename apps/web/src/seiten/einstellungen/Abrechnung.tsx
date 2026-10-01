import {
  ABRECHNUNGSWEGE,
  ABRECHNUNGSWEG_HINWEIS,
  ABRECHNUNGSWEG_LABEL,
  BELEGARTEN,
  BELEGART_LABEL,
  UNTERSCHRIFTSVERFAHREN,
  UNTERSCHRIFT_LABEL,
  VERSANDRHYTHMEN,
  VERSANDRHYTHMUS_LABEL,
  isoDatum,
  naechsterVersandtermin,
  type Abrechnungsweg,
  type Belegart,
  type Unterschriftsverfahren,
  type Versandrhythmus,
} from "@kindkesmoeoen/shared";
import { Auswahl, Feld, Laden, Meldung } from "../../komponenten/Formular";
import { api } from "../../lib/api";
import { datum } from "../../lib/format";
import type { Abrechnung as AbrechnungTyp } from "../../lib/typen";
import { useDaten } from "../../lib/useDaten";
import { useFormular } from "../../lib/useFormular";

const STANDARD: AbrechnungTyp = {
  weg: "hebset",
  abrechnungsstelleName: null,
  abrechnungsstelleAnschrift: null,
  belegart: "eigendruck_amtliches_formular",
  unterschrift: "papier",
  versandRhythmus: "monatlich",
  versandTag: 1,
  erinnerungVorlaufTage: 2,
};

export function Abrechnung() {
  const { daten, laedt } = useDaten<AbrechnungTyp | null>("/api/ich/abrechnung");
  if (laedt && daten === undefined) return <Laden />;
  return <AbrechnungFormular start={daten ?? STANDARD} />;
}

function AbrechnungFormular({ start }: { start: AbrechnungTyp }) {
  const f = useFormular({ ...start, abrechnungsstelleName: start.abrechnungsstelleName ?? "", abrechnungsstelleAnschrift: start.abrechnungsstelleAnschrift ?? "" });
  const w = f.werte;
  const naechster = naechsterVersandtermin(new Date(), w.versandRhythmus, w.versandTag);

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void f.speichern((werte) =>
          api("/api/ich/abrechnung", {
            method: "PUT",
            body: { ...werte, abrechnungsstelleName: werte.abrechnungsstelleName || null, abrechnungsstelleAnschrift: werte.abrechnungsstelleAnschrift || null },
          }),
        );
      }}
    >
      {f.meldung && <Meldung art={f.meldung.art}>{f.meldung.text}</Meldung>}

      <section className="karte space-y-4">
        <h2 className="text-lg font-semibold">Abrechnungsweg</h2>
        <Auswahl<Abrechnungsweg>
          name="weg"
          wert={w.weg}
          aendern={(v) => f.setze("weg", v)}
          optionen={ABRECHNUNGSWEGE.map((x) => ({ wert: x, label: ABRECHNUNGSWEG_LABEL[x], hinweis: ABRECHNUNGSWEG_HINWEIS[x] }))}
        />
        {w.weg === "andere_abrechnungsstelle" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Feld label="Name der Abrechnungsstelle" fehler={f.felder.abrechnungsstelleName}>
              <input className="feld" value={w.abrechnungsstelleName} onChange={(e) => f.setze("abrechnungsstelleName", e.target.value)} />
            </Feld>
            <Feld label="Anschrift" fehler={f.felder.abrechnungsstelleAnschrift}>
              <input className="feld" value={w.abrechnungsstelleAnschrift} onChange={(e) => f.setze("abrechnungsstelleAnschrift", e.target.value)} />
            </Feld>
          </div>
        )}
      </section>

      <section className="karte space-y-4">
        <h2 className="text-lg font-semibold">Belege</h2>
        <div>
          <span className="etikett">Belegart</span>
          <Auswahl<Belegart>
            name="belegart"
            wert={w.belegart}
            aendern={(v) => f.setze("belegart", v)}
            optionen={BELEGARTEN.map((x) => ({
              wert: x,
              label: BELEGART_LABEL[x],
              hinweis: x === "eigendruck_amtliches_formular" ? "Die App druckt die Formulare mit fertigem Kopf." : "Die App zeigt die einzutragende Zeile und erstellt Kontrolllisten.",
            }))}
          />
        </div>
        <div>
          <span className="etikett">Unterschrift der Versicherten</span>
          <Auswahl<Unterschriftsverfahren>
            name="unterschrift"
            wert={w.unterschrift}
            aendern={(v) => f.setze("unterschrift", v)}
            optionen={UNTERSCHRIFTSVERFAHREN.map((x) => ({
              wert: x,
              label: UNTERSCHRIFT_LABEL[x],
              hinweis: x === "papier" ? "Direkt nach der Leistung auf dem Formular." : "Direkt nach der Leistung mit Stift oder Finger; wird beim Versand mitgedruckt.",
            }))}
          />
          <p className="mt-2 text-sm text-slate-500">Laut § 12 Anlage 1.1 muss die Versicherte unverzüglich nach jeder Leistung unterschreiben; nachträgliche oder gesammelte Unterschriften sind unzulässig.</p>
          {w.unterschrift === "tablet" && w.weg !== "hebset" && (
            <div className="mt-3"><Meldung art="hinweis">Bitte klären, ob die gewählte Abrechnungsstelle Tablet-Unterschriften akzeptiert.</Meldung></div>
          )}
        </div>
      </section>

      <section className="karte space-y-4">
        <h2 className="text-lg font-semibold">Versand und Erinnerung</h2>
        <div>
          <span className="etikett">Rhythmus</span>
          <Auswahl<Versandrhythmus> name="rhythmus" wert={w.versandRhythmus} aendern={(v) => f.setze("versandRhythmus", v)} optionen={VERSANDRHYTHMEN.map((x) => ({ wert: x, label: VERSANDRHYTHMUS_LABEL[x] }))} />
          <p className="mt-2 text-sm text-slate-500">Anlage 2 § 2: höchstens einmal im Monat, mindestens zweimal im Jahr; Leistungen des Vorjahres bis 30.06.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Feld label="Stichtag im Monat" fehler={f.felder.versandTag} hilfe={`Nächster Versand: ${datum(isoDatum(naechster))}`}>
            <input className="feld" type="number" min={1} max={28} value={w.versandTag} onChange={(e) => f.setze("versandTag", Number(e.target.value))} />
          </Feld>
          <Feld label="Erinnerung (Tage vorher)" fehler={f.felder.erinnerungVorlaufTage}>
            <input className="feld" type="number" min={0} max={14} value={w.erinnerungVorlaufTage} onChange={(e) => f.setze("erinnerungVorlaufTage", Number(e.target.value))} />
          </Feld>
        </div>
      </section>

      <button className="knopf-primaer" disabled={f.speichert}>Speichern</button>
    </form>
  );
}
