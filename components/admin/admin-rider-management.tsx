"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  createManagedRider,
  listAdminRiders,
  updateManagedRider,
} from "../../lib/admin/api-client.ts";
import { handleAppError } from "../../lib/errors/ui-error.ts";
import type {
  AdminRider,
  CreateAdminRiderRequest,
  RiderVerificationStatus,
  RiderVisibilityStatus,
  UpdateAdminRiderRequest,
} from "../../types/index.ts";
import { AdminIcon } from "./admin-icons.tsx";
import { useAdminSession } from "./admin-session-provider.tsx";

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
  weekday_available_from: string;
  weekday_available_until: string;
  weekend_available_from: string;
  weekend_available_until: string;
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
const riderBoundaryMessage =
  "Riders are independent. Making a rider visible only allows them to appear in future rider suggestion flows. It does not assign deliveries or create employment.";

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

function formatTimeForInput(value: string | null): string {
  return value?.slice(0, 5) ?? "";
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
    weekday_available_from: formatTimeForInput(rider.weekday_available_from),
    weekday_available_until: formatTimeForInput(rider.weekday_available_until),
    weekend_available_from: formatTimeForInput(rider.weekend_available_from),
    weekend_available_until: formatTimeForInput(rider.weekend_available_until),
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
    weekday_available_from: "",
    weekday_available_until: "",
    weekend_available_from: "",
    weekend_available_until: "",
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

function normalizeOptionalTime(value: string): string | null {
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
    weekday_available_from: normalizeOptionalTime(draft.weekday_available_from),
    weekday_available_until: normalizeOptionalTime(draft.weekday_available_until),
    weekend_available_from: normalizeOptionalTime(draft.weekend_available_from),
    weekend_available_until: normalizeOptionalTime(draft.weekend_available_until),
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
    weekday_available_from: normalizeOptionalTime(draft.weekday_available_from),
    weekday_available_until: normalizeOptionalTime(draft.weekday_available_until),
    weekend_available_from: normalizeOptionalTime(draft.weekend_available_from),
    weekend_available_until: normalizeOptionalTime(draft.weekend_available_until),
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

type PhoneFieldProps = {
  label: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
};

function PhoneField({ label, value, required, placeholder, onChange }: PhoneFieldProps) {
  return (
    <label className="field admin-rider-phone-field">
      <span>{label}</span>
      <span className="admin-rider-phone-control">
        <span className="admin-rider-phone-prefix" aria-hidden="true">
          <span className="admin-rider-flag"> </span>
          <span>+234</span>
        </span>
        <input
          aria-label={label}
          required={required}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

type RiderStatusBannerProps = {
  feedback: AdminFeedback;
  isBusy: boolean;
  canViewDebugInfo: boolean;
  onRefresh: () => void;
};

function RiderStatusBanner({
  feedback,
  isBusy,
  canViewDebugInfo,
  onRefresh,
}: RiderStatusBannerProps) {
  return (
    <section
      className={`admin-panel admin-rider-status admin-status-panel-${feedback.tone}`}
      aria-live="polite"
    >
      <span className="admin-rider-status-icon" aria-hidden="true">
        <AdminIcon name="shield" />
      </span>
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
      <div className="admin-rider-status-actions">
        <button className="button-secondary" type="button" onClick={onRefresh}>
          <AdminIcon name="refresh" />
          Refresh riders
        </button>
        <a className="button-secondary" href="/riders/apply" target="_blank" rel="noreferrer">
          Rider Connect
          <AdminIcon name="link" />
        </a>
      </div>
    </section>
  );
}

type RiderCreateFormProps = {
  createDraft: CreateRiderDraft;
  isCreating: boolean;
  onDraftChange: (updater: (current: CreateRiderDraft) => CreateRiderDraft) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function RiderCreateForm({
  createDraft,
  isCreating,
  onDraftChange,
  onReset,
  onSubmit,
}: RiderCreateFormProps) {
  return (
    <section className="admin-panel admin-rider-create-card" aria-labelledby="rider-create">
      <div className="admin-rider-card-heading">
        <p className="eyebrow">Manual intake</p>
        <h2 id="rider-create">Create rider</h2>
        <p>
          Riders are independent. Creating a rider profile does not make them a
          Localman employee and does not assign deliveries.
        </p>
        <p className="sr-only">{riderBoundaryMessage}</p>
      </div>

      <form className="admin-rider-form" onSubmit={onSubmit}>
        <div className="admin-rider-form-grid">
          <label className="field">
            <span>Initial verification status</span>
            <select
              value={createDraft.verification_status}
              onChange={(event) => {
                const verificationStatus = event.target.value as RiderVerificationStatus;
                onDraftChange((current) => ({
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
                onDraftChange((current) => ({
                  ...current,
                  visibility_status: event.target.value as RiderVisibilityStatus,
                }))
              }
            >
              <option value="hidden">Hidden</option>
              <option value="visible" disabled={createDraft.verification_status !== "verified"}>
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
              placeholder="e.g. Musa Ahmed"
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, display_name: event.target.value }))
              }
            />
          </label>

          <label className="field">
            <span>Full legal name</span>
            <input
              value={createDraft.full_name}
              placeholder="e.g. Musa Ahmed Bello"
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, full_name: event.target.value }))
              }
            />
          </label>

          <PhoneField
            label="Phone"
            required
            value={createDraft.phone}
            placeholder="801 234 5678"
            onChange={(value) => onDraftChange((current) => ({ ...current, phone: value }))}
          />

          <PhoneField
            label="WhatsApp"
            required
            value={createDraft.whatsapp_phone}
            placeholder="801 234 5678"
            onChange={(value) =>
              onDraftChange((current) => ({ ...current, whatsapp_phone: value }))
            }
          />

          <label className="field">
            <span>Vehicle type</span>
            <input
              value={createDraft.vehicle_type}
              placeholder="Select vehicle type"
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, vehicle_type: event.target.value }))
              }
            />
          </label>

          <label className="field">
            <span>Plate number</span>
            <input
              value={createDraft.plate_number}
              placeholder="e.g. ABC 123 XY"
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, plate_number: event.target.value }))
              }
            />
          </label>

          <label className="field field-wide">
            <span>Operating areas</span>
            <input
              required
              value={createDraft.operating_areas}
              placeholder="e.g. Wuse, Garki, Maitama (comma separated)"
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, operating_areas: event.target.value }))
              }
            />
            <span className="field-hint">Areas where the rider operates.</span>
          </label>

          <label className="field field-wide">
            <span>Usual available hours</span>
            <input
              value={createDraft.usual_available_hours}
              placeholder="e.g. Weekdays 9am-6pm"
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  usual_available_hours: event.target.value,
                }))
              }
            />
            <span className="field-hint">
              Display text only. Structured times below control rider suggestions.
            </span>
          </label>

          <label className="field admin-rider-time-field">
            <span>Weekday start time</span>
            <input
              type="time"
              value={createDraft.weekday_available_from}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  weekday_available_from: event.target.value,
                }))
              }
            />
          </label>

          <label className="field admin-rider-time-field">
            <span>Weekday end time</span>
            <input
              type="time"
              value={createDraft.weekday_available_until}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  weekday_available_until: event.target.value,
                }))
              }
            />
          </label>

          <label className="field admin-rider-time-field">
            <span>Weekend start time</span>
            <input
              type="time"
              value={createDraft.weekend_available_from}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  weekend_available_from: event.target.value,
                }))
              }
            />
          </label>

          <label className="field admin-rider-time-field">
            <span>Weekend end time</span>
            <input
              type="time"
              value={createDraft.weekend_available_until}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  weekend_available_until: event.target.value,
                }))
              }
            />
          </label>

          <label className="field field-wide">
            <span>Internal notes (optional)</span>
            <textarea
              value={createDraft.notes}
              placeholder="External consent confirmation"
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="admin-rider-form-footer">
          <div className="admin-rider-actions">
            <button className="button-primary" disabled={isCreating} type="submit">
              {isCreating ? "Creating..." : "Create rider"}
            </button>
            <button className="button-secondary" disabled={isCreating} type="button" onClick={onReset}>
              Reset form
            </button>
          </div>
          <label className="admin-rider-consent">
            <input
              checked={createDraft.consent_confirmed}
              type="checkbox"
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  consent_confirmed: event.target.checked,
                }))
              }
            />
            <span>
              I confirm this rider provided consent to be listed/contacted through Localman
              Rider Connect.
            </span>
          </label>
        </div>
      </form>
    </section>
  );
}

