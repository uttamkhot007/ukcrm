import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";

import "./index.css";
import { BUILD_VERSION, BUILD_TIME, BUILD_COMMIT } from "./lib/build-info";
import { installPreviewBuildRefreshHook } from "./lib/preview-build-refresh";

// Log build identity to console so it's easy to confirm which bundle
// the browser is actually running.
// eslint-disable-next-line no-console
console.info(
  `%c[build] v${BUILD_VERSION} · ${BUILD_TIME} · ${BUILD_COMMIT}`,
  "color:#a78bfa;font-weight:bold"
);

// Mark React as mounted so the static fallback badge in index.html hides
// itself. If this attribute never appears, the user knows React failed to
// boot and the static "html · <build-time>" badge stays visible.
document.documentElement.setAttribute("data-react-mounted", "1");
installPreviewBuildRefreshHook();

// Vite fires this when a preloaded module chunk cannot be fetched — almost
// always a dropped connection or a build that was replaced mid-session. We
// swallow the default hard error and let the retry layer / error boundary
// handle it, recovering onto a fresh build when the chunk is really gone.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const reason = (event as Event & { payload?: unknown }).payload;
  console.warn("[chunk] preload failed, will retry on demand", reason);
  if (navigator.onLine && isStaleDeployError(reason)) recoverFromStaleDeploy();
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
