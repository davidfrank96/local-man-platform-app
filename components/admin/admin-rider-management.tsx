"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createManagedRider,
  listAdminRiders,
  updateManagedRider,
} from "../../lib/admin/api-client.ts";
import { useAdminSession } from "./admin-session-provider.tsx";
import { handleAppError } from "../../lib/errors/ui-error.ts";
import type {
  AdminRider,
  CreateAdminRiderRequest,
  RiderVerificationStatus,
  RiderVisibilityStatus,
  UpdateAdminRiderRequest,
} from "../../types/index.ts";

type AdminFeedback = {
  tone: "neutral" | "success" | "error";
  message: string;
  code?: string | null;
  detail?: string | null;
};

type RiderFilters = {
  search: string;
  verificationStatus: "" | RiderVerificationStatus;
  visibilityStatus: "" | RiderVisibilityStatus;
};

type RiderDraft = {
  display_name: string;
  full_name: string;
  phone: string;
  whatsapp_phone: string;
  vehicle_type: string;
  plate_number: string;
  operating_areas: string;
  usual_available_hours: string;
  verification_status: RiderVerificationStatus;
  visibility_status: RiderVisibilityStatus;
  notes: string;
};

type CreateRiderDraft = RiderDraft & {
  consent_confirmed: boolean;
};

const verificationStatusLabels: Record<RiderVerificationStatus, string> = {
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
};

const visibilityStatusLabels: Record<RiderVisibilityStatus, string> = {
  hidden: "Hidden",
  visible: "Visible",
  suspended: "Suspended",
};

const visibleRequiresVerifiedMessage =
  "Set verification status to Verified before making a rider visible.";

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
    context: "admin_rider_management",
  });
  return createAdminFeedback("error", visibleError.message, visibleError.code, visibleError.detail);
}

function formatExpectedAdminErrorStatus(error: unknown, fallbackMessage: string): AdminFeedback {
  const visibleError = handleAppError(error, {
    fallbackMessage,
    role: "admin",
    context: "admin_rider_management",
    log: false,
  });
  return createAdminFeedback("error", visibleError.message, visibleError.code, visibleError.detail);
}

function isExpectedCreateConflict(error: unknown): boolean {
  return !!error &&
    typeof error === "object" &&
    "code" in error &&
    "status" in error &&
    error.code === "CONFLICT" &&
    error.status === 409;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not recorded";
  }

  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatHoursForInput(value: AdminRider["usual_available_hours"]): string {
  if (!value) {
    return "";
  }

  if (typeof value.label === "string") {
    return value.label;
  }

  return JSON.stringify(value, null, 2);
}

function createDraftFromRider(rider: AdminRider): RiderDraft {
  return {
    display_name: rider.display_name,
    full_name: rider.full_name ?? "",
    phone: rider.phone,
    whatsapp_phone: rider.whatsapp_phone,
    vehicle_type: rider.vehicle_type ?? "",
    plate_number: rider.plate_number ?? "",
    operating_areas: rider.operating_areas.join(", "),
    usual_available_hours: formatHoursForInput(rider.usual_available_hours),
    verification_status: rider.verification_status,
    visibility_status: rider.visibility_status,
    notes: rider.notes ?? "",
  };
}

function createEmptyRiderDraft(): CreateRiderDraft {
  return {
    display_name: "",
    full_name: "",
    phone: "",
    whatsapp_phone: "",
    vehicle_type: "",
    plate_number: "",
    operating_areas: "",
    usual_available_hours: "",
    verification_status: "pending",
    visibility_status: "hidden",
    notes: "",
    consent_confirmed: false,
  };
}

function normalizeAreas(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeHours(value: string): UpdateAdminRiderRequest["usual_available_hours"] {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return { label: trimmed };
    }
  }

  return { label: trimmed };
}

function buildRiderUpdatePayload(draft: RiderDraft): UpdateAdminRiderRequest {
  return {
    display_name: draft.display_name.trim(),
    full_name: normalizeOptionalText(draft.full_name),
    phone: draft.phone.trim(),
    whatsapp_phone: draft.whatsapp_phone.trim(),
    vehicle_type: normalizeOptionalText(draft.vehicle_type),
    plate_number: normalizeOptionalText(draft.plate_number),
    operating_areas: normalizeAreas(draft.operating_areas),
    usual_available_hours: normalizeHours(draft.usual_available_hours),
    verification_status: draft.verification_status,
    visibility_status: draft.visibility_status,
    notes: normalizeOptionalText(draft.notes),
  };
}

