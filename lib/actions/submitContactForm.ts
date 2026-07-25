"use server";

import { Resend } from "resend";

import {
  getSetupState,
  isValidAustralianPhone,
  isValidEmail,
  isValidRequiredDate,
} from "@/lib/contact/sharedValidation";

// Validation constants
const MIN_MESSAGE_LENGTH = 20;
const MAX_FIELD_LENGTH = 500;
const MAX_MESSAGE_LENGTH = 5000;

// Best-effort in-memory rate limiting only; not distributed across serverless instances.
const submissionTimestamps: Map<string, number[]> = new Map();
const RATE_LIMIT_WINDOW_MS = 3600000; // 1 hour
const MAX_SUBMISSIONS_PER_HOUR = 5;

const VALID_SERVICES = new Set([
  "new-website",
  "existing-website",
  "hosting",
  "domain-email",
  "microsoft-365",
  "ongoing-support",
  "photography",
  "workflow",
  "other",
]);

const VALID_SETUP_OPTIONS = new Set([
  "no-setup",
  "website",
  "hosting",
  "email-m365",
  "workflow-system",
  "multi",
  "not-sure",
]);

const VALID_CONTACT_METHODS = new Set(["email", "phone", "either"]);

const VALID_TIMINGS = new Set([
  "asap",
  "two-weeks",
  "one-month",
  "one-to-three-months",
  "more-than-three-months",
  "fixed-date",
  "planning",
  "not-sure",
]);

const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  "new-website": "New website",
  "existing-website": "Existing website improvements",
  hosting: "Domain or hosting",
  "domain-email": "Hosted domain email",
  "microsoft-365": "Microsoft 365",
  "ongoing-support": "Ongoing digital support",
  photography: "Photography",
  workflow: "Workflow or business system",
  other: "Something else",
};

const SETUP_DISPLAY_NAMES: Record<string, string> = {
  "no-setup": "No — this is something new",
  website: "Yes — website",
  hosting: "Yes — domain or hosting",
  "email-m365": "Yes — email or Microsoft 365",
  "workflow-system": "Yes — workflow or business system",
  multi: "Yes — more than one of these",
  "not-sure": "Not sure",
};

const TIMING_DISPLAY_NAMES: Record<string, string> = {
  asap: "As soon as possible",
  "two-weeks": "Within the next 2 weeks",
  "one-month": "Within the next month",
  "one-to-three-months": "Within 1–3 months",
  "more-than-three-months": "More than 3 months away",
  "fixed-date": "I have a fixed date",
  planning: "I’m planning ahead",
  "not-sure": "Not sure yet",
};

interface FormData {
  name: string;
  email: string;
  phone: string;
  services: string[];
  setup: string;
  message: string;
  contactMethod: string;
  timing: string;
  requiredDate: string;
  consent: boolean;
  honeypot: string;
}

interface ValidationError {
  field: string;
  message: string;
}

interface SubmissionResult {
  success: boolean;
  errors?: ValidationError[];
  message?: string;
}

function sanitizeInput(input: string, maxLength = MAX_FIELD_LENGTH): string {
  return input
    .replace(/<[^>]*>/g, "")
    .trim()
    .substring(0, maxLength + 1);
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeAustralianPhone(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) {
    return "";
  }

  let normalized = trimmed.replace(/[\s()-]/g, "");
  normalized = normalized.replace(/^\+610/, "+61");

  if (/^04\d{8}$/.test(normalized)) {
    return `+61${normalized.slice(1)}`;
  }

  if (/^0[2378]\d{8}$/.test(normalized)) {
    return `+61${normalized.slice(1)}`;
  }

  return normalized;
}

function sanitizeServices(services: string[]): string[] {
  const sanitized: string[] = [];
  const seen = new Set<string>();

  for (const service of services) {
    const next = sanitizeInput(service);
    if (!next || seen.has(next)) {
      continue;
    }
    seen.add(next);
    sanitized.push(next);
  }

  return sanitized;
}

