import { NavLink, Outlet } from "react-router";
import { Seitenkopf } from "../komponenten/Formular";

const UNTER = [
  { to: "/einstellungen", label: "Mein Profil", ende: true },
  { to: "/einstellungen/orte", label: "Orte & Touren" },
  { to: "/einstellungen/abrechnung", label: "Abrechnung" },
  { to: "/einstellungen/praxis", label: "Praxis" },
  { to: "/einstellungen/passwort", label: "Passwort" },
];

export function Einstellungen() {
  return (
    <>
      <Seitenkopf titel="Einstellungen" />
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {UNTER.map((u) => (
          <NavLink
            key={u.to}
            to={u.to}
            end={u.ende}
            className={({ isActive }) => `flex min-h-12 shrink-0 items-center rounded-full px-5 font-medium ${isActive ? "bg-meer-600 text-white" : "bg-white text-slate-600 dark:bg-meer-900/50 dark:text-slate-300"}`}
          >
            {u.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </>
  );
}
