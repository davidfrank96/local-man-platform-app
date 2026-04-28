"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  fetchPublicCategories,
  type PublicCategory,
} from "../../lib/vendors/public-api-client.ts";
import {
  submitAdminVendorIntake,
  type VendorIntakeIssue,
  type VendorIntakePreviewResult,
  type VendorIntakePreviewRow,
  type VendorIntakeRowInput,
} from "../../lib/admin/api-client.ts";
import { createCsvText, parseCsvText } from "../../lib/csv.ts";
import { handleAppError, showToast } from "../../lib/errors/ui-error.ts";

type CreatedVendorSummary = {
  id: string;
  name: string;
  slug: string;
};

type SharedProps = {
  accessToken: string | null | undefined;
  disabled?: boolean;
  onVendorsUploaded?: (vendors: CreatedVendorSummary[]) => Promise<void> | void;
};

const csvTemplateHeaders = [
  "vendor_name",
  "category",
  "address",
  "latitude",
  "longitude",
  "phone",
  "opening_time",
  "closing_time",
  "description",
];

const csvTemplateRows = [
  [
    "Mama Put Rice",
    "rice",
    "Wuse 2, Abuja",
    "9.0765",
    "7.3986",
    "+2348000000000",
    "9 AM",
    "8 PM",
    "Budget rice and stew spot",
  ],
];

const previewFields = [
  "vendor_name",
  "category",
  "address",
  "latitude",
  "longitude",
  "phone",
  "opening_time",
  "closing_time",
] as const;

function getRowIssue(row: VendorIntakePreviewRow, field: string): VendorIntakeIssue | undefined {
  return row.issues.find((issue) => issue.field === field);
}

function formatCellValue(value: string | number | null): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function createRowInputFromPreview(row: VendorIntakePreviewRow): VendorIntakeRowInput {
  return {
    row_number: row.rowNumber,
    vendor_name: row.vendor_name,
    category: row.category,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    phone: row.phone,
    opening_time: row.opening_time,
    closing_time: row.closing_time,
    description: row.description,
  };
}

function usePublicCategories() {
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    void fetchPublicCategories()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setCategories(result);
        setStatus("ready");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        handleAppError(error, {
          fallbackMessage: "Unable to load vendor categories.",
          role: "agent",
          context: "admin_vendor_categories",
        });
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, status };
}

function focusNextField(
  event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
  nextField: HTMLInputElement | HTMLSelectElement | null,
) {
  if (event.key !== "Enter" || !nextField) {
    return;
  }

  event.preventDefault();
  nextField.focus();
}

async function getCurrentCoordinates(): Promise<{ latitude: number; longitude: number }> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    throw new Error("Location access is required for Quick Add Vendor.");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => reject(new Error("Enable location access to use Quick Add Vendor.")),
      {
        enableHighAccuracy: true,
        timeout: 8_000,
        maximumAge: 60_000,
      },
    );
  });
}

