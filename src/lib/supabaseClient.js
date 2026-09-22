import { createClient } from "@supabase/supabase-js";
import {
  JJ_PEGA_SUPABASE_ANON_KEY,
  JJ_PEGA_SUPABASE_URL,
} from "@/lib/jjPegaRuntime.js";

const supabaseUrl = JJ_PEGA_SUPABASE_URL;
const supabaseAnonKey = JJ_PEGA_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[supabase] VITE_JJ_PEGA_SUPABASE_URL o VITE_JJ_PEGA_SUPABASE_ANON_KEY no están configuradas. " +
    "El portal de cliente no funcionará hasta que se agreguen al .env.local."
  );
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    })
  : null;
