/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL de base de l'API Leitner, sans slash final (ex. https://leitner-api.onrender.com). */
  readonly VITE_APP_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
