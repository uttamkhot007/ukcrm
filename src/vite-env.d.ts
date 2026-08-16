/// <reference types="vite/client" />

// Build metadata injected by vite.config.ts `define`.
declare const __APP_VERSION__: string;
declare const __APP_BUILD_TIME__: string;
declare const __APP_COMMIT__: string;
declare const __APP_RELEASE_ID__: string;
declare const __APP_RELEASE_REVISION__: number;
declare const __APP_ENVIRONMENT__: string;

interface Window {
  __NEXUS_RELEASE_ID__?: string | null;
  __NEXUS_RELEASE_REVISION__?: number;
}