function getRateLimitKey(email: string): string {
  return email.toLowerCase();
}

function cleanupRateLimit(now: number): void {
  for (const [entryKey, timestamps] of submissionTimestamps.entries()) {
    const recentTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    if (recentTimestamps.length === 0) {
      submissionTimestamps.delete(entryKey);
      continue;
    }

    submissionTimestamps.set(entryKey, recentTimestamps);
  }
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  cleanupRateLimit(now);
  const recentTimestamps = submissionTimestamps.get(key) || [];

  if (recentTimestamps.length >= MAX_SUBMISSIONS_PER_HOUR) {
    return false;
  }

  recentTimestamps.push(now);
  submissionTimestamps.set(key, recentTimestamps);

  return true;
}
function validateForm(data: FormData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (data.honeypot.trim()) {
    console.log("[contact-form] Honeypot triggered");
    return [{ field: "form", message: "Form submission failed validation" }];
  }

  const nameClean = sanitizeInput(data.name, MAX_FIELD_LENGTH);
  if (!nameClean || nameClean.length < 2) {
    errors.push({ field: "name", message: "Please enter your name." });
  }

  const emailClean = sanitizeInput(data.email, MAX_FIELD_LENGTH);
  if (!emailClean) {
    errors.push({ field: "email", message: "Please enter your email address." });
  } else if (!isValidEmail(emailClean)) {
    errors.push({ field: "email", message: "Enter a valid email address." });
  }

  const phoneClean = sanitizeInput(data.phone, MAX_FIELD_LENGTH);
  if (data.contactMethod === "phone" && !phoneClean) {
    errors.push({
      field: "phone",
      message: "Please provide a phone number if phone is preferred.",
    });
  }

  if (phoneClean && !isValidAustralianPhone(phoneClean)) {
    errors.push({
      field: "phone",
      message: "Enter a valid Australian phone number.",
    });
  }

  const servicesClean = sanitizeServices(data.services || []);
  if (servicesClean.length < 1) {
    errors.push({ field: "services", message: "Select at least one service." });
  }

  if (!servicesClean.every((service) => VALID_SERVICES.has(service))) {
    errors.push({ field: "services", message: "One or more services are invalid." });
  }

  const setupState = getSetupState(servicesClean);
  const setupClean = sanitizeInput(data.setup, MAX_FIELD_LENGTH);

  if (setupState.shouldShowSetup && !VALID_SETUP_OPTIONS.has(setupClean)) {
    errors.push({ field: "setup", message: "Select your current setup." });
  }

  const messageClean = sanitizeInput(data.message, MAX_MESSAGE_LENGTH);
  if (!messageClean || messageClean.length < MIN_MESSAGE_LENGTH) {
    errors.push({
      field: "message",
      message: `Please provide at least ${MIN_MESSAGE_LENGTH} characters.`,
    });
  } else if (messageClean.length > MAX_MESSAGE_LENGTH) {
    errors.push({ field: "message", message: "Message is too long." });
  }

  const contactMethodClean = sanitizeInput(data.contactMethod, MAX_FIELD_LENGTH);
  if (!contactMethodClean || !VALID_CONTACT_METHODS.has(contactMethodClean)) {
    errors.push({
      field: "contactMethod",
      message: "Choose a preferred contact method.",
    });
  }

  const timingClean = sanitizeInput(data.timing, MAX_FIELD_LENGTH);
  if (timingClean && !VALID_TIMINGS.has(timingClean)) {
    errors.push({ field: "timing", message: "Invalid timing selection." });
  }

  const requiredDateClean = sanitizeInput(data.requiredDate, MAX_FIELD_LENGTH);
  if (requiredDateClean && !isValidRequiredDate(requiredDateClean)) {
    errors.push({ field: "requiredDate", message: "Enter a valid date." });
  }

  if (!data.consent) {
    errors.push({ field: "consent", message: "You must consent to proceed." });
  }

  return errors;
}