type CsvUploadCardProps = {
  onUnavailable: () => void;
};

function CsvUploadCard({ onUnavailable }: CsvUploadCardProps) {
  return (
    <section className="admin-panel admin-rider-side-card" aria-labelledby="rider-csv-upload">
      <div className="admin-rider-card-heading">
        <p className="eyebrow">Bulk upload (future)</p>
        <h2 id="rider-csv-upload">Upload riders (CSV)</h2>
        <p>
          Validate all rows first, then upload only the valid rows. This will be used for
          future rider imports.
        </p>
      </div>
      <button className="button-secondary admin-rider-template-button" type="button" onClick={onUnavailable}>
        <AdminIcon name="file" />
        Download CSV template
      </button>
      <label className="field">
        <span>CSV file</span>
        <input disabled type="file" accept=".csv,text/csv" />
      </label>
      <button className="button-secondary admin-rider-disabled-button" disabled type="button">
        Preview rows
      </button>
      <p className="admin-rider-helper">Upload a CSV file, preview row validity, then upload valid rows.</p>
    </section>
  );
}

function WorkflowCard() {
  const steps = [
    ["Create rider profile", "Add basic rider identity and vehicle information."],
    ["Verification", "Verify rider details and contact information."],
    ["Visibility", "Set visibility to Hidden or Visible after verification."],
    ["Review & connect", "Riders appear in Rider Connect for suggestion flows."],
  ] as const;

  return (
    <section className="admin-panel admin-rider-side-card" aria-labelledby="rider-workflow">
      <div className="admin-rider-card-heading">
        <p className="eyebrow">Workflow</p>
        <h2 id="rider-workflow">Rider onboarding flow</h2>
        <p>Follow these steps to onboard a new rider.</p>
      </div>
      <ol className="admin-rider-workflow-list">
        {steps.map(([title, copy], index) => (
          <li key={title}>
            <span>{index + 1}</span>
            <div>
              <strong>{title}</strong>
              <p>{copy}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

type RiderReviewQueueCardProps = {
  filters: RiderFilters;
  isLoading: boolean;
  riders: AdminRider[];
  selectedRider: AdminRider | null;
  draft: RiderDraft | null;
  isSaving: boolean;
  onFiltersChange: (updater: (current: RiderFilters) => RiderFilters) => void;
  onFilterSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClearFilters: () => void;
  onSelectRider: (rider: AdminRider) => void;
  onDraftChange: (updater: (current: RiderDraft | null) => RiderDraft | null) => void;
  onResetDraft: () => void;
  onSaveRider: (event: FormEvent<HTMLFormElement>) => void;
};

function RiderReviewQueueCard({
  filters,
  isLoading,
  riders,
  selectedRider,
  draft,
  isSaving,
  onFiltersChange,
  onFilterSubmit,
  onClearFilters,
  onSelectRider,
  onDraftChange,
  onResetDraft,
  onSaveRider,
}: RiderReviewQueueCardProps) {
  return (
    <section className="admin-panel admin-rider-side-card admin-rider-review-card" aria-labelledby="rider-filters">
      <div className="admin-rider-queue-heading">
        <div>
          <p className="eyebrow">Review queue</p>
          <h2 id="rider-filters">Riders</h2>
        </div>
        <span>{riders.length} shown</span>
      </div>

      <div className="admin-rider-review-layout">
        <div className="admin-rider-review-controls">
          <form className="admin-rider-filter-form" onSubmit={onFilterSubmit}>
            <label className="field field-wide">
              <span className="admin-rider-hidden-label">Search by name, phone, or area</span>
              <input
                aria-label="Search by name, phone, or area"
                value={filters.search}
                placeholder="Search by name, phone, or area..."
                onChange={(event) =>
                  onFiltersChange((current) => ({ ...current, search: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Verification</span>
              <select
                value={filters.verificationStatus}
                onChange={(event) =>
                  onFiltersChange((current) => ({
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
                  onFiltersChange((current) => ({
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
            <div className="admin-rider-filter-actions">
              <button className="button-primary" disabled={isLoading} type="submit">
                Apply filters
              </button>
              <button className="button-secondary" disabled={isLoading} type="button" onClick={onClearFilters}>
                Clear
              </button>
            </div>
          </form>

          {riders.length === 0 ? null : (
            <ul className="admin-list admin-list-compact admin-rider-queue-list">
              {riders.map((rider) => (
                <li key={rider.id}>
                  <button
                    className={selectedRider?.id === rider.id ? "admin-list-item selected" : "admin-list-item"}
                    type="button"
                    onClick={() => onSelectRider(rider)}
                  >
                    <div className="admin-list-item-copy">
                      <div className="admin-list-item-topline">
                        <strong>{rider.display_name}</strong>
                        <span className="admin-list-item-edit">Review</span>
                      </div>
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
        </div>

        <SelectedRiderPanel
          rider={selectedRider}
          draft={draft}
          isSaving={isSaving}
          onDraftChange={onDraftChange}
          onResetDraft={onResetDraft}
          onSaveRider={onSaveRider}
        />
      </div>
    </section>
  );
}

type SelectedRiderPanelProps = {
  rider: AdminRider | null;
  draft: RiderDraft | null;
  isSaving: boolean;
  onDraftChange: (updater: (current: RiderDraft | null) => RiderDraft | null) => void;
  onResetDraft: () => void;
  onSaveRider: (event: FormEvent<HTMLFormElement>) => void;
};

function SelectedRiderPanel({
  rider,
  draft,
  isSaving,
  onDraftChange,
  onResetDraft,
  onSaveRider,
}: SelectedRiderPanelProps) {
  if (!rider || !draft) {
    return (
      <div className="admin-rider-selected-placeholder">
        <span aria-hidden="true">
          <AdminIcon name="users" />
        </span>
        <div>
          <strong>Select a rider</strong>
          <p>Select a rider application to review profile details.</p>
        </div>
      </div>
    );
  }

  return (
    <form className="admin-rider-selected-editor" onSubmit={onSaveRider}>
      <div>
        <p className="eyebrow">Selected rider</p>
        <h3>{rider.display_name}</h3>
        <p>
          Created {formatDateTime(rider.created_at)} · Updated {formatDateTime(rider.updated_at)}
        </p>
      </div>
      <div className="admin-rider-selected-grid">
        <label className="field">
          <span>Verification status</span>
          <select
            value={draft.verification_status}
            onChange={(event) =>
              onDraftChange((current) => current
                ? { ...current, verification_status: event.target.value as RiderVerificationStatus }
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
              onDraftChange((current) => current
                ? { ...current, visibility_status: event.target.value as RiderVisibilityStatus }
                : current)
            }
          >
            <option value="hidden">Hidden</option>
            <option value="visible">Visible</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
      </div>
      <div className="admin-rider-selected-meta">
        <span>{rider.full_name ?? "No legal name"}</span>
        <span>{rider.phone}</span>
        <span>{rider.operating_areas.join(", ") || "No operating areas"}</span>
        <span>Consent {formatDateTime(rider.consent_accepted_at)}</span>
      </div>
      <div className="admin-rider-actions">
        <button className="button-primary" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save rider"}
        </button>
        <button className="button-secondary" disabled={isSaving} type="button" onClick={onResetDraft}>
          Reset changes
        </button>
      </div>
    </form>
  );
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
  const [createDraft, setCreateDraft] = useState<CreateRiderDraft>(() => createEmptyRiderDraft());
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<AdminFeedback>(
    createAdminFeedback("neutral", "Loading rider applications..."),
  );
  const selectedRiderIdRef = useRef<string | null>(null);

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
      const nextSelectedRider = selectedRiderIdRef.current
        ? result.riders.find((rider) => rider.id === selectedRiderIdRef.current) ?? result.riders[0] ?? null
        : result.riders[0] ?? null;
      selectedRiderIdRef.current = nextSelectedRider?.id ?? null;
      setSelectedRider(nextSelectedRider);
      setDraft(nextSelectedRider ? createDraftFromRider(nextSelectedRider) : null);
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
      setSelectedRider(null);
      selectedRiderIdRef.current = null;
      setDraft(null);
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

  function handleClearFilters() {
    const clearedFilters: RiderFilters = {
      search: "",
      verificationStatus: "",
      visibilityStatus: "",
    };
    setFilters(clearedFilters);
    void loadRiders(clearedFilters);
  }

  function handleSelectRider(rider: AdminRider) {
    selectedRiderIdRef.current = rider.id;
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
    setFeedback(createAdminFeedback("neutral", "Saving rider profile..."));

    try {
      const updatedRider = await updateManagedRider(
        selectedRider.id,
        buildRiderUpdatePayload(draft),
      );
      selectedRiderIdRef.current = updatedRider.id;
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
    setFeedback(createAdminFeedback("neutral", "Creating rider profile..."));

    try {
      const createdRider = await createManagedRider(buildRiderCreatePayload(createDraft));
      setRiders((current) => [createdRider, ...current]);
      selectedRiderIdRef.current = createdRider.id;
      setSelectedRider(createdRider);
      setDraft(createDraftFromRider(createdRider));
      setCreateDraft(createEmptyRiderDraft());
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
    <div className="admin-console admin-console-riders">
      <RiderStatusBanner
        feedback={feedback}
        isBusy={isBusy}
        canViewDebugInfo={canViewDebugInfo}
        onRefresh={() => void loadRiders(filters)}
      />

      <div className="admin-rider-workspace-layout">
        <RiderCreateForm
          createDraft={createDraft}
          isCreating={isCreating}
          onDraftChange={setCreateDraft}
          onReset={() => setCreateDraft(createEmptyRiderDraft())}
          onSubmit={handleCreateRider}
        />

        <aside className="admin-rider-side-rail" aria-label="Rider operations">
          <CsvUploadCard
            onUnavailable={() =>
              setFeedback(createAdminFeedback(
                "neutral",
                "Rider CSV imports are reserved for the future import workflow.",
              ))
            }
          />
          <WorkflowCard />
          <RiderReviewQueueCard
            filters={filters}
            isLoading={isLoading}
            riders={riders}
            selectedRider={selectedRider}
            draft={draft}
            isSaving={isSaving}
            onFiltersChange={setFilters}
            onFilterSubmit={handleFilterSubmit}
            onClearFilters={handleClearFilters}
            onSelectRider={handleSelectRider}
            onDraftChange={setDraft}
            onResetDraft={() => {
              if (selectedRider) {
                setDraft(createDraftFromRider(selectedRider));
              }
            }}
            onSaveRider={handleSaveRider}
          />
        </aside>
      </div>
    </div>
  );
}
