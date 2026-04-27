import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BUILD_VERSION, BUILD_TIME, BUILD_COMMIT } from "./lib/build-info";

// Log build identity to console so it's easy to confirm which bundle
// the browser is actually running.
// eslint-disable-next-line no-console
console.info(
  `%c[build] v${BUILD_VERSION} · ${BUILD_TIME} · ${BUILD_COMMIT}`,
  "color:#a78bfa;font-weight:bold"
);

const clearLegacyAppCaches = async () => {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }
};

clearLegacyAppCaches().catch((error) => {
  console.warn("Legacy app cache cleanup skipped", error);
});

createRoot(document.getElementById("root")!).render(<App />);
