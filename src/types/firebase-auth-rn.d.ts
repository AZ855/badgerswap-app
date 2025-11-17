declare module '@firebase/auth/dist/rn/index.js' {
  import type { FirebaseApp } from 'firebase/app';
  import type { Persistence, Auth, PopupRedirectResolver } from 'firebase/auth';

  interface InitializeAuthSettings {
    persistence: Persistence | Persistence[];
    popupRedirectResolver?: PopupRedirectResolver;
  }

  export function initializeAuth(app: FirebaseApp, settings?: InitializeAuthSettings): Auth;
  export function getReactNativePersistence(storage: {
    setItem: (key: string, value: string) => Promise<void>;
    getItem: (key: string) => Promise<string | null>;
    removeItem: (key: string) => Promise<void>;
  }): Persistence;
}
