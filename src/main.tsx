import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";

import "./index.css";
import { BUILD_VERSION, BUILD_TIME, BUILD_COMMIT } from "./lib/build-info";
import { installPreviewBuildRefreshHook } from "./lib/preview-build-refresh";
import { installBuildCacheStrategy } from "./lib/build-cache-strategy";
import { enforceApprovedDesign } from "./lib/approved-design-lock";
import { isStaleDeployError, recoverFromStaleDeploy } from "./lib/chunk-retry";


// Log build identity to console so it's easy to confirm which bundle
// the browser is actually running.
// eslint-disable-next-line no-console
console.info(
  `%c[build] v${BUILD_VERSION} · ${BUILD_TIME} · ${BUILD_COMMIT}`,
  "color:#a78bfa;font-weight:bold"
);

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

async function mountCurrentRelease() {
  const releaseIsCurrent = await installBuildCacheStrategy();
  if (releaseIsCurrent) {
    const root = document.getElementById("root");
    if (root) {
      // Only hide the static build marker once this release is allowed to paint.
      document.documentElement.setAttribute("data-react-mounted", "1");
      createRoot(root).render(
        <HelmetProvider>
          <App />
        </HelmetProvider>
      );
    }
  }
}

void mountCurrentRelease();
