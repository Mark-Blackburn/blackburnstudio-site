import type {
  ContactSubmissionRequest,
  ContactSubmissionResult,
  ContactValidationError,
} from "./contactSubmission";

const FAILURE_MESSAGE =
  "Unable to confirm your enquiry was sent. Please try again or email hello@theblackburn.studio.";
const ERROR_FIELDS = new Set([
  "form",
  "name",
  "email",
  "phone",
  "services",
  "setup",
  "message",
  "contactMethod",
  "timing",
  "requiredDate",
  "consent",
]);

function isValidationError(value: unknown): value is ContactValidationError {
  return (
    typeof value === "object" &&
    value !== null &&
    "field" in value &&
    typeof value.field === "string" &&
    ERROR_FIELDS.has(value.field) &&
    "message" in value &&
    typeof value.message === "string" &&
    value.message.length > 0 &&
    value.message.length <= 500
  );
}

// No retries: a lost response can occur after the provider accepted an email.
export async function submitContactForm(
  submission: ContactSubmissionRequest,
): Promise<ContactSubmissionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (response.status === 429)
      return {
        success: false,
        message:
          "Too many submissions. Please try again later or contact us directly.",
      };
    if (response.status !== 200 && response.status !== 400)
      return { success: false, message: FAILURE_MESSAGE };
    if (
      response.headers
        .get("content-type")
        ?.split(";", 1)[0]
        .trim()
        .toLowerCase() !== "application/json"
    )
      return { success: false, message: FAILURE_MESSAGE };
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || !("success" in body))
      return { success: false, message: FAILURE_MESSAGE };
    if (response.status === 200 && body.success === true)
      return { success: true, message: "Enquiry sent successfully" };
    if (
      response.status === 400 &&
      body.success === false &&
      "errors" in body &&
      Array.isArray(body.errors) &&
      body.errors.length > 0 &&
      body.errors.length <= ERROR_FIELDS.size &&
      body.errors.every(isValidationError)
    )
      return {
        success: false,
        errors: body.errors,
        message: "Please check the highlighted fields.",
      };
    return { success: false, message: FAILURE_MESSAGE };
  } catch {
    return { success: false, message: FAILURE_MESSAGE };
  } finally {
    clearTimeout(timeout);
  }
}
