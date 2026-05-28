/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_ENV: string;
  readonly VITE_DEV_PORT: string;
  readonly VITE_PREVIEW_PORT: string;
  readonly VITE_MOCK_LATENCY_MS: string;
  readonly VITE_MOCK_ERROR_RATE: string;
  readonly VITE_DEFAULT_THEME: "light" | "dark" | "system";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
