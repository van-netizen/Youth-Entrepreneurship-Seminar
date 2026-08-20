/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPS_SCRIPT_URL: string;
  readonly VITE_FEEDBACK_FORM_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