export function AgentQuickAddPanel({
  accessToken,
  disabled = false,
  onVendorsUploaded,
}: SharedProps) {
  const { categories, status: categoriesStatus } = usePublicCategories();
  const [status, setStatus] = useState("Use current location and save the vendor in one pass.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(true);
  const nameRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const openingRef = useRef<HTMLInputElement>(null);
  const closingRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);

  async function submitQuickAdd(form: HTMLFormElement) {
    if (!accessToken) {
      setStatus("Admin session is missing. Sign in again.");
      return;
    }

    const formData = new FormData(form);
    setIsSubmitting(true);
    setStatus("Capturing current location…");

    try {
      const coordinates = await getCurrentCoordinates();
      const result = await submitAdminVendorIntake(
        {
          action: "upload",
          rows: [
            {
              row_number: 1,
              vendor_name: String(formData.get("vendor_name") ?? ""),
              category: String(formData.get("category") ?? ""),
              address: String(formData.get("address") ?? ""),
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              phone: String(formData.get("phone") ?? ""),
              opening_time: String(formData.get("opening_time") ?? ""),
              closing_time: String(formData.get("closing_time") ?? ""),
              description: String(formData.get("description") ?? ""),
            },
          ],
        },
        { accessToken },
      );

      if ("uploadedRows" in result && result.uploadedRows.length > 0) {
        setStatus(`${result.uploadedRows[0]?.vendor.name ?? "Vendor"} saved successfully.`);
        showToast({
          type: "success",
          message: "Vendor saved.",
        });
        await onVendorsUploaded?.(result.uploadedRows.map((row) => row.vendor));

        if (saveAndAddAnother) {
          form.reset();
          nameRef.current?.focus();
        }

        return;
      }

      const failedMessage = "uploadedRows" in result
        ? result.failedRows[0]?.error
        : null;
      const invalidMessage = result.invalidRows[0]?.errors[0]
        ?? failedMessage
        ?? "Vendor upload failed.";
      setStatus(invalidMessage);
      showToast({
        type: "error",
        message: invalidMessage,
      });
    } catch (error) {
      setStatus(
        handleAppError(error, {
          fallbackMessage: "Quick vendor creation failed.",
          role: "agent",
          context: "agent_quick_add",
        }).message,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="admin-panel" aria-labelledby="agent-quick-add">
      <div className="admin-section-header">
        <div>
          <p className="eyebrow">Primary action</p>
          <h2 id="agent-quick-add">Quick Add Vendor</h2>
        </div>
      </div>
      <p className="form-note">
        Current device coordinates are captured on save. Category and location text stay editable.
      </p>
      <form
        className="admin-form agent-quick-add-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submitQuickAdd(event.currentTarget);
        }}
      >
        <label className="field field-wide">
          <span>Vendor name</span>
          <input
            ref={nameRef}
            autoFocus
            name="vendor_name"
            placeholder="Mama Put Rice"
            required
            onKeyDown={(event) => focusNextField(event, categoryRef.current)}
          />
        </label>
        <label className="field">
          <span>Category</span>
          <select
            ref={categoryRef}
            defaultValue=""
            name="category"
            required
            disabled={categoriesStatus !== "ready"}
            onKeyDown={(event) => focusNextField(event, locationRef.current)}
          >
            <option value="" disabled>
              {categoriesStatus === "ready" ? "Select category" : "Loading categories"}
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field field-wide">
          <span>Location</span>
          <input
            ref={locationRef}
            name="address"
            placeholder="Wuse 2, Abuja"
            required
            onKeyDown={(event) => focusNextField(event, phoneRef.current)}
          />
        </label>
        <label className="field">
          <span>Phone</span>
          <input
            ref={phoneRef}
            name="phone"
            placeholder="+2348000000000"
            onKeyDown={(event) => focusNextField(event, openingRef.current)}
          />
        </label>
        <label className="field">
          <span>Opens</span>
          <input
            ref={openingRef}
            name="opening_time"
            placeholder="9 AM"
            onKeyDown={(event) => focusNextField(event, closingRef.current)}
          />
        </label>
        <label className="field">
          <span>Closes</span>
          <input
            ref={closingRef}
            name="closing_time"
            placeholder="8 PM"
            onKeyDown={(event) => focusNextField(event, descriptionRef.current)}
          />
        </label>
        <label className="field field-wide">
          <span>Description</span>
          <input
            ref={descriptionRef}
            name="description"
            placeholder="Short vendor summary"
          />
        </label>
        <label className="checkbox-field">
          <input
            checked={saveAndAddAnother}
            type="checkbox"
            onChange={(event) => setSaveAndAddAnother(event.target.checked)}
          />
          <span>Save and add another</span>
        </label>
        <div className="action-row">
          <button className="button-primary" disabled={disabled || isSubmitting} type="submit">
            {isSubmitting ? "Saving…" : "Save vendor"}
          </button>
        </div>
        <p className="form-note">{status}</p>
      </form>
    </section>
  );
}

