"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";
import type { MouseEvent } from "react";
import {
  submitAdminVendorIntake,
  type VendorIntakePreviewResult,
  type VendorIntakePreviewRow,
  type VendorIntakeRowInput,
} from "../../lib/admin/api-client.ts";
import {
  vendorCsvTemplateHeaders,
  vendorCsvTemplateRows,
} from "../../lib/admin/vendor-intake-contract.ts";
import { createCsvText, parseCsvText } from "../../lib/csv.ts";
import { handleAppError, showToast } from "../../lib/errors/ui-error.ts";
import { useModalFocusTrap } from "../public/use-modal-focus-trap.ts";
import { AdminIcon } from "./admin-icons.tsx";

type CreatedVendorSummary = {
  id: string;
  name: string;
  slug: string;
};

type SharedProps = {
  disabled?: boolean;
  onVendorsUploaded?: (vendors: CreatedVendorSummary[]) => Promise<void> | void;
};

const reviewTabs = [
  "summary",
  "warnings",
  "failures",
  "vendor-preview",
  "import-log",
] as const;

type ReviewTab = (typeof reviewTabs)[number];

const reviewTabLabels: Record<ReviewTab, string> = {
  summary: "Summary",
  warnings: "Warnings",
  failures: "Failures",
  "vendor-preview": "Vendor Preview",
  "import-log": "Import Log",
};

function formatCellValue(value: string | number | null): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function getPreviewRowStatus(row: VendorIntakePreviewRow): "invalid" | "warning" | "valid" {
  if (row.issues.length > 0) {
    return "invalid";
  }

  return row.warnings.length > 0 ? "warning" : "valid";
}

function getReviewCounts(preview: VendorIntakePreviewResult) {
  const warningRows = preview.rows.filter(
    (row) => row.issues.length === 0 && row.warnings.length > 0,
  );
  const passRows = preview.rows.filter(
    (row) => row.issues.length === 0 && row.warnings.length === 0,
  );
  const warningCount = preview.rows.reduce(
    (total, row) => total + row.warnings.length,
    0,
  );
  const failureCount = preview.rows.reduce(
    (total, row) => total + row.issues.length,
    0,
  );

  return {
    passRows: passRows.length,
    warningRows: warningRows.length,
    failRows: preview.invalidRows.length,
    warningCount,
    failureCount,
  };
}

function formatCategoryList(categories: string[]): string {
  return categories.length > 0 ? categories.join(", ") : "—";
}

