/// <reference types="vite/client" />

export {}

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string
    /** OAuth 2.0 Web Client ID (same as backend GOOGLE_CLIENT_ID). */
    readonly VITE_GOOGLE_CLIENT_ID?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }

  /** Google Identity Services (accounts.google.com/gsi/client). */
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (resp: { credential: string }) => void
          }) => void
          renderButton: (
            parent: HTMLElement,
            config: Record<string, string | number | boolean | undefined>,
          ) => void
        }
      }
    }
  }
}
