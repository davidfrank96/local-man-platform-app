"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type SubmissionStatus =
  | {
      type: "idle";
      message: null;
    }
  | {
      type: "submitting";
      message: string;
    }
  | {
      type: "success";
      message: string;
    }
  | {
      type: "error";
      message: string;
    };

function getFormText(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

function parseOperatingAreas(value: string): string[] {
  return value
    .split(/[,\n;]/)
    .map((area) => area.trim())
    .filter(Boolean);
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    const detail = payload?.error?.detail;
    const message = payload?.error?.message;

    if (typeof detail === "string" && detail.trim().length > 0) {
      return detail;
    }

    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  } catch {
    return "Unable to submit the application right now.";
  }

  return "Unable to submit the application right now.";
}

export function RiderApplicationForm() {
  const [status, setStatus] = useState<SubmissionStatus>({
    type: "idle",
    message: null,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      displayName: getFormText(formData, "displayName"),
      fullName: getFormText(formData, "fullName"),
      phone: getFormText(formData, "phone"),
      whatsappPhone: getFormText(formData, "whatsappPhone"),
      vehicleType: getFormText(formData, "vehicleType"),
      plateNumber: getFormText(formData, "plateNumber"),
      operatingAreas: parseOperatingAreas(getFormText(formData, "operatingAreas")),
      usualAvailableHours: getFormText(formData, "usualAvailableHours"),
      consentAccepted: formData.get("consentAccepted") === "on",
      independentRiderDisclaimerAccepted:
        formData.get("independentRiderDisclaimerAccepted") === "on",
    };

    setStatus({
      type: "submitting",
      message: "Submitting your rider application...",
    });

    try {
      const response = await fetch("/api/riders/apply", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setStatus({
          type: "error",
          message: await readErrorMessage(response),
        });
        return;
      }

      form.reset();
      setStatus({
        type: "success",
        message:
          "Application received. Localman may review your details before any rider profile becomes visible.",
      });
    } catch {
      setStatus({
        type: "error",
        message: "Unable to submit the application right now.",
      });
    }
  }

  if (status.type === "success") {
    return (
      <section className="vendor-detail-section" aria-live="polite">
        <p className="eyebrow">Application received</p>
        <h2>Thanks for applying.</h2>
        <p>
          Localman may review your rider details before making any rider profile visible.
          You are not publicly listed yet.
        </p>
        <p>
          Localman does not guarantee jobs. Localman does not collect or process
          delivery payments. Localman does not guarantee delivery outcomes. Your
          contact information may be used only for rider connection features.
        </p>
      </section>
    );
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span>
            Display name <span className="field-required" aria-hidden="true">*</span>
          </span>
          <input name="displayName" placeholder="Amina Rider" required />
        </label>
        <label className="field">
          <span>
            Full legal name <span className="field-required" aria-hidden="true">*</span>
          </span>
          <input name="fullName" placeholder="Amina Musa" required />
        </label>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>
            Phone number <span className="field-required" aria-hidden="true">*</span>
          </span>
          <input autoComplete="tel" inputMode="tel" name="phone" placeholder="+234..." required />
        </label>
        <label className="field">
          <span>
            WhatsApp number <span className="field-required" aria-hidden="true">*</span>
          </span>
          <input
            autoComplete="tel"
            inputMode="tel"
            name="whatsappPhone"
            placeholder="+234..."
            required
          />
        </label>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>
            Vehicle type <span className="field-required" aria-hidden="true">*</span>
          </span>
          <input name="vehicleType" placeholder="Bike, car, van" required />
        </label>
        <label className="field">
          <span>Plate number, optional</span>
          <input name="plateNumber" placeholder="ABC-123XY" />
        </label>
      </div>

      <label className="field field-wide">
        <span>
          Operating areas <span className="field-required" aria-hidden="true">*</span>
        </span>
        <textarea
          name="operatingAreas"
          placeholder="Wuse, Garki, Maitama"
          required
        />
        <span className="field-hint">Separate areas with commas or new lines.</span>
      </label>

      <label className="field field-wide">
        <span>
          Usual available hours <span className="field-required" aria-hidden="true">*</span>
        </span>
        <textarea
          name="usualAvailableHours"
          placeholder="Weekdays 10 AM - 7 PM, Saturdays by request"
          required
        />
      </label>

      <label className="checkbox-field">
        <input name="consentAccepted" required type="checkbox" />
        <span>
          I agree that Localman may store my rider profile details and use them
          for rider connection features.
        </span>
      </label>

      <label className="checkbox-field">
        <input name="independentRiderDisclaimerAccepted" required type="checkbox" />
        <span>
          I understand that I am applying as an independent rider. Localman does
          not employ me, guarantee jobs, collect or process delivery payments, or
          guarantee delivery outcomes.
        </span>
      </label>

      {status.message ? (
        <p
          className={status.type === "error" ? "field-error" : "form-note"}
          role={status.type === "error" ? "alert" : "status"}
        >
          {status.message}
        </p>
      ) : null}

      <button className="button-primary" disabled={status.type === "submitting"} type="submit">
        {status.type === "submitting" ? "Submitting..." : "Submit rider application"}
      </button>
    </form>
  );
}
