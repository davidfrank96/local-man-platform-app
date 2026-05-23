"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type {
  PublicRiderSuggestion,
  RiderContactHandoffRequest,
  RiderContactHandoffResponseData,
  RiderUnavailableReason,
} from "../../types/index.ts";
import { isAllowedPublicImageUrl } from "../../lib/vendors/images.ts";
import {
  createVendorRiderContactHandoff,
  fetchVendorRiderSuggestions,
  reportVendorRiderUnavailable,
} from "../../lib/vendors/public-api-client.ts";

type RiderContactDetails = Omit<RiderContactHandoffRequest, "riderId">;

type RiderConnectModalProps = {
  vendorName: string;
  vendorSlug: string;
};

type RiderConnectStep = "details" | "riders" | "handoff";

type Feedback =
  | {
      type: "idle";
      message: null;
    }
  | {
      type: "loading" | "error" | "success";
      message: string;
    };

function RiderActionIcon() {
  return (
    <svg
      aria-hidden="true"
      className="vendor-action-icon"
      focusable="false"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    >
      <path d="M3.2 9.7h2.2l1.4-3.6h3.4l1.3 3.6h1.3" />
      <path d="M7.1 6.1 8.4 3.4h2" />
      <path d="M5.1 11.4a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0Z" />
      <path d="M13.7 11.4a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0Z" />
    </svg>
  );
}

function getFormText(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

function getOptionalFormText(formData: FormData, name: string): string | undefined {
  const value = getFormText(formData, name);

  return value.length > 0 ? value : undefined;
}

async function readErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.replace(/^[A-Z_]+:\s*/, "");
  }

  return fallback;
}

