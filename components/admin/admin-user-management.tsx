"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createManagedAdminUser,
  deleteManagedAdminUser,
  listAdminUsers,
  updateManagedAdminUserRole,
} from "../../lib/admin/api-client.ts";
import { useAdminSession } from "./admin-session-provider.tsx";
import {
  getAdminRoleLabel,
  type AdminRole,
} from "../../lib/admin/rbac.ts";
import { handleAppError } from "../../lib/errors/ui-error.ts";
import type { AdminUser } from "../../types/index.ts";
import {
  readAdminUsersCache,
  writeAdminUsersCache,
} from "../../lib/admin/workspace-cache.ts";

type AdminFeedback = {
  tone: "neutral" | "success" | "error";
  message: string;
  code?: string | null;
  detail?: string | null;
};

function createAdminFeedback(
  tone: AdminFeedback["tone"],
  message: string,
  code?: string | null,
  detail?: string | null,
): AdminFeedback {
  return { tone, message, code: code ?? null, detail: detail ?? null };
}

function formatAdminErrorStatus(error: unknown, fallbackMessage: string): AdminFeedback {
  const visibleError = handleAppError(error, {
    fallbackMessage,
    role: "admin",
    context: "admin_user_management",
  });
  return createAdminFeedback("error", visibleError.message, visibleError.code, visibleError.detail);
}

