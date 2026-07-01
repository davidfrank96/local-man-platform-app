import { apiSuccess } from "../../../../lib/api/responses.ts";
import { getAdminAuthConfig } from "../../../../lib/admin/auth.ts";
import { revokeAdminSession } from "../../../../lib/admin/session-governance.ts";
import {
  appendClearedAdminSessionCookies,
  readAdminSessionCookies,
} from "../../../../lib/admin/session-cookies.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../lib/observability.ts";

export async function POST(request: Request) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/admin/logout",
    area: "auth",
  });
  const config = getAdminAuthConfig();
  const { accessToken, adminSessionId } = readAdminSessionCookies(request);

  if (config && adminSessionId) {
    await revokeAdminSession(config, adminSessionId, "manual_logout").catch((error) => {
      logRouteEvent("warn", routeLog, {
        event: "ADMIN_LOGOUT_SESSION_REVOKE_FAILED",
        status: 500,
        message: "Admin logout continued after governed session revoke failed.",
        error,
      });
    });
  }

  if (config && accessToken) {
    const upstreamResponse = await fetch(new URL("/auth/v1/logout", config.supabaseUrl), {
      method: "POST",
      headers: {
        apikey: config.supabaseAnonKey,
        authorization: `Bearer ${accessToken}`,
      },
    }).catch(() => undefined);

    if (upstreamResponse && !upstreamResponse.ok) {
      logRouteEvent("warn", routeLog, {
        event: "ADMIN_LOGOUT_UPSTREAM_FAILED",
        status: upstreamResponse.status,
        message: "Admin logout cleared local cookies after an upstream auth logout failure.",
      });
    }
  }

  const response = apiSuccess({ ok: true });
  appendClearedAdminSessionCookies(response.headers);
  logRouteEvent("info", routeLog, {
    event: "ADMIN_LOGOUT_COMPLETED",
    status: 200,
    message: "Admin logout completed.",
    metadata: {
      hadCookieSession: Boolean(accessToken),
      hadAuthConfig: Boolean(config),
    },
  });
  return attachRequestIdHeader(response, routeLog.requestId);
}