export function RiderConnectModal({
  vendorName,
  vendorSlug,
}: RiderConnectModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<RiderConnectStep>("details");
  const [feedback, setFeedback] = useState<Feedback>({
    type: "idle",
    message: null,
  });
  const [contactDetails, setContactDetails] = useState<RiderContactDetails | null>(null);
  const [riders, setRiders] = useState<PublicRiderSuggestion[]>([]);
  const [handoff, setHandoff] = useState<RiderContactHandoffResponseData | null>(null);
  const [reportReason, setReportReason] = useState<RiderUnavailableReason>("no_response");
  const [reportFeedback, setReportFeedback] = useState<Feedback>({
    type: "idle",
    message: null,
  });

  function openModal() {
    setIsOpen(true);
    setStep("details");
    setFeedback({ type: "idle", message: null });
    setHandoff(null);
    setReportFeedback({ type: "idle", message: null });
  }

  function closeModal() {
    setIsOpen(false);
    setStep("details");
    setFeedback({ type: "idle", message: null });
    setContactDetails(null);
    setRiders([]);
    setHandoff(null);
    setReportReason("no_response");
    setReportFeedback({ type: "idle", message: null });
  }

  async function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const disclaimerAccepted = formData.get("disclaimerAccepted") === "on";

    if (!disclaimerAccepted) {
      setFeedback({
        type: "error",
        message: "Accept the Rider Connect disclaimer before choosing a rider.",
      });
      return;
    }

    const payload: RiderContactDetails = {
      customerName: getFormText(formData, "customerName"),
      customerPhone: getFormText(formData, "customerPhone"),
      deliveryLocationMode: getFormText(formData, "deliveryLocationMode") === "current_location"
        ? "current_location"
        : "manual_address",
      deliveryAddress: getOptionalFormText(formData, "deliveryAddress"),
      deliveryArea: getOptionalFormText(formData, "deliveryArea"),
      orderNote: getOptionalFormText(formData, "orderNote"),
      paymentNoteType: getFormText(formData, "paymentNoteType") === "already_paid_vendor"
        ? "already_paid_vendor"
        : "coordinate_directly",
      disclaimerAccepted: true,
    };

    setFeedback({
      type: "loading",
      message: "Finding listed independent riders...",
    });

    try {
      const result = await fetchVendorRiderSuggestions(vendorSlug);

      setContactDetails(payload);
      setRiders(result.riders);
      setStep("riders");
      setFeedback({
        type: "success",
        message: result.riders.length > 0
          ? "Choose a rider to generate a WhatsApp handoff link."
          : "No verified riders are visible for this vendor yet.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: await readErrorMessage(error, "Unable to load rider suggestions right now."),
      });
    }
  }

  async function handleRiderSelection(rider: PublicRiderSuggestion) {
    if (!contactDetails) {
      setStep("details");
      return;
    }

    setFeedback({
      type: "loading",
      message: `Preparing WhatsApp handoff for ${rider.display_name}...`,
    });

    try {
      const result = await createVendorRiderContactHandoff(vendorSlug, {
        ...contactDetails,
        riderId: rider.rider_id,
      });

      setHandoff(result);
      setStep("handoff");
      setReportFeedback({ type: "idle", message: null });
      setFeedback({
        type: "success",
        message: "WhatsApp handoff ready. You stay in control of the message.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: await readErrorMessage(error, "Unable to prepare rider handoff right now."),
      });
    }
  }

  async function handleUnavailableReport() {
    if (!handoff) {
      return;
    }

    setReportFeedback({
      type: "loading",
      message: "Sending rider availability report...",
    });

    try {
      const result = await reportVendorRiderUnavailable(vendorSlug, {
        riderId: handoff.rider.rider_id,
        reason: reportReason,
        reporterPhone: contactDetails?.customerPhone,
      });

      setReportFeedback({
        type: "success",
        message: result.message,
      });
    } catch (error) {
      setReportFeedback({
        type: "error",
        message: await readErrorMessage(error, "Unable to report rider availability right now."),
      });
    }
  }

  return (
    <>
      <button
        className="button-secondary compact-button vendor-action-button rider-connect-trigger"
        type="button"
        onClick={openModal}
      >
        <RiderActionIcon />
        Request Rider
      </button>

      {isOpen ? (
        <div className="rider-connect-overlay" role="presentation">
          <section
            aria-labelledby="rider-connect-title"
            aria-modal="true"
            className="rider-connect-modal"
            role="dialog"
          >
            <div className="rider-connect-header">
              <div>
                <p className="eyebrow">Rider Connect</p>
                <h2 id="rider-connect-title">Find a Rider</h2>
              </div>
              <button
                aria-label="Close Request Rider"
                className="button-secondary compact-button"
                type="button"
                onClick={closeModal}
              >
                Close
              </button>
            </div>

            <p className="rider-connect-reminder">
              Please call the vendor first to confirm food availability and price.
            </p>

            {step === "details" ? (
              <form className="rider-connect-form" onSubmit={handleDetailsSubmit}>
                <div className="form-grid">
                  <label className="field">
                    <span>Customer name</span>
                    <input name="customerName" placeholder="Ada" required />
                  </label>
                  <label className="field">
                    <span>Phone / WhatsApp</span>
                    <input
                      autoComplete="tel"
                      inputMode="tel"
                      name="customerPhone"
                      placeholder="+234..."
                      required
                    />
                  </label>
                </div>

                <div className="form-grid">
                  <label className="field">
                    <span>Delivery location mode</span>
                    <select name="deliveryLocationMode" required>
                      <option value="manual_address">Enter address manually</option>
                      <option value="current_location">Use current location</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Payment coordination note</span>
                    <select name="paymentNoteType" required>
                      <option value="already_paid_vendor">I have already paid the vendor</option>
                      <option value="coordinate_directly">
                        I will coordinate payment directly
                      </option>
                    </select>
                  </label>
                </div>

                <label className="field field-wide">
                  <span>Delivery address</span>
                  <textarea
                    name="deliveryAddress"
                    placeholder="Street, estate, landmark, or delivery instructions"
                  />
                </label>

                <label className="field field-wide">
                  <span>Delivery area</span>
                  <input name="deliveryArea" placeholder="Wuse, Garki, Maitama..." />
                </label>

                <label className="field field-wide">
                  <span>Order note</span>
                  <textarea
                    name="orderNote"
                    placeholder="What should the rider ask the vendor to prepare or pick up?"
                  />
                </label>

                <label className="checkbox-field rider-connect-disclaimer">
                  <input name="disclaimerAccepted" required type="checkbox" />
                  <span>
                    Localman only connects users, vendors, and independent riders.
                    Food availability, payment, delivery fee, pickup, and delivery
                    terms are handled directly between the user, vendor, and rider.
                    Localman does not collect payment or guarantee delivery.
                  </span>
                </label>

                {feedback.message ? (
                  <p
                    className={feedback.type === "error" ? "field-error" : "form-note"}
                    role={feedback.type === "error" ? "alert" : "status"}
                  >
                    {feedback.message}
                  </p>
                ) : null}

                <button className="button-primary" disabled={feedback.type === "loading"} type="submit">
                  {feedback.type === "loading" ? "Finding riders..." : "Find a Rider"}
                </button>
              </form>
            ) : null}

            {step === "riders" ? (
              <div className="rider-connect-results" aria-live="polite">
                {feedback.message ? <p className="form-note">{feedback.message}</p> : null}
                {riders.length > 0 ? (
                  <div className="rider-suggestion-grid">
                    {riders.map((rider) => {
                      const riderPhotoUrl = isAllowedPublicImageUrl(rider.photo_url, {
                        allowLocalPaths: false,
                      })
                        ? rider.photo_url
                        : null;

                      return (
                        <article className="rider-suggestion-card" key={rider.rider_id}>
                          {riderPhotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt={`${rider.display_name} profile`} src={riderPhotoUrl} />
                          ) : (
                            <div className="rider-suggestion-avatar" aria-hidden="true">
                              {rider.display_name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h3>{rider.display_name}</h3>
                            <p>{rider.vehicle_type ?? "Independent rider"}</p>
                            <p>
                              {rider.operating_areas.length > 0
                                ? rider.operating_areas.join(", ")
                                : "Operating areas not listed"}
                            </p>
                            <p>{rider.usual_availability_label ?? "Availability varies"}</p>
                          </div>
                          <button
                            className="button-primary compact-button"
                            disabled={feedback.type === "loading"}
                            type="button"
                            onClick={() => void handleRiderSelection(rider)}
                          >
                            Select rider
                          </button>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="discovery-empty-state">
                    <strong>No riders listed yet.</strong>
                    <p>Call {vendorName} directly, or try again later.</p>
                  </div>
                )}
                {feedback.type === "error" ? (
                  <p className="field-error" role="alert">{feedback.message}</p>
                ) : null}
                <button className="button-secondary compact-button" type="button" onClick={() => setStep("details")}>
                  Edit request details
                </button>
              </div>
            ) : null}

            {step === "handoff" && handoff ? (
              <div className="rider-connect-handoff" aria-live="polite">
                <p className="form-note">{feedback.message}</p>
                <h3>{handoff.rider.display_name} is selected.</h3>
                <p>
                  Localman connects you. Food availability, delivery fee, payment,
                  pickup, and delivery terms are coordinated directly.
                </p>
                <div className="rider-connect-handoff-actions">
                  <a
                    className="button-primary compact-button"
                    href={handoff.whatsapp_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Message rider
                  </a>
                  <button
                    className="button-secondary compact-button"
                    type="button"
                    onClick={() => {
                      setReportFeedback({ type: "idle", message: null });
                      setStep("riders");
                    }}
                  >
                    Try another rider
                  </button>
                  <button className="button-secondary compact-button" type="button" onClick={closeModal}>
                    Back to vendor
                  </button>
                </div>
                <div className="rider-connect-report">
                  <label className="field">
                    <span>Rider unavailable?</span>
                    <select
                      value={reportReason}
                      onChange={(event) => setReportReason(
                        event.currentTarget.value as RiderUnavailableReason,
                      )}
                    >
                      <option value="no_response">No response</option>
                      <option value="unavailable">Unavailable</option>
                      <option value="wrong_number">Wrong number</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <button
                    className="button-secondary compact-button"
                    disabled={reportFeedback.type === "loading"}
                    type="button"
                    onClick={() => void handleUnavailableReport()}
                  >
                    {reportFeedback.type === "loading"
                      ? "Reporting..."
                      : "Report rider unavailable"}
                  </button>
                  {reportFeedback.message ? (
                    <p
                      className={reportFeedback.type === "error" ? "field-error" : "form-note"}
                      role={reportFeedback.type === "error" ? "alert" : "status"}
                    >
                      {reportFeedback.message}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
