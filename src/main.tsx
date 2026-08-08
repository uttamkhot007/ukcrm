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

createRoot(document.getElementById("root")!).render(<App />);
