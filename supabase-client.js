import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.3";

const SUPABASE_URL = "https://urkimjcqsfidxwnnrclc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_McCdc2NqCwM512yEUMXIjg_ISHyhzKs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
