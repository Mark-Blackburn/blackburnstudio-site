const rawDomainManagementUrl =
  process.env.NEXT_PUBLIC_DOMAIN_MANAGEMENT_URL?.trim();

function normalizeDomainManagementUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export const domainManagementUrl = normalizeDomainManagementUrl(
  rawDomainManagementUrl,
);
