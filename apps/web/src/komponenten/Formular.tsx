import type { ReactNode } from "react";

export function Feld({ label, fehler, hilfe, children }: { label: string; fehler?: string; hilfe?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="etikett">{label}</span>
      {children}
      {hilfe && !fehler && <span className="mt-1.5 block text-sm text-slate-500 dark:text-slate-400">{hilfe}</span>}
      {fehler && <span className="mt-1.5 block text-sm text-tulpe-500">{fehler}</span>}
    </label>
  );
}

export function Auswahl<T extends string>({
  wert,
  optionen,
  aendern,
  name,
}: {
  wert: T;
  optionen: Array<{ wert: T; label: string; hinweis?: string }>;
  aendern: (w: T) => void;
  name: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
      {optionen.map((o) => (
        <label
          key={o.wert}
          className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
            wert === o.wert ? "border-salbei-500 bg-salbei-50 dark:bg-salbei-700/40" : "border-sand-200 bg-white dark:border-salbei-700 dark:bg-salbei-900/40"
          }`}
        >
          <input type="radio" name={name} className="mt-1 size-5 accent-salbei-600" checked={wert === o.wert} onChange={() => aendern(o.wert)} />
          <span>
            <span className="block font-medium">{o.label}</span>
            {o.hinweis && <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">{o.hinweis}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

export function Meldung({ art, children }: { art: "ok" | "fehler" | "hinweis"; children: ReactNode }) {
  const stil = {
    ok: "border-salbei-200 bg-salbei-50 text-salbei-700 dark:bg-salbei-700/30 dark:text-salbei-100",
    fehler: "border-tulpe-500/40 bg-tulpe-100 text-tulpe-500 dark:bg-tulpe-500/10",
    hinweis: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200",
  }[art];
  return <div role={art === "fehler" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 ${stil}`}>{children}</div>;
}

export function Seitenkopf({ titel, untertitel, aktion }: { titel: string; untertitel?: ReactNode; aktion?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-salbei-700 sm:text-3xl dark:text-salbei-100">{titel}</h1>
        {untertitel && <p className="mt-1 text-slate-600 dark:text-slate-300">{untertitel}</p>}
      </div>
      {aktion}
    </div>
  );
}

export function Laden() {
  return <p className="py-8 text-center text-slate-500">Wird geladen …</p>;
}