function CsvReviewModal({
  canImport,
  fileName,
  isUploading,
  onClose,
  onImport,
  preview,
  status,
}: {
  canImport: boolean;
  fileName: string | null;
  isUploading: boolean;
  onClose: () => void;
  onImport: () => void;
  preview: VendorIntakePreviewResult;
  status: string;
}) {
  const [activeTab, setActiveTab] = useState<ReviewTab>("summary");
  const modalRef = useRef<HTMLElement | null>(null);
  const counts = getReviewCounts(preview);
  const readiness =
    preview.invalidRows.length > 0
      ? "Not ready - resolve failed rows before import."
      : preview.rows.length === 0
        ? "Not ready - no vendors found."
        : "Ready for import.";

  useModalFocusTrap({
    active: true,
    containerRef: modalRef,
    onEscape: onClose,
  });

  function handleOverlayMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  const warningRows = preview.rows.filter((row) => row.warnings.length > 0);
  const failureRows = preview.rows.filter((row) => row.issues.length > 0);

  return (
    <div
      className="csv-review-modal-overlay"
      onMouseDown={handleOverlayMouseDown}
    >
      <section
        aria-labelledby="csv-review-modal-title"
        aria-modal="true"
        className="csv-review-modal"
        ref={modalRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="csv-review-modal-header">
          <div>
            <p className="eyebrow">CSV validation</p>
            <h2 id="csv-review-modal-title">Review vendor import</h2>
            <p>{fileName ? `Loaded file: ${fileName}` : "Review parsed vendor rows before import."}</p>
          </div>
          <button
            aria-label="Close CSV review"
            className="csv-review-modal-close"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="csv-review-summary-grid" aria-label="CSV validation summary">
          <div>
            <span>Vendors</span>
            <strong>{preview.totalRows}</strong>
          </div>
          <div>
            <span>PASS</span>
            <strong>{counts.passRows}</strong>
          </div>
          <div>
            <span>WARNING</span>
            <strong>{counts.warningRows}</strong>
          </div>
          <div>
            <span>FAIL</span>
            <strong>{counts.failRows}</strong>
          </div>
          <div className={preview.invalidRows.length > 0 ? "csv-review-readiness-blocked" : "csv-review-readiness-ready"}>
            <span>Import readiness</span>
            <strong>{readiness}</strong>
          </div>
        </div>

        <div className="csv-review-tabs" role="tablist" aria-label="CSV review sections">
          {reviewTabs.map((tab) => (
            <button
              aria-controls={`csv-review-panel-${tab}`}
              aria-selected={activeTab === tab}
              className={activeTab === tab ? "active" : undefined}
              id={`csv-review-tab-${tab}`}
              key={tab}
              role="tab"
              type="button"
              onClick={() => setActiveTab(tab)}
            >
              {reviewTabLabels[tab]}
            </button>
          ))}
        </div>

        <div
          aria-labelledby={`csv-review-tab-${activeTab}`}
          className="csv-review-modal-body"
          id={`csv-review-panel-${activeTab}`}
          role="tabpanel"
        >
          {activeTab === "summary" ? (
            <div className="csv-review-copy-grid">
              <div>
                <h3>Readiness</h3>
                <p>{readiness}</p>
              </div>
              <div>
                <h3>Validation details</h3>
                <p>
                  {counts.warningCount} warning{counts.warningCount === 1 ? "" : "s"} and {counts.failureCount} failure{counts.failureCount === 1 ? "" : "s"} found across {preview.totalRows} vendor row{preview.totalRows === 1 ? "" : "s"}.
                </p>
              </div>
              <div>
                <h3>Import rule</h3>
                <p>
                  Rows with failures must be corrected before import. Warning-only rows remain importable after review.
                </p>
              </div>
            </div>
          ) : null}

          {activeTab === "warnings" ? (
            warningRows.length > 0 ? (
              <div className="csv-review-list">
                {warningRows.map((row) => (
                  <article key={`warnings-${row.rowNumber}`}>
                    <h3>Row {row.rowNumber}: {row.vendor_name ?? "Unnamed vendor"}</h3>
                    <ul className="preview-warning-list">
                      {row.warnings.map((warning, index) => (
                        <li key={`${row.rowNumber}-${warning.field}-${warning.code}-${index}`}>
                          <strong>{warning.field}</strong>: {warning.message} Suggested action: {warning.suggestedAction}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            ) : (
              <p className="form-note">No warnings found.</p>
            )
          ) : null}

          {activeTab === "failures" ? (
            failureRows.length > 0 ? (
              <div className="csv-review-list">
                {failureRows.map((row) => (
                  <article key={`failures-${row.rowNumber}`}>
                    <h3>Row {row.rowNumber}: {row.vendor_name ?? "Unnamed vendor"}</h3>
                    <ul className="preview-issue-list">
                      {row.issues.map((issue, index) => (
                        <li key={`${row.rowNumber}-${issue.field}-${issue.code}-${index}`}>
                          <strong>{issue.field}</strong>: {issue.error} ({issue.code})
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            ) : (
              <p className="form-note">No failures found.</p>
            )
          ) : null}

          {activeTab === "vendor-preview" ? (
            <div className="admin-table-shell">
              <table className="admin-preview-table csv-review-vendor-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Area</th>
                    <th>Categories</th>
                    <th>Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => {
                    const rowStatus = getPreviewRowStatus(row);

                    return (
                      <tr
                        key={`vendor-preview-${row.rowNumber}`}
                        className={`preview-row-${rowStatus}`}
                      >
                        <td>
                          <strong>{row.vendor_name ?? "Unnamed vendor"}</strong>
                          <span className="preview-cell-note">Row {row.rowNumber}</span>
                        </td>
                        <td>
                          {formatCellValue(row.area)}
                          {row.original_area ? (
                            <span className="preview-cell-note">Original: {row.original_area}</span>
                          ) : null}
                        </td>
                        <td>{formatCategoryList(row.categories)}</td>
                        <td>{formatCellValue(row.phone)}</td>
                        <td>
                          <span className={`preview-badge preview-badge-${rowStatus}`}>
                            {rowStatus === "invalid"
                              ? "Fail"
                              : rowStatus === "warning"
                                ? "Warning"
                                : "Pass"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {activeTab === "import-log" ? (
            <div className="csv-review-copy-grid">
              <div>
                <h3>Current status</h3>
                <p>{status}</p>
              </div>
              <div>
                <h3>Import control</h3>
                <p>
                  {canImport
                    ? "Approve Import is enabled because no failed rows were found."
                    : "Approve Import is disabled until failed rows are resolved."}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="csv-review-modal-actions">
          <button
            className="button-secondary"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button-primary"
            disabled={!canImport || isUploading}
            type="button"
            onClick={onImport}
          >
            {isUploading ? "Importing…" : "Approve Import"}
          </button>
        </div>
      </section>
    </div>
  );
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
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [status, setStatus] = useState("Upload a CSV file, preview row validity, then upload valid rows.");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const validPreviewRows = preview?.validRows ?? [];
  const previewWarningCount =
    preview?.rows.reduce((total, row) => total + row.warnings.length, 0) ?? 0;

  const canUpload = useMemo(
    () =>
      Boolean(preview) &&
      validPreviewRows.length > 0 &&
      (preview?.invalidRows.length ?? 0) === 0 &&
      !isUploading &&
      !disabled,
    [disabled, isUploading, preview, validPreviewRows.length],
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
      setIsReviewOpen(true);
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

    if ((preview?.invalidRows.length ?? 0) > 0) {
      setStatus("Resolve failed rows before importing vendors.");
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
        <button className="button-secondary admin-create-template-button" type="button" onClick={downloadTemplate}>
          <AdminIcon name="arrow-right" />
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
            setIsReviewOpen(false);
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
        {preview ? (
          <button
            className="button-secondary"
            type="button"
            onClick={() => setIsReviewOpen(true)}
          >
            Open review
          </button>
        ) : null}
      </div>
      <p className="form-note">{status}</p>

      {preview ? (
        <div className="admin-bulk-preview admin-bulk-preview-compact">
          <div className="admin-inline-stats">
            <span>{preview.totalRows} total rows</span>
            <span>{preview.validRows.length} valid</span>
            <span>{preview.invalidRows.length} invalid</span>
            <span>{previewWarningCount} warning{previewWarningCount === 1 ? "" : "s"}</span>
          </div>
          <button
            className="button-secondary"
            type="button"
            onClick={() => setIsReviewOpen(true)}
          >
            Review validation results
          </button>
        </div>
      ) : null}
      {preview && isReviewOpen ? (
        <CsvReviewModal
          canImport={canUpload}
          fileName={fileName}
          isUploading={isUploading}
          preview={preview}
          status={status}
          onClose={() => setIsReviewOpen(false)}
          onImport={() => void uploadValidRows()}
        />
      ) : null}
    </section>
  );
}
