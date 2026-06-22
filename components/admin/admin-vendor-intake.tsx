"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  submitAdminVendorIntake,
  type VendorIntakeIssue,
  type VendorIntakePreviewResult,
  type VendorIntakePreviewRow,
  type VendorIntakeRowInput,
  type VendorIntakeWarning,
} from "../../lib/admin/api-client.ts";
import {
  vendorCsvTemplateHeaders,
  vendorCsvTemplateRows,
} from "../../lib/admin/vendor-intake-contract.ts";
import { createCsvText, parseCsvText } from "../../lib/csv.ts";
import { handleAppError, showToast } from "../../lib/errors/ui-error.ts";

type CreatedVendorSummary = {
  id: string;
  name: string;
  slug: string;
};

type SharedProps = {
  disabled?: boolean;
  onVendorsUploaded?: (vendors: CreatedVendorSummary[]) => Promise<void> | void;
};

const previewFields = [
  "vendor_name",
  "category",
  "price_band",
  "area",
  "latitude",
  "longitude",
  "open_days",
  "is_active",
] as const;

function getRowIssue(row: VendorIntakePreviewRow, field: string): VendorIntakeIssue | undefined {
  return row.issues.find((issue) => issue.field === field);
}

function getRowWarning(
  row: VendorIntakePreviewRow,
  field: string,
): VendorIntakeWarning | undefined {
  return row.warnings.find((warning) => warning.field === field);
}

function formatCellValue(value: string | number | null): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function formatPreviewFieldValue(
  row: VendorIntakePreviewRow,
  field: (typeof previewFields)[number],
): string | number | null {
  const value = row[field];

  if (field === "open_days") {
    return `${row.open_days} open days`;
  }

  if (field === "is_active") {
    return row.is_active ? "Active" : "Inactive";
  }

  return typeof value === "boolean" ? (value ? "Yes" : "No") : value;
}

function getPreviewRowStatus(row: VendorIntakePreviewRow): "invalid" | "warning" | "valid" {
  if (row.issues.length > 0) {
    return "invalid";
  }

  return row.warnings.length > 0 ? "warning" : "valid";
}

function selectRowsByNumber(
  sourceRows: VendorIntakeRowInput[],
  previewRows: VendorIntakePreviewRow[],
): VendorIntakeRowInput[] {
  const rowsByNumber = new Map(
    sourceRows.map((row, index) => [row.row_number ?? index + 2, row] as const),
  );

  return previewRows
    .map((row) => rowsByNumber.get(row.rowNumber))
    .filter((row): row is VendorIntakeRowInput => row !== undefined);
}

