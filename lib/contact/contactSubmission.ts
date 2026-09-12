import {
  getSetupState,
  isValidAustralianPhone,
  isValidEmail,
  isValidRequiredDate,
  parseAustralianPhone,
} from "./sharedValidation";

export const CONTACT_MAX_FIELD_LENGTH = 500;
export const CONTACT_MAX_MESSAGE_LENGTH = 5000;
export const CONTACT_MIN_MESSAGE_LENGTH = 20;

export const CONTACT_SERVICES = [
  "new-website",
  "existing-website",
  "hosting",
  "domain-email",
  "microsoft-365",
  "ongoing-support",
  "photography",
  "workflow",
  "other",
] as const;

export const CONTACT_SETUP_OPTIONS = [
  "no-setup",
  "website",
  "hosting",
  "email-m365",
  "workflow-system",
  "multi",
  "not-sure",
] as const;

export const CONTACT_METHODS = ["email", "phone", "either"] as const;

export const CONTACT_TIMINGS = [
  "asap",
  "two-weeks",
  "one-month",
  "one-to-three-months",
  "more-than-three-months",
  "fixed-date",
  "planning",
  "not-sure",
] as const;

const VALID_SERVICES = new Set<string>(CONTACT_SERVICES);
const VALID_SETUP_OPTIONS = new Set<string>(CONTACT_SETUP_OPTIONS);
const VALID_CONTACT_METHODS = new Set<string>(CONTACT_METHODS);
const VALID_TIMINGS = new Set<string>(CONTACT_TIMINGS);
const SINGLE_LINE_CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/;

export interface ContactSubmissionRequest {
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

export interface ContactValidationError {
  field: string;
  message: string;
}

export interface ContactSubmissionResult {
  success: boolean;
  errors?: ContactValidationError[];
  message?: string;
}

export interface PreparedContactSubmission {
  name: string;
  email: string;
  phone: string;
  services: string[];
  setup: string;
  message: string;
  contactMethod: string;
  timing: string;
  requiredDate: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(
  value: Record<string, unknown>,
  key: keyof ContactSubmissionRequest,
): string | null {
  const field = value[key];
  return field === undefined || typeof field === "string" ? field ?? "" : null;
}

function decodeServices(value: unknown): string[] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const services: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index) || typeof value[index] !== "string") {
      return null;
    }

    services.push(value[index]);
  }

  return services;
}

export function decodeContactSubmissionRequest(
  value: unknown,
): ContactSubmissionRequest | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = optionalString(value, "name");
  const email = optionalString(value, "email");
  const phone = optionalString(value, "phone");
  const setup = optionalString(value, "setup");
  const message = optionalString(value, "message");
  const contactMethod = optionalString(value, "contactMethod");
  const timing = optionalString(value, "timing");
  const requiredDate = optionalString(value, "requiredDate");
  const honeypot = optionalString(value, "honeypot");
  const services = decodeServices(value.services);
  const consentValue = value.consent;

  if (
    name === null ||
    email === null ||
    phone === null ||
    setup === null ||
    message === null ||
    contactMethod === null ||
    timing === null ||
    requiredDate === null ||
    honeypot === null ||
    services === null ||
    (consentValue !== undefined && typeof consentValue !== "boolean")
  ) {
    return null;
  }

  return {
    name,
    email,
    phone,
    services,
    setup,
    message,
    contactMethod,
    timing,
    requiredDate,
    consent: consentValue ?? false,
    honeypot,
  };
}

export function sanitizeContactInput(
  input: string,
  maxLength = CONTACT_MAX_FIELD_LENGTH,
): string {
  return input
    .substring(0, maxLength + 1)
    .replace(/<[^>]*>/g, "")
    .trim();
}

export function sanitizeContactServices(services: string[]): string[] {
  const sanitized: string[] = [];
  const seen = new Set<string>();

  for (const service of services) {
    const next = sanitizeContactInput(service);
    if (!next || seen.has(next)) {
      continue;
    }

    seen.add(next);
    sanitized.push(next);
  }

  return sanitized;
}