function generateEmailSubject(services: string[], name: string): string {
  const serviceDisplay =
    services.length === 1
      ? SERVICE_DISPLAY_NAMES[services[0]] || services[0]
      : "Mixed services";

  return `New Blackburn Studio enquiry — ${serviceDisplay} — ${name}`;
}

function generatePlainTextEmail(data: {
  name: string;
  email: string;
  phone: string;
  services: string[];
  setup: string;
  message: string;
  contactMethod: string;
  timing: string;
  requiredDate: string;
  submissionTime: string;
}): string {
  const servicesList = data.services
    .map((service) => `- ${SERVICE_DISPLAY_NAMES[service] || service}`)
    .join("\n");

  const setupText = data.setup
    ? SETUP_DISPLAY_NAMES[data.setup] || data.setup
    : "Not applicable";

  const contactMethodDisplay =
    data.contactMethod.charAt(0).toUpperCase() + data.contactMethod.slice(1);

  const timingDisplay = data.timing
    ? TIMING_DISPLAY_NAMES[data.timing] || data.timing
    : "Not specified";

  return `New Blackburn Studio Enquiry

Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone || "Not provided"}

Services requested:
${servicesList}

Existing setup: ${setupText}

Preferred contact method: ${contactMethodDisplay}
Timing: ${timingDisplay}
Required date: ${data.requiredDate || "Not provided"}

Details:
${data.message}

---
Submitted: ${data.submissionTime}
`;
}

