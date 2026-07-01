export type AdminResetLinkState = {
  accessToken: string | null;
  linkError: string | null;
};

export const initialAdminResetLinkState: AdminResetLinkState = {
  accessToken: null,
  linkError: null,
};

export function parseAdminResetLinkHash(hash: string): AdminResetLinkState {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const token = params.get("access_token");
  const errorDescription = params.get("error_description");

  if (errorDescription) {
    return {
      accessToken: null,
      linkError: errorDescription,
    };
  }

  if (!token) {
    return {
      accessToken: null,
      linkError: "This password reset link is invalid or expired.",
    };
  }

  return {
    accessToken: token,
    linkError: null,
  };
}
