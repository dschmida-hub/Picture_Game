import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Gives each browser tab a real, persistent Supabase Auth identity
// (auth.uid()) with no email/password, so RLS policies can check actual
// room membership instead of trusting any caller with the public anon
// key. Safe to call repeatedly - reuses the existing session if one is
// already persisted in localStorage.
export async function ensureAnonymousSession() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) return sessionData.session.access_token;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error("Anonymous sign-in failed:", error);
    return null;
  }

  return data.session?.access_token ?? null;
}