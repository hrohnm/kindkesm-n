import { HEBAMME_STATUS, HEBAMME_STATUS_LABEL, type HebammeStatus } from "@kindkesmoeoen/shared";
import { Auswahl, Feld, Laden, Meldung } from "../../komponenten/Formular";
import { api } from "../../lib/api";
import type { Profil as ProfilTyp } from "../../lib/typen";
import { useDaten } from "../../lib/useDaten";
import { useFormular } from "../../lib/useFormular";

export function Profil() {
  const { daten } = useDaten<ProfilTyp>("/api/ich/profil");
  return daten ? <ProfilFormular profil={daten} /> : <Laden />;
}

function ProfilFormular({ profil }: { profil: ProfilTyp }) {
  const f = useFormular({ ...profil, telefon: profil.telefon ?? "", ik: profil.ik ?? "", babypauseBis: profil.babypauseBis ?? "" });
  return (
    <form
      className="karte space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void f.speichern((w) => api("/api/ich/profil", { method: "PUT", body: w }));
      }}
    >
      {f.meldung && <Meldung art={f.meldung.art}>{f.meldung.text}</Meldung>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Feld label="Name" fehler={f.felder.name}>
          <input className="feld" value={f.werte.name} onChange={(e) => f.setze("name", e.target.value)} />
        </Feld>
        <Feld label="Kürzel" fehler={f.felder.kuerzel} hilfe="Erscheint im Kalender und auf Listen.">
          <input className="feld" maxLength={4} value={f.werte.kuerzel} onChange={(e) => f.setze("kuerzel", e.target.value)} />
        </Feld>
        <Feld label="E-Mail (Anmeldung)">
          <input className="feld opacity-70" value={f.werte.email} disabled />
        </Feld>
        <Feld label="Telefon" fehler={f.felder.telefon}>
          <input className="feld" inputMode="tel" value={f.werte.telefon} onChange={(e) => f.setze("telefon", e.target.value)} />
        </Feld>
        <Feld label="Institutionskennzeichen (IK)" fehler={f.felder.ik} hilfe="9 Ziffern, beginnt mit 45. Steht auf jedem Abrechnungsbeleg.">
          <input className="feld" inputMode="numeric" maxLength={9} value={f.werte.ik} onChange={(e) => f.setze("ik", e.target.value.replace(/\D/g, ""))} />
        </Feld>
      </div>
      <div>
        <span className="etikett">Status</span>
        <Auswahl<HebammeStatus>
          name="status"
          wert={f.werte.status}
          aendern={(w) => f.setze("status", w)}
          optionen={HEBAMME_STATUS.map((s) => ({ wert: s, label: HEBAMME_STATUS_LABEL[s] }))}
        />
      </div>
      {f.werte.status === "babypause" && (
        <Feld label="Babypause voraussichtlich bis" fehler={f.felder.babypauseBis} hilfe="Wird im Belegungsplan berücksichtigt; das Team wird vorher erinnert.">
          <input className="feld sm:max-w-xs" type="date" value={f.werte.babypauseBis} onChange={(e) => f.setze("babypauseBis", e.target.value)} />
        </Feld>
      )}
      <button className="knopf-primaer" disabled={f.speichert}>
        Speichern
      </button>
    </form>
  );
}