function buildRiderCreatePayload(draft: CreateRiderDraft): CreateAdminRiderRequest {
  return {
    display_name: draft.display_name.trim(),
    full_name: normalizeOptionalText(draft.full_name),
    phone: draft.phone.trim(),
    whatsapp_phone: draft.whatsapp_phone.trim(),
    vehicle_type: normalizeOptionalText(draft.vehicle_type),
    plate_number: normalizeOptionalText(draft.plate_number),
    operating_areas: normalizeAreas(draft.operating_areas),
    usual_available_hours: normalizeHours(draft.usual_available_hours),
    verification_status: draft.verification_status,
    visibility_status: draft.visibility_status,
    notes: normalizeOptionalText(draft.notes),
    consent_confirmed: true,
  };
}

function normalizeCreateVisibilityForVerification(
  verificationStatus: RiderVerificationStatus,
  visibilityStatus: RiderVisibilityStatus,
): RiderVisibilityStatus {
  return verificationStatus === "verified" || visibilityStatus !== "visible"
    ? visibilityStatus
    : "hidden";
}

export function AdminRiderManagement() {
  const { session } = useAdminSession();
  const [filters, setFilters] = useState<RiderFilters>({
    search: "",
    verificationStatus: "",
    visibilityStatus: "",
  });
  const [riders, setRiders] = useState<AdminRider[]>([]);
  const [selectedRider, setSelectedRider] = useState<AdminRider | null>(null);
  const [draft, setDraft] = useState<RiderDraft | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateRiderDraft>(() => createEmptyRiderDraft());
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<AdminFeedback>(
    createAdminFeedback("neutral", "Loading rider applications…"),
  );

  const loadRiders = useCallback(async (nextFilters: RiderFilters) => {
    if (!session) {
      setFeedback(createAdminFeedback("error", "Admin session is missing. Sign in again."));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const result = await listAdminRiders({
        limit: 100,
        offset: 0,
        search: nextFilters.search.trim() || undefined,
        verification_status: nextFilters.verificationStatus || undefined,
        visibility_status: nextFilters.visibilityStatus || undefined,
      });
      setRiders(result.riders);
      setSelectedRider((current) => {
        if (result.riders.length === 0) {
          return null;
        }

        if (!current) {
          return result.riders[0];
        }

        return result.riders.find((rider) => rider.id === current.id) ?? current;
      });
      setDraft((current) =>
        result.riders.length === 0
          ? null
          : current ?? createDraftFromRider(result.riders[0])
      );
      setFeedback(
        createAdminFeedback(
          result.riders.length > 0 ? "success" : "neutral",
          result.riders.length > 0
            ? `Loaded ${result.riders.length} rider profile${result.riders.length === 1 ? "" : "s"}.`
            : "No riders matched the current filters.",
        ),
      );
    } catch (error) {
      setFeedback(formatAdminErrorStatus(error, "Unable to load riders."));
      setRiders([]);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRiders({
        search: "",
        verificationStatus: "",
        visibilityStatus: "",
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadRiders]);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadRiders(filters);
  }

  function handleSelectRider(rider: AdminRider) {
    setSelectedRider(rider);
    setDraft(createDraftFromRider(rider));
  }

  async function handleSaveRider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRider || !draft) {
      setFeedback(createAdminFeedback("error", "Select a rider before saving changes."));
      return;
    }

    setIsSaving(true);
    setFeedback(createAdminFeedback("neutral", "Saving rider profile…"));

    try {
      const updatedRider = await updateManagedRider(
        selectedRider.id,
        buildRiderUpdatePayload(draft),
      );
      setSelectedRider(updatedRider);
      setDraft(createDraftFromRider(updatedRider));
      setRiders((current) =>
        current.map((rider) => (rider.id === updatedRider.id ? updatedRider : rider))
      );
      setFeedback(createAdminFeedback("success", `${updatedRider.display_name} updated.`));
    } catch (error) {
      setFeedback(formatAdminErrorStatus(error, "Unable to update rider."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateRider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!createDraft.consent_confirmed) {
      setFeedback(createAdminFeedback(
        "error",
        "Confirm the rider provided consent before creating a profile.",
      ));
      return;
    }

    if (
      createDraft.visibility_status === "visible" &&
      createDraft.verification_status !== "verified"
    ) {
      setFeedback(createAdminFeedback(
        "error",
        visibleRequiresVerifiedMessage,
        "VALIDATION_ERROR",
        "Visible riders are public suggestions, so the rider must be verified first.",
      ));
      return;
    }

    setIsCreating(true);
    setFeedback(createAdminFeedback("neutral", "Creating rider profile…"));

    try {
      const createdRider = await createManagedRider(buildRiderCreatePayload(createDraft));
      setRiders((current) => [createdRider, ...current]);
      setSelectedRider(createdRider);
      setDraft(createDraftFromRider(createdRider));
      setCreateDraft(createEmptyRiderDraft());
      setIsCreateOpen(false);
      setFeedback(createAdminFeedback("success", `${createdRider.display_name} created.`));
    } catch (error) {
      setFeedback(
        isExpectedCreateConflict(error)
          ? formatExpectedAdminErrorStatus(error, "Unable to create rider.")
          : formatAdminErrorStatus(error, "Unable to create rider."),
      );
    } finally {
      setIsCreating(false);
    }
  }

  const canViewDebugInfo = session?.adminUser.role === "admin";
  const isBusy = isLoading || isSaving || isCreating;

  return (
    <div className="admin-console">
      <section
        className={`admin-panel admin-status-panel admin-status-panel-${feedback.tone}`}
        aria-live="polite"
      >
        <div className="admin-status-heading">
          <p className="eyebrow">Rider Connect</p>
          <h2>{isBusy ? "Working" : "Ready"}</h2>
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

      <section className="admin-panel" aria-labelledby="rider-management-note">
        <p className="eyebrow">Independent rider profiles</p>
        <p id="rider-management-note">
          Riders are independent. Making a rider visible only allows them to
          appear in future rider suggestion flows. It does not assign deliveries
          or create employment.
        </p>
      </section>

      <section className="admin-panel" aria-labelledby="rider-create">
        <div className="admin-section-header">
          <div>
            <p className="eyebrow">Manual intake</p>
            <h2 id="rider-create">Create rider</h2>
          </div>
          <button
            className="button-secondary"
            type="button"
            onClick={() => setIsCreateOpen((current) => !current)}
          >
            {isCreateOpen ? "Close" : "Add Rider"}
          </button>
        </div>

        {isCreateOpen ? (
          <form className="admin-form" onSubmit={handleCreateRider}>
            <p>
              Riders are independent. Creating a rider profile does not make
              them a Localman employee and does not assign deliveries.
            </p>
            <div className="admin-filter-grid">
              <label className="field">
                <span>Initial verification status</span>
                <select
                  value={createDraft.verification_status}
                  onChange={(event) => {
                    const verificationStatus = event.target.value as RiderVerificationStatus;
                    setCreateDraft((current) => ({
                      ...current,
                      verification_status: verificationStatus,
                      visibility_status: normalizeCreateVisibilityForVerification(
                        verificationStatus,
                        current.visibility_status,
                      ),
                    }));
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <label className="field">
                <span>Initial visibility status</span>
                <select
                  value={createDraft.visibility_status}
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      visibility_status: event.target.value as RiderVisibilityStatus,
                    }))
                  }
                >
                  <option value="hidden">Hidden</option>
                  <option
                    value="visible"
                    disabled={createDraft.verification_status !== "verified"}
                  >
                    Visible
                  </option>
                  <option value="suspended">Suspended</option>
                </select>
                <span className="field-hint">{visibleRequiresVerifiedMessage}</span>
              </label>
              <label className="field">
                <span>Display name</span>
                <input
                  required
                  value={createDraft.display_name}
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      display_name: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Full legal name</span>
                <input
                  value={createDraft.full_name}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, full_name: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  required
                  value={createDraft.phone}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>WhatsApp</span>
                <input
                  required
                  value={createDraft.whatsapp_phone}
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      whatsapp_phone: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Vehicle type</span>
                <input
                  value={createDraft.vehicle_type}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, vehicle_type: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Plate number</span>
                <input
                  value={createDraft.plate_number}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, plate_number: event.target.value }))
                  }
                />
              </label>
              <label className="field field-wide">
                <span>Operating areas</span>
                <textarea
                  required
                  value={createDraft.operating_areas}
                  placeholder="Wuse, Garki, Maitama"
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      operating_areas: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field field-wide">
                <span>Usual available hours</span>
                <textarea
                  value={createDraft.usual_available_hours}
                  placeholder="Weekdays 9am-6pm"
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      usual_available_hours: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field field-wide">
                <span>Internal notes</span>
                <textarea
                  value={createDraft.notes}
                  placeholder="Admin-only review notes"
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, notes: event.target.value }))
                  }
                />
              </label>
              <label className="field field-wide">
                <span>External consent confirmation</span>
                <span className="checkbox-label">
                  <input
                    checked={createDraft.consent_confirmed}
                    type="checkbox"
                    onChange={(event) =>
                      setCreateDraft((current) => ({
                        ...current,
                        consent_confirmed: event.target.checked,
                      }))
                    }
                  />
                  I confirm this rider provided consent to be listed/contacted
                  through Localman Rider Connect.
                </span>
              </label>
            </div>
            <div className="action-row">
              <button className="button-primary" disabled={isCreating} type="submit">
                {isCreating ? "Creating..." : "Create rider"}
              </button>
              <button
                className="button-secondary"
                disabled={isCreating}
                type="button"
                onClick={() => setCreateDraft(createEmptyRiderDraft())}
              >
                Reset form
              </button>
            </div>
          </form>
        ) : (
          <p className="empty-state">
            Use Add Rider for profiles collected through manual intake or an
            external form. New profiles default to Pending and Hidden.
          </p>
        )}
      </section>

      <section className="admin-grid admin-grid-dashboard">
        <section className="admin-panel" aria-labelledby="rider-filters">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">Review queue</p>
              <h2 id="rider-filters">Riders</h2>
            </div>
            <span>{riders.length} shown</span>
          </div>

          <form className="admin-form" onSubmit={handleFilterSubmit}>
            <div className="admin-filter-grid">
              <label className="field field-wide">
                <span>Search by name, phone, or area</span>
                <input
                  value={filters.search}
                  placeholder="Wuse, Musa, +234..."
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, search: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Verification</span>
                <select
                  value={filters.verificationStatus}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      verificationStatus: event.target.value as RiderFilters["verificationStatus"],
                    }))
                  }
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <label className="field">
                <span>Visibility</span>
                <select
                  value={filters.visibilityStatus}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      visibilityStatus: event.target.value as RiderFilters["visibilityStatus"],
                    }))
                  }
                >
                  <option value="">All</option>
                  <option value="hidden">Hidden</option>
                  <option value="visible">Visible</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
            </div>
            <div className="action-row">
              <button className="button-primary" disabled={isLoading} type="submit">
                Apply filters
              </button>
              <button
                className="button-secondary"
                disabled={isLoading}
                type="button"
                onClick={() => {
                  const clearedFilters: RiderFilters = {
                    search: "",
                    verificationStatus: "",
                    visibilityStatus: "",
                  };
                  setFilters(clearedFilters);
                  void loadRiders(clearedFilters);
                }}
              >
                Clear
              </button>
            </div>
          </form>

          {riders.length === 0 ? (
            <p className="empty-state">No rider applications are currently listed.</p>
          ) : (
            <ul className="admin-list">
              {riders.map((rider) => (
                <li key={rider.id}>
                  <button
                    className={selectedRider?.id === rider.id ? "admin-list-item selected" : "admin-list-item"}
                    type="button"
                    onClick={() => handleSelectRider(rider)}
                  >
                    <div className="admin-list-item-copy">
                      <div className="admin-list-item-topline">
                        <strong>{rider.display_name}</strong>
                        <span className="admin-list-item-edit">Edit</span>
                      </div>
                      <span>{rider.full_name ?? "No legal name"} · {rider.phone}</span>
                      <span>{rider.operating_areas.join(", ") || "No operating areas"}</span>
                    </div>
                    <div className="admin-list-badges" aria-label={`${rider.display_name} status`}>
                      <span className="admin-badge">
                        {verificationStatusLabels[rider.verification_status]}
                      </span>
                      <span className="admin-badge">
                        {visibilityStatusLabels[rider.visibility_status]}
                      </span>
                      <span className="admin-badge">{rider.contact_intent_count ?? 0} contacts</span>
                      <span className="admin-badge">{rider.unavailable_report_count ?? 0} reports</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-panel" aria-labelledby="rider-detail">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">Profile details</p>
              <h2 id="rider-detail">{selectedRider ? selectedRider.display_name : "Select a rider"}</h2>
            </div>
          </div>

          {!selectedRider || !draft ? (
            <p className="empty-state">Select a rider application to review profile details.</p>
          ) : (
            <form className="admin-form" onSubmit={handleSaveRider}>
              <div className="admin-filter-grid">
                <label className="field">
                  <span>Verification status</span>
                  <select
                    value={draft.verification_status}
                    onChange={(event) =>
                      setDraft((current) => current
                        ? {
                            ...current,
                            verification_status: event.target.value as RiderVerificationStatus,
                          }
                        : current)
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>
                <label className="field">
                  <span>Visibility status</span>
                  <select
                    value={draft.visibility_status}
                    onChange={(event) =>
                      setDraft((current) => current
                        ? {
                            ...current,
                            visibility_status: event.target.value as RiderVisibilityStatus,
                          }
                        : current)
                    }
                  >
                    <option value="hidden">Hidden</option>
                    <option value="visible">Visible</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </label>
                <label className="field">
                  <span>Display name</span>
                  <input
                    required
                    value={draft.display_name}
                    onChange={(event) =>
                      setDraft((current) => current
                        ? { ...current, display_name: event.target.value }
                        : current)
                    }
                  />
                </label>
                <label className="field">
                  <span>Full legal name</span>
                  <input
                    value={draft.full_name}
                    onChange={(event) =>
                      setDraft((current) => current ? { ...current, full_name: event.target.value } : current)
                    }
                  />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input
                    required
                    value={draft.phone}
                    onChange={(event) =>
                      setDraft((current) => current ? { ...current, phone: event.target.value } : current)
                    }
                  />
                </label>
                <label className="field">
                  <span>WhatsApp</span>
                  <input
                    required
                    value={draft.whatsapp_phone}
                    onChange={(event) =>
                      setDraft((current) => current
                        ? { ...current, whatsapp_phone: event.target.value }
                        : current)
                    }
                  />
                </label>
                <label className="field">
                  <span>Vehicle type</span>
                  <input
                    value={draft.vehicle_type}
                    onChange={(event) =>
                      setDraft((current) => current
                        ? { ...current, vehicle_type: event.target.value }
                        : current)
                    }
                  />
                </label>
                <label className="field">
                  <span>Plate number</span>
                  <input
                    value={draft.plate_number}
                    onChange={(event) =>
                      setDraft((current) => current
                        ? { ...current, plate_number: event.target.value }
                        : current)
                    }
                  />
                </label>
                <label className="field field-wide">
                  <span>Operating areas</span>
                  <textarea
                    value={draft.operating_areas}
                    placeholder="Wuse, Garki, Maitama"
                    onChange={(event) =>
                      setDraft((current) => current
                        ? { ...current, operating_areas: event.target.value }
                        : current)
                    }
                  />
                </label>
                <label className="field field-wide">
                  <span>Usual available hours</span>
                  <textarea
                    value={draft.usual_available_hours}
                    placeholder="Weekdays 9am-6pm"
                    onChange={(event) =>
                      setDraft((current) => current
                        ? { ...current, usual_available_hours: event.target.value }
                        : current)
                    }
                  />
                </label>
                <label className="field field-wide">
                  <span>Internal notes</span>
                  <textarea
                    value={draft.notes}
                    placeholder="Admin-only review notes"
                    onChange={(event) =>
                      setDraft((current) => current ? { ...current, notes: event.target.value } : current)
                    }
                  />
                </label>
              </div>

              <div className="admin-inline-stats">
                <span>Created {formatDateTime(selectedRider.created_at)}</span>
                <span>Updated {formatDateTime(selectedRider.updated_at)}</span>
                <span>Consent {formatDateTime(selectedRider.consent_accepted_at)}</span>
                <span>{selectedRider.contact_intent_count ?? 0} contact intents</span>
                <span>{selectedRider.unavailable_report_count ?? 0} unavailable reports</span>
              </div>

              <div className="action-row">
                <button className="button-primary" disabled={isSaving} type="submit">
                  {isSaving ? "Saving..." : "Save rider"}
                </button>
                <button
                  className="button-secondary"
                  disabled={isSaving}
                  type="button"
                  onClick={() => setDraft(createDraftFromRider(selectedRider))}
                >
                  Reset changes
                </button>
              </div>
            </form>
          )}
        </section>
      </section>
    </div>
  );
}
