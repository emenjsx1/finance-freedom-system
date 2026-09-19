// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SCOPE,
  APP_SHORT_NAME,
  APP_START_URL,
  BACKGROUND_COLOR,
  THEME_COLOR,
} from "./src/lib/brand";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        // The guarded wrapper in src/lib/pwa/register.ts is the only registrar.
        injectRegister: null,
        devOptions: { enabled: false },
        filename: "sw.js",
        manifest: {
          name: `${APP_NAME} — ${APP_DESCRIPTION}`,
          short_name: APP_SHORT_NAME,
          description: APP_DESCRIPTION,
          start_url: APP_START_URL,
          scope: APP_SCOPE,
          display: "standalone",
          orientation: "portrait",
          background_color: BACKGROUND_COLOR,
          theme_color: THEME_COLOR,
          lang: "pt",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
          shortcuts: [
            { name: "Nova despesa", short_name: "Despesa", url: "/app?quick=expense" },
            { name: "Nova entrada", short_name: "Entrada", url: "/app?quick=income" },
            { name: "Agente", short_name: "Agente", url: "/app/agent" },
            { name: "Hoje", short_name: "Hoje", url: "/app/development/today" },
          ],
        },
        workbox: {
          // Push and notification-click handling. Contains no secrets.
          importScripts: ["/push-sw.js"],
          globPatterns: ["**/*.{js,css,woff,woff2,png,svg,ico}"],
          // The app shell is server-rendered; navigations always try the network first.
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false,
          runtimeCaching: [
            {
              // Never cache-first HTML, and never cache a private response.
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "app-shell",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin && (request.destination === "script" || request.destination === "style" || request.destination === "font"),
              handler: "CacheFirst",
              options: {
                cacheName: "static-assets",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "images",
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
