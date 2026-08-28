import { createClient, SupportedStorage } from "@supabase/supabase-js";

const AUTH_PERSISTENCE_KEY = "equishopper-auth-persistence";
type AuthPersistenceMode = "local" | "session";

const memoryStorage = new Map<string, string>();

function getPersistenceMode(): AuthPersistenceMode {
  if (typeof window === "undefined") {
    return "local";
  }

  return window.localStorage.getItem(AUTH_PERSISTENCE_KEY) === "session"
    ? "session"
    : "local";
}

const authStorage: SupportedStorage = {
  getItem(key: string) {
    if (typeof window === "undefined") {
      return memoryStorage.get(key) ?? null;
    }

    const storage =
      getPersistenceMode() === "local"
        ? window.localStorage
        : window.sessionStorage;

    return storage.getItem(key);
  },

  setItem(key: string, value: string) {
    if (typeof window === "undefined") {
      memoryStorage.set(key, value);
      return;
    }

    const mode = getPersistenceMode();
    const target =
      mode === "local"
        ? window.localStorage
        : window.sessionStorage;
    const other =
      mode === "local"
        ? window.sessionStorage
        : window.localStorage;

    target.setItem(key, value);
    other.removeItem(key);
  },

  removeItem(key: string) {
    if (typeof window === "undefined") {
      memoryStorage.delete(key);
      return;
    }

    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export function setAuthPersistence(rememberMe: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    AUTH_PERSISTENCE_KEY,
    rememberMe ? "local" : "session"
  );
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: authStorage,
    },
  }
);