export function validateContactSubmission(
  data: ContactSubmissionRequest,
): ContactValidationError[] {
  const errors: ContactValidationError[] = [];

  if (
    data.honeypot.length > CONTACT_MAX_FIELD_LENGTH ||
    data.honeypot.trim()
  ) {
    return [{ field: "form", message: "Form submission failed validation" }];
  }

  const nameClean = sanitizeContactInput(data.name);
  if (
    data.name.length > CONTACT_MAX_FIELD_LENGTH ||
    !nameClean ||
    nameClean.length < 2 ||
    SINGLE_LINE_CONTROL_CHARACTERS.test(nameClean)
  ) {
    errors.push({ field: "name", message: "Please enter your name." });
  }

  const emailClean = sanitizeContactInput(data.email);
  if (!emailClean) {
    errors.push({ field: "email", message: "Please enter your email address." });
  } else if (data.email.length > CONTACT_MAX_FIELD_LENGTH) {
    errors.push({ field: "email", message: "Email address is too long." });
  } else if (!isValidEmail(emailClean)) {
    errors.push({ field: "email", message: "Enter a valid email address." });
  }

  const contactMethodClean = sanitizeContactInput(data.contactMethod);
  const phoneClean = sanitizeContactInput(data.phone);
  if (data.phone.length > CONTACT_MAX_FIELD_LENGTH) {
    errors.push({
      field: "phone",
      message: "Phone number is too long.",
    });
  } else if (contactMethodClean === "phone" && !phoneClean) {
    errors.push({
      field: "phone",
      message: "Please provide a phone number if phone is preferred.",
    });
  } else if (phoneClean && !isValidAustralianPhone(phoneClean)) {
    errors.push({
      field: "phone",
      message: "Enter a valid Australian phone number.",
    });
  }

  const servicesClean = sanitizeContactServices(data.services);
  const servicesInvalid =
    data.services.some(
      (service) => service.length > CONTACT_MAX_FIELD_LENGTH,
    ) || !servicesClean.every((service) => VALID_SERVICES.has(service));

  if (servicesClean.length < 1 && !servicesInvalid) {
    errors.push({ field: "services", message: "Select at least one service." });
  }

  if (servicesInvalid) {
    errors.push({
      field: "services",
      message: "One or more services are invalid.",
    });
  }

  const setupState = getSetupState(servicesClean);
  const setupClean = sanitizeContactInput(data.setup);
  if (
    data.setup.length > CONTACT_MAX_FIELD_LENGTH ||
    (setupState.shouldShowSetup && !VALID_SETUP_OPTIONS.has(setupClean))
  ) {
    errors.push({ field: "setup", message: "Select your current setup." });
  }

  const messageClean = sanitizeContactInput(
    data.message,
    CONTACT_MAX_MESSAGE_LENGTH,
  );
  if (data.message.length > CONTACT_MAX_MESSAGE_LENGTH) {
    errors.push({ field: "message", message: "Message is too long." });
  } else if (
    !messageClean ||
    messageClean.length < CONTACT_MIN_MESSAGE_LENGTH
  ) {
    errors.push({
      field: "message",
      message: `Please provide at least ${CONTACT_MIN_MESSAGE_LENGTH} characters.`,
    });
  }

  if (
    data.contactMethod.length > CONTACT_MAX_FIELD_LENGTH ||
    !contactMethodClean ||
    !VALID_CONTACT_METHODS.has(contactMethodClean)
  ) {
    errors.push({
      field: "contactMethod",
      message: "Choose a preferred contact method.",
    });
  }

  const timingClean = sanitizeContactInput(data.timing);
  if (
    data.timing.length > CONTACT_MAX_FIELD_LENGTH ||
    (timingClean && !VALID_TIMINGS.has(timingClean))
  ) {
    errors.push({ field: "timing", message: "Invalid timing selection." });
  }

  const requiredDateClean = sanitizeContactInput(data.requiredDate);
  if (
    data.requiredDate.length > CONTACT_MAX_FIELD_LENGTH ||
    (requiredDateClean && !isValidRequiredDate(requiredDateClean))
  ) {
    errors.push({ field: "requiredDate", message: "Enter a valid date." });
  }

  if (!data.consent) {
    errors.push({ field: "consent", message: "You must consent to proceed." });
  }

  return errors;
}

export function prepareContactSubmission(
  data: ContactSubmissionRequest,
): PreparedContactSubmission {
  const services = sanitizeContactServices(data.services);
  const sanitizedPhone = sanitizeContactInput(data.phone);
  const parsedPhone = parseAustralianPhone(sanitizedPhone);
  const setupState = getSetupState(services);

  return {
    name: sanitizeContactInput(data.name),
    email: sanitizeContactInput(data.email),
    phone: parsedPhone.valid ? parsedPhone.canonical : "",
    services,
    setup: setupState.shouldShowSetup
      ? sanitizeContactInput(data.setup)
      : setupState.derivedSetup,
    message: sanitizeContactInput(
      data.message,
      CONTACT_MAX_MESSAGE_LENGTH,
    ),
    contactMethod: sanitizeContactInput(data.contactMethod),
    timing: sanitizeContactInput(data.timing),
    requiredDate: sanitizeContactInput(data.requiredDate),
  };
}
