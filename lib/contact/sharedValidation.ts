export const DIGITAL_SETUP_SERVICES = new Set([
  "new-website",
  "existing-website",
  "hosting",
  "domain-email",
  "microsoft-365",
  "ongoing-support",
  "workflow",
]);

export function getSetupState(selectedServices: string[]): {
  shouldShowSetup: boolean;
  derivedSetup: string;
} {
  if (selectedServices.length === 0) {
    return { shouldShowSetup: false, derivedSetup: "" };
  }

  const isPhotographyOrOtherOnly = selectedServices.every(
    (service) => service === "photography" || service === "other",
  );
  if (isPhotographyOrOtherOnly) {
    return { shouldShowSetup: false, derivedSetup: "" };
  }

  if (selectedServices.length === 1) {
    const selected = selectedServices[0];
    if (selected === "new-website") {
      return { shouldShowSetup: false, derivedSetup: "no-setup" };
    }
    if (selected === "existing-website") {
      return { shouldShowSetup: false, derivedSetup: "website" };
    }
    if (selected === "ongoing-support") {
      return { shouldShowSetup: false, derivedSetup: "" };
    }
  }

  const newWebsiteContextOnly = selectedServices.includes("new-website")
    && selectedServices.every(
      (service) => service === "new-website" || service === "photography" || service === "other",
    );
  if (newWebsiteContextOnly) {
    return { shouldShowSetup: false, derivedSetup: "no-setup" };
  }

  return {
    shouldShowSetup: selectedServices.some((service) => DIGITAL_SETUP_SERVICES.has(service)),
    derivedSetup: "",
  };
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export type AustralianPhoneType = "mobile" | "landline";

export type ParsedAustralianPhone =
  | {
      valid: true;
      canonical: string;
      display: string;
      type: AustralianPhoneType;
    }
  | {
      valid: false;
    };

function formatMobileDisplay(nationalSignificantNumber: string): string {
  const local = `0${nationalSignificantNumber}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

function formatLandlineDisplay(nationalSignificantNumber: string): string {
  const local = `0${nationalSignificantNumber}`;
  return `${local.slice(0, 2)} ${local.slice(2, 6)} ${local.slice(6)}`;
}

export function parseAustralianPhone(value: string): ParsedAustralianPhone {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false };
  }

  if (/[^\d\s()+-]/.test(trimmed)) {
    return { valid: false };
  }

  const compact = trimmed.replace(/[\s()-]/g, "");
  if (!compact) {
    return { valid: false };
  }

  if (compact.includes("+") && !compact.startsWith("+")) {
    return { valid: false };
  }

  let nationalSignificantNumber = "";

  if (compact.startsWith("+")) {
    const intlDigits = compact.slice(1);
    if (!intlDigits.startsWith("61")) {
      return { valid: false };
    }

    nationalSignificantNumber = intlDigits.slice(2);
    if (nationalSignificantNumber.startsWith("0")) {
      nationalSignificantNumber = nationalSignificantNumber.slice(1);
    }
  } else if (compact.startsWith("61")) {
    nationalSignificantNumber = compact.slice(2);
    if (nationalSignificantNumber.startsWith("0")) {
      nationalSignificantNumber = nationalSignificantNumber.slice(1);
    }
  } else if (compact.startsWith("0")) {
    nationalSignificantNumber = compact.slice(1);
  } else {
    nationalSignificantNumber = compact;
  }

  if (!/^\d{9}$/.test(nationalSignificantNumber)) {
    return { valid: false };
  }

  if (nationalSignificantNumber.startsWith("4")) {
    return {
      valid: true,
      canonical: `+61${nationalSignificantNumber}`,
      display: formatMobileDisplay(nationalSignificantNumber),
      type: "mobile",
    };
  }

  if (/^[2378]/.test(nationalSignificantNumber)) {
    return {
      valid: true,
      canonical: `+61${nationalSignificantNumber}`,
      display: formatLandlineDisplay(nationalSignificantNumber),
      type: "landline",
    };
  }

  return { valid: false };
}

export function isValidAustralianPhone(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  return parseAustralianPhone(value).valid;
}

export function isValidRequiredDate(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return false;
  }

  const parsed = new Date(`${trimmed}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}