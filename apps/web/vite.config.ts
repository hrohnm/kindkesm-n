import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Kindkesmöön – Hebammenpraxis",
        short_name: "Kindkesmöön",
        description: "Praxis-App der Hebammenpraxis Kindkesmöön",
        lang: "de",
        theme_color: "#1f5f6b",
        background_color: "#f6f3ee",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        // API-Antworten werden in Meilenstein 6 (Offline) gezielt zwischengespeichert
        runtimeCaching: [],
      },
    }),
  ],
  server: {
    port: 5173,
    // Zugriff über die weitergeleitete Adresse eines GitHub Codespaces erlauben
    allowedHosts: [".app.github.dev"],
    proxy: { "/api": "http://localhost:3000" },
  },
});
