import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const rawSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

const supabaseUrl = rawSupabaseUrl
  .trim()
  .replace(/\/rest\/v1\/?$/i, "")
  .replace(/\/+$/, "");
const supabaseAnonKey = rawSupabaseAnonKey.trim();

console.log("URL string:", JSON.stringify(supabaseUrl));

function getSupabaseConfigError() {
  if (!supabaseUrl || supabaseUrl.startsWith("your-")) {
    return "EXPO_PUBLIC_SUPABASE_URL is missing. Add your Supabase Project URL to mobile/.env.";
  }

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
    return `EXPO_PUBLIC_SUPABASE_URL must be the base project URL, like https://your-project-ref.supabase.co. Current normalized value: ${JSON.stringify(supabaseUrl)}`;
  }

  if (!supabaseAnonKey || supabaseAnonKey.startsWith("your-")) {
    return "EXPO_PUBLIC_SUPABASE_ANON_KEY is missing. Add your Supabase anon/publishable key to mobile/.env.";
  }

  if (supabaseAnonKey.startsWith("sb_secret_")) {
    return "EXPO_PUBLIC_SUPABASE_ANON_KEY contains a secret key. Use the public anon/publishable key in the mobile app.";
  }

  return null;
}

export const supabaseConfigError = getSupabaseConfigError();

export const supabase = supabaseConfigError ? null : createClient(supabaseUrl, supabaseAnonKey);
