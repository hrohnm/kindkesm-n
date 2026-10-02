import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { Layout } from "./komponenten/Layout";
import "./index.css";
import { AuthProvider, useAuth } from "./lib/auth";
import { AbrechnungSeite } from "./seiten/AbrechnungSeite";
import { Akte } from "./seiten/Akte";
import { Anmelden } from "./seiten/Anmelden";
import { Besuch } from "./seiten/Besuch";
import { Cockpit } from "./seiten/Cockpit";
import { Einstellungen } from "./seiten/Einstellungen";
import { Fahrtenbuch } from "./seiten/Fahrtenbuch";
import { Gewicht } from "./seiten/Gewicht";
import { Abrechnung } from "./seiten/einstellungen/Abrechnung";
import { Ansicht } from "./seiten/einstellungen/Ansicht";
import { Offline } from "./seiten/einstellungen/Offline";
import { OrteTouren } from "./seiten/einstellungen/OrteTouren";
import { Passwort } from "./seiten/einstellungen/Passwort";
import { Praxis } from "./seiten/einstellungen/Praxis";
import { Profil } from "./seiten/einstellungen/Profil";
import { Klientinnen } from "./seiten/Klientinnen";
import { Regelwerk } from "./seiten/Regelwerk";
import { Team } from "./seiten/Team";
import { Tour } from "./seiten/Tour";

function App() {
  const { ich } = useAuth();
  if (ich === undefined) return null;
  if (ich === null) return <Anmelden />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Cockpit />} />
        <Route path="klientinnen" element={<Klientinnen />} />
        <Route path="klientinnen/:id" element={<Akte />} />
        <Route path="betreuungen/:betreuungId/besuch" element={<Besuch />} />
        <Route path="besuche/:id" element={<Besuch />} />
        <Route path="tour" element={<Tour />} />
        <Route path="tour/:datum" element={<Tour />} />
        <Route path="fahrtenbuch" element={<Fahrtenbuch />} />
        <Route path="kinder/:id/gewicht" element={<Gewicht />} />
        <Route path="abrechnung" element={<AbrechnungSeite />} />
        <Route path="team" element={<Team />} />
        <Route path="regelwerk" element={<Regelwerk />} />
        <Route path="einstellungen" element={<Einstellungen />}>
          <Route index element={<Profil />} />
          <Route path="orte" element={<OrteTouren />} />
          <Route path="dokumentation" element={<Ansicht />} />
          <Route path="abrechnung" element={<Abrechnung />} />
          <Route path="praxis" element={<Praxis />} />
          <Route path="offline" element={<Offline />} />
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
