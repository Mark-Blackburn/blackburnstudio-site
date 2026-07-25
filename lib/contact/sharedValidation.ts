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

export function isValidAustralianPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  if (/[^\d\s()+-]/.test(trimmed)) {
    return false;
  }

  let normalized = trimmed.replace(/[\s()-]/g, "");
  normalized = normalized.replace(/^\+610/, "+61");

  if (normalized.startsWith("+61")) {
    return /^\+61(4\d{8}|[2378]\d{8})$/.test(normalized);
  }

  if (normalized.startsWith("0")) {
    return /^(04\d{8}|0[2378]\d{8})$/.test(normalized);
  }

  return false;
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