export function VendorCsvUploadPanel({
  accessToken,
  disabled = false,
  onVendorsUploaded,
}: SharedProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<VendorIntakeRowInput[]>([]);
  const [preview, setPreview] = useState<VendorIntakePreviewResult | null>(null);
  const [status, setStatus] = useState("Upload a CSV file, preview row validity, then upload valid rows.");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const validPreviewRows = preview?.validRows ?? [];

  const canUpload = useMemo(
    () => validPreviewRows.length > 0 && !isUploading && !disabled,
    [disabled, isUploading, validPreviewRows.length],
  );

  function downloadTemplate() {
    const csv = createCsvText(csvTemplateHeaders, csvTemplateRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "local-man-vendor-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function previewUpload() {
    if (!accessToken) {
      setStatus("Admin session is missing. Sign in again.");
      return;
    }

    if (rows.length === 0) {
      setStatus("Select a non-empty CSV file first.");
      return;
    }

    setIsPreviewing(true);
    setStatus("Validating CSV rows…");

    try {
      const result = await submitAdminVendorIntake(
        {
          action: "preview",
          rows,
        },
        { accessToken },
      );

      setPreview(result as VendorIntakePreviewResult);
      setStatus(
        `Preview ready. ${result.validRows.length} valid, ${result.invalidRows.length} invalid.`,
      );
    } catch (error) {
      setStatus(
        handleAppError(error, {
          fallbackMessage: "Unable to preview vendor upload.",
          role: "agent",
          context: "vendor_csv_preview",
        }).message,
      );
    } finally {
      setIsPreviewing(false);
    }
  }

  async function uploadValidRows() {
    if (!accessToken || validPreviewRows.length === 0) {
      return;
    }

    setIsUploading(true);
    const uploadedVendors: CreatedVendorSummary[] = [];
    const failedRows: Array<{ rowNumber: number; error: string }> = [];
    const chunkSize = 10;

    try {
      for (let offset = 0; offset < validPreviewRows.length; offset += chunkSize) {
        const chunk = validPreviewRows.slice(offset, offset + chunkSize).map(createRowInputFromPreview);
        setStatus(
          `Uploading ${Math.min(offset + chunk.length, validPreviewRows.length)} / ${validPreviewRows.length} vendors…`,
        );
        const result = await submitAdminVendorIntake(
          {
            action: "upload",
            rows: chunk,
          },
          { accessToken },
        );

        if (!("uploadedRows" in result)) {
          continue;
        }

        uploadedVendors.push(...result.uploadedRows.map((row) => row.vendor));
        failedRows.push(
          ...result.failedRows.map((row) => ({
            rowNumber: row.rowNumber,
            error: row.error,
          })),
        );
      }

      await onVendorsUploaded?.(uploadedVendors);
      setStatus(
        failedRows.length > 0
          ? `${uploadedVendors.length} vendors uploaded. ${failedRows.length} rows failed.`
          : `${uploadedVendors.length} vendors uploaded successfully.`,
      );
      showToast({
        type: failedRows.length > 0 ? "info" : "success",
        message:
          failedRows.length > 0
            ? `${failedRows.length} rows need attention after upload.`
            : "Vendor upload complete.",
      });
    } catch (error) {
      setStatus(
        handleAppError(error, {
          fallbackMessage: "Vendor CSV upload failed.",
          role: "agent",
          context: "vendor_csv_upload",
        }).message,
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="admin-panel" aria-labelledby="vendor-csv-upload">
      <div className="admin-section-header">
        <div>
          <p className="eyebrow">Bulk upload</p>
          <h2 id="vendor-csv-upload">Upload Vendors (CSV)</h2>
        </div>
      </div>
      <p className="form-note">
        Validate all rows first, then upload only the valid rows. Required columns: vendor_name, category, address, latitude, longitude. Phone, hours, and description are optional.
      </p>
      <div className="action-row">
        <button className="button-secondary" type="button" onClick={downloadTemplate}>
          Download CSV template
        </button>
      </div>
      <label className="field field-wide">
        <span>CSV file</span>
        <input
          accept=".csv,text/csv"
          type="file"
          onChange={async (event) => {
            const file = event.currentTarget.files?.[0] ?? null;

            setPreview(null);
            setRows([]);

            if (!file) {
              setFileName(null);
              return;
            }

            try {
              const parsedCsvRows = parseCsvText(await file.text());

              if (parsedCsvRows.length === 0) {
                throw new Error("CSV has no vendor rows.");
              }

              const parsedRows = parsedCsvRows.map((row, index) => ({
                row_number: index + 2,
                vendor_name: row.vendor_name,
                category: row.category,
                address: row.address,
                latitude: row.latitude,
                longitude: row.longitude,
                phone: row.phone,
                opening_time: row.opening_time,
                closing_time: row.closing_time,
                description: row.description,
              }));

              setFileName(file.name);
              setRows(parsedRows);
              setStatus(`${parsedRows.length} rows loaded from ${file.name}.`);
            } catch (error) {
              setStatus(
                handleAppError(error, {
                  fallbackMessage: "Unable to read the CSV file.",
                  role: "agent",
                  context: "vendor_csv_parse",
                }).message,
              );
            }
          }}
        />
      </label>
      {fileName ? <p className="form-note">Loaded file: {fileName}</p> : null}
      <div className="action-row">
        <button
          className="button-primary"
          disabled={disabled || isPreviewing || rows.length === 0}
          type="button"
          onClick={() => void previewUpload()}
        >
          {isPreviewing ? "Previewing…" : "Preview rows"}
        </button>
        <button
          className="button-secondary"
          disabled={!canUpload}
          type="button"
          onClick={() => void uploadValidRows()}
        >
          {isUploading ? "Uploading…" : "Upload valid rows"}
        </button>
      </div>
      <p className="form-note">{status}</p>

      {preview ? (
        <div className="admin-bulk-preview">
          <div className="admin-inline-stats">
            <span>{preview.totalRows} total rows</span>
            <span>{preview.validRows.length} valid</span>
            <span>{preview.invalidRows.length} invalid</span>
          </div>
          <div className="admin-subsection">
            <div className="admin-section-header">
              <div>
                <p className="eyebrow">Review</p>
                <h3>CSV preview</h3>
              </div>
            </div>
            <div className="admin-table-shell">
              <table className="admin-preview-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Row</th>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th>Address</th>
                    <th>Lat</th>
                    <th>Lng</th>
                    <th>Phone</th>
                    <th>Opens</th>
                    <th>Closes</th>
                    <th>Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr
                      key={`preview-${row.rowNumber}`}
                      className={row.issues.length > 0 ? "preview-row-invalid" : "preview-row-valid"}
                    >
                      <td>
                        <span
                          className={row.issues.length > 0 ? "preview-badge preview-badge-invalid" : "preview-badge preview-badge-valid"}
                        >
                          {row.issues.length > 0 ? "Invalid" : "Valid"}
                        </span>
                      </td>
                      <td>{row.rowNumber}</td>
                      {previewFields.map((field) => {
                        const issue = getRowIssue(row, field);
                        const value = row[field];

                        return (
                          <td
                            key={`${row.rowNumber}-${field}`}
                            className={issue ? "preview-cell-invalid" : undefined}
                          >
                            <span>{formatCellValue(value)}</span>
                            {issue ? <span className="preview-cell-issue">{issue.error}</span> : null}
                          </td>
                        );
                      })}
                      <td>
                        {row.issues.length > 0 ? (
                          <ul className="preview-issue-list">
                            {row.issues.map((issue, index) => (
                              <li key={`${row.rowNumber}-${issue.field}-${issue.code}-${index}`}>
                                Row {issue.row}: {issue.error} ({issue.code})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="preview-ready-copy">Ready to upload</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