export function VendorCsvUploadPanel({
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
  const previewWarningCount =
    preview?.rows.reduce((total, row) => total + row.warnings.length, 0) ?? 0;

  const canUpload = useMemo(
    () => validPreviewRows.length > 0 && !isUploading && !disabled,
    [disabled, isUploading, validPreviewRows.length],
  );

  function downloadTemplate() {
    const csv = createCsvText([...vendorCsvTemplateHeaders], vendorCsvTemplateRows.map((row) => [...row]));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "local-man-vendor-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function previewUpload() {
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
    if (validPreviewRows.length === 0) {
      return;
    }

    setIsUploading(true);
      const uploadRows = selectRowsByNumber(rows, validPreviewRows);
      const uploadedVendors: CreatedVendorSummary[] = [];
      const failedRows: Array<{ rowNumber: number; error: string }> = [];
      const chunkSize = 10;

    try {
      for (let offset = 0; offset < uploadRows.length; offset += chunkSize) {
        const chunk = uploadRows.slice(offset, offset + chunkSize);
        setStatus(
          `Uploading ${Math.min(offset + chunk.length, uploadRows.length)} / ${uploadRows.length} vendors…`,
        );
        const result = await submitAdminVendorIntake(
          {
            action: "upload",
            rows: chunk,
          },
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
        Validate all rows first, then upload only the valid rows. This template creates full vendor records, including weekly hours, featured dishes, and remote image URLs.
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

              const missingHeaders = vendorCsvTemplateHeaders.filter(
                (header) => !(header in parsedCsvRows[0]) && !/^category_[1-6]$/.test(header),
              );

              if (missingHeaders.length > 0) {
                throw new Error(
                  `CSV is missing required columns: ${missingHeaders.join(", ")}.`,
                );
              }

              const parsedRows = parsedCsvRows.map((row, index) => ({
                row_number: index + 2,
                vendor_name: row.vendor_name,
                slug: row.slug,
                category: row.category,
                category_1: row.category_1,
                category_2: row.category_2,
                category_3: row.category_3,
                category_4: row.category_4,
                category_5: row.category_5,
                category_6: row.category_6,
                price_band: row.price_band,
                is_active: row.is_active,
                area: row.area,
                city: row.city,
                state: row.state,
                country: row.country,
                address: row.address,
                latitude: row.latitude,
                longitude: row.longitude,
                phone: row.phone,
                description: row.description,
                monday_open: row.monday_open,
                monday_close: row.monday_close,
                tuesday_open: row.tuesday_open,
                tuesday_close: row.tuesday_close,
                wednesday_open: row.wednesday_open,
                wednesday_close: row.wednesday_close,
                thursday_open: row.thursday_open,
                thursday_close: row.thursday_close,
                friday_open: row.friday_open,
                friday_close: row.friday_close,
                saturday_open: row.saturday_open,
                saturday_close: row.saturday_close,
                sunday_open: row.sunday_open,
                sunday_close: row.sunday_close,
                dish_1_name: row.dish_1_name,
                dish_1_description: row.dish_1_description,
                dish_1_image_url: row.dish_1_image_url,
                dish_2_name: row.dish_2_name,
                dish_2_description: row.dish_2_description,
                dish_2_image_url: row.dish_2_image_url,
                dish_3_name: row.dish_3_name,
                dish_3_description: row.dish_3_description,
                dish_3_image_url: row.dish_3_image_url,
                image_url_1: row.image_url_1,
                image_sort_order_1: row.image_sort_order_1,
                image_url_2: row.image_url_2,
                image_sort_order_2: row.image_sort_order_2,
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
            <span>{previewWarningCount} warning{previewWarningCount === 1 ? "" : "s"}</span>
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
                    <th>Price band</th>
                    <th>Area</th>
                    <th>Lat</th>
                    <th>Lng</th>
                    <th>Hours</th>
                    <th>Status</th>
                    <th>Dishes</th>
                    <th>Images</th>
                    <th>Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => {
                    const rowStatus = getPreviewRowStatus(row);
                    return (
                      <tr
                        key={`preview-${row.rowNumber}`}
                        className={`preview-row-${rowStatus}`}
                      >
                        <td>
                          <span
                            className={`preview-badge preview-badge-${rowStatus}`}
                          >
                            {rowStatus === "invalid"
                              ? "Invalid"
                              : rowStatus === "warning"
                                ? "Warning"
                                : "Valid"}
                          </span>
                        </td>
                        <td>{row.rowNumber}</td>
                        {previewFields.map((field) => {
                          const issue = getRowIssue(row, field);
                          const warning = getRowWarning(row, field);
                          const value = formatPreviewFieldValue(row, field);

                          return (
                            <td
                              key={`${row.rowNumber}-${field}`}
                              className={
                                issue
                                  ? "preview-cell-invalid"
                                  : warning
                                    ? "preview-cell-warning"
                                    : undefined
                              }
                            >
                              <span>{formatCellValue(value)}</span>
                              {issue ? <span className="preview-cell-issue">{issue.error}</span> : null}
                              {field === "area" && row.original_area ? (
                                <span className="preview-cell-note">
                                  Original area: {row.original_area}
                                </span>
                              ) : null}
                              {field === "area" && row.normalized_area ? (
                                <span className="preview-cell-note">
                                  Normalized area: {row.normalized_area}
                                </span>
                              ) : null}
                              {field === "area" && row.area_status === "unknown" ? (
                                <span className="preview-cell-warning-copy">Status: Unknown Area</span>
                              ) : null}
                              {warning ? (
                                <span className="preview-cell-warning-copy">{warning.message}</span>
                              ) : null}
                            </td>
                          );
                        })}
                        <td>{row.featured_dishes.length > 0 ? row.featured_dishes.join(", ") : "—"}</td>
                        <td>{row.image_urls.length > 0 ? `${row.image_urls.length} image URL(s)` : "—"}</td>
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
                          {row.warnings.length > 0 ? (
                            <ul className="preview-warning-list">
                              {row.warnings.map((warning, index) => (
                                <li key={`${row.rowNumber}-${warning.field}-${warning.code}-${index}`}>
                                  Warning: {warning.message} Suggested action: {warning.suggestedAction}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
