import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { Layout } from "./komponenten/Layout";
import "./index.css";
import { AuthProvider, useAuth } from "./lib/auth";
import { Anmelden } from "./seiten/Anmelden";
import { Cockpit } from "./seiten/Cockpit";
import { Einstellungen } from "./seiten/Einstellungen";
import { Abrechnung } from "./seiten/einstellungen/Abrechnung";
import { OrteTouren } from "./seiten/einstellungen/OrteTouren";
import { Passwort } from "./seiten/einstellungen/Passwort";
import { Praxis } from "./seiten/einstellungen/Praxis";
import { Profil } from "./seiten/einstellungen/Profil";
import { Regelwerk } from "./seiten/Regelwerk";
import { Team } from "./seiten/Team";

function App() {
  const { ich } = useAuth();
  if (ich === undefined) return null;
  if (ich === null) return <Anmelden />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Cockpit />} />
        <Route path="team" element={<Team />} />
        <Route path="regelwerk" element={<Regelwerk />} />
        <Route path="einstellungen" element={<Einstellungen />}>
          <Route index element={<Profil />} />
          <Route path="orte" element={<OrteTouren />} />
          <Route path="abrechnung" element={<Abrechnung />} />
          <Route path="praxis" element={<Praxis />} />
          <Route path="passwort" element={<Passwort />} />
        </Route>
        <Route path="*" element={<Cockpit />} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
