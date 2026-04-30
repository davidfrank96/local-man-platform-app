import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase-client.ts";

function isMissingRefreshTokenError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }

  return message.toLowerCase().includes("refresh token not found");
}

export async function safeGetSession(): Promise<Session | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.getSession();

    if (isMissingRefreshTokenError(error?.message) || !data?.session) {
      await supabase.auth.signOut().catch(() => undefined);
      return null;
    }

    return data.session;
  } catch {
    await supabase.auth.signOut().catch(() => undefined);
    return null;
  }
}
