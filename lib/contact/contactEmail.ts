import type { PreparedContactSubmission } from "./contactSubmission";

export interface ContactEmailContent {
  subject: string;
  text: string;
  html: string;
}

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

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function createContactEmailContent(
  data: PreparedContactSubmission,
  submissionTime: string,
): ContactEmailContent {
  const serviceDisplay =
    data.services.length === 1
      ? SERVICE_DISPLAY_NAMES[data.services[0]] || data.services[0]
      : "Mixed services";
  const subject = `New Blackburn Studio enquiry — ${serviceDisplay} — ${data.name}`;
  const servicesList = data.services
    .map((service) => `- ${SERVICE_DISPLAY_NAMES[service] || service}`)
    .join("\n");
  const servicesHtml = data.services
    .map(
      (service) =>
        `<li>${escapeHtml(SERVICE_DISPLAY_NAMES[service] || service)}</li>`,
    )
    .join("");
  const setupText = data.setup
    ? SETUP_DISPLAY_NAMES[data.setup] || data.setup
    : "Not applicable";
  const contactMethodDisplay =
    data.contactMethod.charAt(0).toUpperCase() + data.contactMethod.slice(1);
  const timingDisplay = data.timing
    ? TIMING_DISPLAY_NAMES[data.timing] || data.timing
    : "Not specified";

  const text = `New Blackburn Studio Enquiry

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
Submitted: ${submissionTime}
`;

  const html = `<!DOCTYPE html>
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
      <p>Submitted: ${escapeHtml(submissionTime)}</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}
