import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
