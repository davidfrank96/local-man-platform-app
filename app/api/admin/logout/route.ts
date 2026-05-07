import { apiSuccess } from "../../../../lib/api/responses.ts";
import { getAdminAuthConfig } from "../../../../lib/admin/auth.ts";
import {
  appendClearedAdminSessionCookies,
  readAdminSessionCookies,
} from "../../../../lib/admin/session-cookies.ts";

export async function POST(request: Request) {
  const config = getAdminAuthConfig();
  const { accessToken } = readAdminSessionCookies(request);

  if (config && accessToken) {
    await fetch(new URL("/auth/v1/logout", config.supabaseUrl), {
      method: "POST",
      headers: {
        apikey: config.supabaseAnonKey,
        authorization: `Bearer ${accessToken}`,
      },
    }).catch(() => undefined);
  }

  const response = apiSuccess({ ok: true });
  appendClearedAdminSessionCookies(response.headers);
  return response;
}