function generateHtmlEmail(data: {
  name: string;
  email: string;
  phone: string;
  services: string[];
  setup: string;
  message: string;
  contactMethod: string;
  timing: string;
  requiredDate: string;
  submissionTime: string;
}): string {
  const servicesHtml = data.services
    .map((service) => `<li>${escapeHtml(SERVICE_DISPLAY_NAMES[service] || service)}</li>`)
    .join("");

  const setupText = data.setup
    ? SETUP_DISPLAY_NAMES[data.setup] || data.setup
    : "Not applicable";

  const contactMethodDisplay =
    data.contactMethod.charAt(0).toUpperCase() + data.contactMethod.slice(1);

  const timingDisplay = data.timing
    ? TIMING_DISPLAY_NAMES[data.timing] || data.timing
    : "Not specified";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 24px; margin: 0 0 20px 0; }
    .field { margin-bottom: 16px; }
    .label { font-weight: 600; color: #222; font-size: 14px; }
    .value { color: #555; margin-top: 4px; }
    .message { background: #f9f9f9; padding: 12px; border-left: 3px solid #999; margin-top: 4px; white-space: pre-wrap; }
    .services { margin: 6px 0 0 18px; padding: 0; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <h1>New Blackburn Studio Enquiry</h1>

    <div class="field">
      <div class="label">Name</div>
      <div class="value">${escapeHtml(data.name)}</div>
    </div>

    <div class="field">
      <div class="label">Email</div>
      <div class="value"><a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></div>
    </div>

    <div class="field">
      <div class="label">Phone</div>
      <div class="value">${escapeHtml(data.phone || "Not provided")}</div>
    </div>

    <div class="field">
      <div class="label">Services requested</div>
      <ul class="services">${servicesHtml}</ul>
    </div>

    <div class="field">
      <div class="label">Existing setup</div>
      <div class="value">${escapeHtml(setupText)}</div>
    </div>

    <div class="field">
      <div class="label">Preferred contact method</div>
      <div class="value">${escapeHtml(contactMethodDisplay)}</div>
    </div>

    <div class="field">
      <div class="label">Timing</div>
      <div class="value">${escapeHtml(timingDisplay)}</div>
    </div>

    <div class="field">
      <div class="label">Required date</div>
      <div class="value">${escapeHtml(data.requiredDate || "Not provided")}</div>
    </div>

    <div class="field">
      <div class="label">Details</div>
      <div class="message">${escapeHtml(data.message)}</div>
    </div>

    <div class="footer">
      <p>Submitted: ${escapeHtml(data.submissionTime)}</p>
    </div>
  </div>
</body>
</html>`;
}

export async function submitContactForm(
  formData: FormData,
): Promise<SubmissionResult> {
  try {
    const validationErrors = validateForm(formData);
    if (validationErrors.length > 0) {
      return {
        success: false,
        errors: validationErrors,
      };
    }

    const email = sanitizeInput(formData.email, MAX_FIELD_LENGTH);
    const rateLimitKey = getRateLimitKey(email);
    if (!checkRateLimit(rateLimitKey)) {
      console.log("[contact-form] Rate limit exceeded for:", rateLimitKey);
      return {
        success: false,
        message:
          "Too many submissions. Please try again later or contact us directly.",
      };
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("[contact-form] RESEND_API_KEY not configured");
      return {
        success: false,
        message: "Email service is not configured",
      };
    }

    const contactFromEmail =
      process.env.CONTACT_FROM_EMAIL?.trim() ||
      "Blackburn Studio Website <noreply@theblackburn.studio>";
    const contactToEmail =
      process.env.CONTACT_TO_EMAIL?.trim() || "hello@theblackburn.studio";

    const resend = new Resend(resendApiKey);

    const now = new Date();
    const submissionTime = now.toLocaleString("en-AU", {
      timeZone: "Australia/Melbourne",
    });

    const sanitizedServices = sanitizeServices(formData.services || []);
    const sanitizedName = sanitizeInput(formData.name, MAX_FIELD_LENGTH);
    const sanitizedMessage = sanitizeInput(formData.message, MAX_MESSAGE_LENGTH);
    const normalizedPhone = normalizeAustralianPhone(
      sanitizeInput(formData.phone, MAX_FIELD_LENGTH),
    );
    const setupState = getSetupState(sanitizedServices);
    const setup = setupState.shouldShowSetup
      ? sanitizeInput(formData.setup, MAX_FIELD_LENGTH)
      : setupState.derivedSetup;
    const timing = sanitizeInput(formData.timing, MAX_FIELD_LENGTH);
    const requiredDate = sanitizeInput(formData.requiredDate, MAX_FIELD_LENGTH);
    const contactMethod = sanitizeInput(formData.contactMethod, MAX_FIELD_LENGTH);

    const subject = generateEmailSubject(sanitizedServices, sanitizedName);
    const textContent = generatePlainTextEmail({
      name: sanitizedName,
      email,
      phone: normalizedPhone,
      services: sanitizedServices,
      setup,
      message: sanitizedMessage,
      contactMethod,
      timing,
      requiredDate,
      submissionTime,
    });

    const htmlContent = generateHtmlEmail({
      name: sanitizedName,
      email,
      phone: normalizedPhone,
      services: sanitizedServices,
      setup,
      message: sanitizedMessage,
      contactMethod,
      timing,
      requiredDate,
      submissionTime,
    });

    const result = await resend.emails.send({
      from: contactFromEmail,
      to: contactToEmail,
      replyTo: email,
      subject,
      text: textContent,
      html: htmlContent,
    });

    if (result.error) {
      console.error("[contact-form] Resend error:", {
        statusCode: result.error.statusCode,
        name: result.error.name,
        message: result.error.message,
      });
      return {
        success: false,
        message: "Failed to send enquiry. Please try again or contact us directly.",
      };
    }

    return {
      success: true,
      message: "Enquiry sent successfully",
    };
  } catch (error) {
    console.error(
      "[contact-form] Unexpected error:",
      error instanceof Error ? error.message : String(error),
    );
    return {
      success: false,
      message: "An unexpected error occurred. Please try again or contact us directly.",
    };
  }
}
