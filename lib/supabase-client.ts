import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type PublicSupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

let browserSupabaseClient: SupabaseClient | null = null;

function getPublicSupabaseConfig(): PublicSupabaseConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public environment variables are required.");
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}

function getBrowserSupabaseClient(): SupabaseClient {
  if (browserSupabaseClient) {
    return browserSupabaseClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseConfig();
  browserSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return browserSupabaseClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property, receiver) {
    return Reflect.get(getBrowserSupabaseClient(), property, receiver);
  },
});
