import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.3";

const SUPABASE_URL = "https://urkimjcqsfidxwnnrclc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_McCdc2NqCwM512yEUMXIjg_ISHyhzKs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // Keep the auth session only for this browser tab. Closing the tab/browser
    // removes it, so the next visit always starts at the login screen.
    storage: window.sessionStorage,
    storageKey: "ai-district-auth",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function clearAuthSession() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } finally {
    window.sessionStorage.removeItem("ai-district-auth");
  }
}
