import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.3";

const SUPABASE_URL = "https://urkimjcqsfidxwnnrclc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_McCdc2NqCwM512yEUMXIjg_ISHyhzKs";
const PRODUCTION_ORIGIN = "https://neon-nexus-login-lobby.teanamaster.chatgpt.site";
const AUTH_STORAGE_KEY = "ai-district-auth";

// Migrate the existing tab-only session once so this release does not log an
// already signed-in player out. Explicit logout still clears both stores.
const legacySession = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
if (legacySession && !window.localStorage.getItem(AUTH_STORAGE_KEY)) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, legacySession);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: window.localStorage,
    storageKey: AUTH_STORAGE_KEY,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function authRedirectUrl(path) {
  const localHostnames = new Set(["localhost", "127.0.0.1"]);
  const origin = localHostnames.has(window.location.hostname)
    ? PRODUCTION_ORIGIN
    : window.location.origin;
  return new URL(path, `${origin}/`).toString();
}

export async function clearAuthSession() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } finally {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }
}