export function AdminUserManagement() {
  const { session } = useAdminSession();
  const accessToken = session?.accessToken ?? null;
  const currentAdminUserId = session?.adminUser.id ?? null;
  const canViewDebugInfo = session?.adminUser.role === "admin";
  const cachedAdminUsers = readAdminUsersCache();
  const hasCachedAdminUsers = cachedAdminUsers !== null;
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => cachedAdminUsers ?? []);
  const [feedback, setFeedback] = useState<AdminFeedback>(
    createAdminFeedback(
      cachedAdminUsers && cachedAdminUsers.length > 0 ? "success" : "neutral",
      cachedAdminUsers ? "Team access loaded." : "Loading team access…",
    ),
  );
  const [isLoading, setIsLoading] = useState(!hasCachedAdminUsers);

  const loadAdminUsers = useCallback(async () => {
    if (!accessToken) {
      setFeedback(createAdminFeedback("error", "Admin session is missing. Sign in again."));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const rows = await listAdminUsers({ accessToken });
      setAdminUsers(rows);
      writeAdminUsersCache(rows);
      setFeedback(
        createAdminFeedback(
          rows.length > 0 ? "success" : "neutral",
          rows.length > 0 ? "Team access loaded." : "No admin users found.",
        ),
      );
    } catch (error) {
      setFeedback(formatAdminErrorStatus(error, "Unable to load admin users."));
      setAdminUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (hasCachedAdminUsers) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadAdminUsers();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasCachedAdminUsers, loadAdminUsers]);

  async function handleCreateAdminUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setFeedback(createAdminFeedback("error", "Admin session is missing. Sign in again."));
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();
    const fullName = String(formData.get("full_name") ?? "").trim();
    const role = String(formData.get("role") ?? "agent") as AdminRole;

    setIsLoading(true);

    try {
      const createdUser = await createManagedAdminUser(
        {
          email,
          password,
          full_name: fullName.length > 0 ? fullName : null,
          role,
        },
        { accessToken },
      );
      setAdminUsers((current) => {
        const next = [createdUser, ...current];
        writeAdminUsersCache(next);
        return next;
      });
      setFeedback(
        createAdminFeedback(
          "success",
          `${createdUser.email} created as ${getAdminRoleLabel(createdUser.role)}.`,
        ),
      );
      form.reset();
    } catch (error) {
      setFeedback(formatAdminErrorStatus(error, "Unable to create the admin account."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdminUserUpdate(
    adminUserId: string,
    data: {
      full_name?: string | null;
      role?: AdminRole;
    },
  ) {
    if (!accessToken) {
      setFeedback(createAdminFeedback("error", "Admin session is missing. Sign in again."));
      return;
    }

    setIsLoading(true);

    try {
      const updatedUser = await updateManagedAdminUserRole(adminUserId, data, {
        accessToken,
      });
      setAdminUsers((current) => {
        const next = current.map((user) => (user.id === updatedUser.id ? updatedUser : user));
        writeAdminUsersCache(next);
        return next;
      });
      setFeedback(
        createAdminFeedback(
          "success",
          `${updatedUser.email} is now ${getAdminRoleLabel(updatedUser.role)}.`,
        ),
      );
    } catch (error) {
      setFeedback(formatAdminErrorStatus(error, "Unable to update the admin account."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteAdminUser(adminUserId: string, email: string) {
    if (!accessToken) {
      setFeedback(createAdminFeedback("error", "Admin session is missing. Sign in again."));
      return;
    }

    setIsLoading(true);

    try {
      await deleteManagedAdminUser(adminUserId, { accessToken });
      setAdminUsers((current) => {
        const next = current.filter((user) => user.id !== adminUserId);
        writeAdminUsersCache(next);
        return next;
      });
      setFeedback(createAdminFeedback("success", `${email} removed from team access.`));
    } catch (error) {
      setFeedback(formatAdminErrorStatus(error, "Unable to delete the admin account."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="admin-console">
      <section
        className={`admin-panel admin-status-panel admin-status-panel-${feedback.tone}`}
        aria-live="polite"
      >
        <div className="admin-status-heading">
          <p className="eyebrow">Status</p>
          <h2>{isLoading ? "Working" : "Ready"}</h2>
        </div>
        <div className="admin-status-copy-stack">
          <p className="admin-status-copy">{feedback.message}</p>
          {canViewDebugInfo && feedback.code ? (
            <p className="admin-status-meta">Code: {feedback.code}</p>
          ) : null}
          {canViewDebugInfo && feedback.detail ? (
            <p className="admin-status-detail">{feedback.detail}</p>
          ) : null}
        </div>
      </section>

      <section className="admin-grid admin-grid-dashboard">
        <section className="admin-panel" aria-labelledby="team-access-create">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">Role management</p>
              <h2 id="team-access-create">Create admin or agent</h2>
            </div>
          </div>
          <form className="admin-form" onSubmit={handleCreateAdminUser}>
            <div className="admin-filter-grid">
              <label className="field field-wide">
                <span>Email</span>
                <input name="email" required type="email" placeholder="agent@example.com" />
              </label>
              <label className="field">
                <span>Role</span>
                <select defaultValue="agent" name="role">
                  <option value="admin">Admin</option>
                  <option value="agent">Agent</option>
                </select>
              </label>
              <label className="field field-wide">
                <span>Full name</span>
                <input name="full_name" placeholder="Operations agent" />
              </label>
              <label className="field field-wide">
                <span>Temporary password</span>
                <input name="password" required minLength={8} type="password" placeholder="Minimum 8 characters" />
              </label>
            </div>
            <div className="action-row">
              <button className="button-primary" disabled={isLoading} type="submit">
                Create account
              </button>
            </div>
          </form>
        </section>

        <section className="admin-panel" aria-labelledby="team-access-list">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">Current access</p>
              <h2 id="team-access-list">Admin users</h2>
            </div>
            <span>{adminUsers.length} accounts</span>
          </div>

          {adminUsers.length === 0 ? (
            <p className="empty-state">No admin users are currently listed.</p>
          ) : (
            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((adminUser) => (
                    <tr key={adminUser.id}>
                      <td>
                        <input
                          aria-label={`Name for ${adminUser.email}`}
                          className="admin-user-inline-input"
                          defaultValue={adminUser.full_name ?? ""}
                          disabled={isLoading}
                          placeholder="No name"
                          type="text"
                          onBlur={(event) => {
                            const nextName = event.target.value.trim();

                            if (nextName === (adminUser.full_name ?? "")) {
                              return;
                            }

                            void handleAdminUserUpdate(adminUser.id, {
                              full_name: nextName.length > 0 ? nextName : null,
                            });
                          }}
                        />
                      </td>
                      <td>{adminUser.email}</td>
                      <td>
                        <select
                          aria-label={`Role for ${adminUser.email}`}
                          className="admin-user-inline-input"
                          defaultValue={adminUser.role}
                          disabled={isLoading}
                          onChange={(event) =>
                            void handleAdminUserUpdate(adminUser.id, {
                              role: event.target.value as AdminRole,
                            })
                          }
                        >
                          <option value="admin">Admin</option>
                          <option value="agent">Agent</option>
                        </select>
                      </td>
                      <td>
                        <button
                          className="button-secondary compact-button"
                          disabled={isLoading || currentAdminUserId === adminUser.id}
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove ${adminUser.email} from team access?`)) {
                              void handleDeleteAdminUser(adminUser.id, adminUser.email);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
