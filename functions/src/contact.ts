import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { Resend } from "resend";

import { createContactEmailContent } from "../../lib/contact/contactEmail";
import {
  decodeContactSubmissionRequest,
  prepareContactSubmission,
  type ContactSubmissionResult,
  validateContactSubmission,
} from "../../lib/contact/contactSubmission";

export const CONTACT_REQUEST_MAX_BYTES = 16 * 1024;
export const CONTACT_RATE_LIMIT_MAX_TRACKED_KEYS = 100;

const DEFAULT_FROM_EMAIL =
  "Blackburn Studio Website <noreply@theblackburn.studio>";
const DEFAULT_TO_EMAIL = "hello@theblackburn.studio";
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_SUBMISSIONS_PER_HOUR = 5;

export interface ContactEmailMessage {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
}

export interface ContactEmailTransport {
  send(message: ContactEmailMessage): Promise<{ error: boolean }>;
}

export interface ContactRateLimiter {
  consume(key: string): Promise<boolean> | boolean;
}

export interface InMemoryContactRateLimiter extends ContactRateLimiter {
  readonly trackedKeyCount: number;
}

interface ContactHandlerDependencies {
  createTransport(apiKey: string): ContactEmailTransport;
  environment: {
    RESEND_API_KEY?: string;
    CONTACT_FROM_EMAIL?: string;
    CONTACT_TO_EMAIL?: string;
  };
  now(): Date;
  rateLimiter: ContactRateLimiter;
}

function jsonResponse(
  status: number,
  body: ContactSubmissionResult,
): HttpResponseInit {
  return {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
    jsonBody: body,
  };
}

function contentLengthExceedsLimit(request: HttpRequest): boolean {
  const value = request.headers.get("content-length");
  if (!value) {
    return false;
  }

  const contentLength = Number.parseInt(value, 10);
  return Number.isFinite(contentLength) && contentLength > CONTACT_REQUEST_MAX_BYTES;
}

function isJsonContentType(request: HttpRequest): boolean {
  const value = request.headers.get("content-type");
  return value?.split(";", 1)[0].trim().toLowerCase() === "application/json";
}

export function createInMemoryContactRateLimiter(
  now: () => number = Date.now,
  maxTrackedKeys = CONTACT_RATE_LIMIT_MAX_TRACKED_KEYS,
): InMemoryContactRateLimiter {
  const submissionTimestamps = new Map<string, number[]>();
  const trackedKeyLimit = Math.max(1, Math.floor(maxTrackedKeys));

  return {
    get trackedKeyCount() {
      return submissionTimestamps.size;
    },
    consume(key) {
      const currentTime = now();

      for (const [entryKey, timestamps] of submissionTimestamps.entries()) {
        const recentTimestamps = timestamps.filter(
          (timestamp) => currentTime - timestamp < RATE_LIMIT_WINDOW_MS,
        );

        if (recentTimestamps.length === 0) {
          submissionTimestamps.delete(entryKey);
        } else {
          submissionTimestamps.set(entryKey, recentTimestamps);
        }
      }

      const recentTimestamps = submissionTimestamps.get(key) || [];
      if (recentTimestamps.length >= MAX_SUBMISSIONS_PER_HOUR) {
        return false;
      }

      if (
        !submissionTimestamps.has(key) &&
        submissionTimestamps.size >= trackedKeyLimit
      ) {
        const oldestKey = submissionTimestamps.keys().next().value;
        if (oldestKey !== undefined) {
          submissionTimestamps.delete(oldestKey);
        }
      }

      recentTimestamps.push(currentTime);
      submissionTimestamps.set(key, recentTimestamps);
      return true;
    },
  };
}

function createResendTransport(apiKey: string): ContactEmailTransport {
  const resend = new Resend(apiKey);

  return {
    async send(message) {
      const result = await resend.emails.send(message);
      return { error: Boolean(result.error) };
    },
  };
}

const defaultDependencies: ContactHandlerDependencies = {
  createTransport: createResendTransport,
  environment: process.env,
  now: () => new Date(),
  rateLimiter: createInMemoryContactRateLimiter(),
};

export function createContactHandler(
  overrides: Partial<ContactHandlerDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function contactHandler(
    request: HttpRequest,
    context: InvocationContext,
  ): Promise<HttpResponseInit> {
    if (!isJsonContentType(request)) {
      return jsonResponse(415, {
        success: false,
        message: "Content-Type must be application/json.",
      });
    }

    if (contentLengthExceedsLimit(request)) {
      return jsonResponse(413, {
        success: false,
        message: "Contact submission is too large.",
      });
    }

    let bodyText: string;
    try {
      bodyText = await request.text();
    } catch {
      return jsonResponse(400, {
        success: false,
        message: "Invalid contact submission.",
      });
    }

    if (Buffer.byteLength(bodyText, "utf8") > CONTACT_REQUEST_MAX_BYTES) {
      return jsonResponse(413, {
        success: false,
        message: "Contact submission is too large.",
      });
    }

    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return jsonResponse(400, {
        success: false,
        message: "Invalid JSON body.",
      });
    }

    const submissionRequest = decodeContactSubmissionRequest(body);
    if (!submissionRequest) {
      return jsonResponse(400, {
        success: false,
        message: "Invalid contact submission.",
      });
    }

    const validationErrors = validateContactSubmission(submissionRequest);
    if (validationErrors.length > 0) {
      if (submissionRequest.honeypot.trim()) {
        context.warn("[contact-api] Honeypot submission rejected");
      }

      return jsonResponse(400, {
        success: false,
        errors: validationErrors,
      });
    }

    const submission = prepareContactSubmission(submissionRequest);
    const rateLimitAllowed = await dependencies.rateLimiter.consume(
      submission.email.toLowerCase(),
    );
    if (!rateLimitAllowed) {
      context.warn("[contact-api] Rate limit exceeded");
      return jsonResponse(429, {
        success: false,
        message:
          "Too many submissions. Please try again later or contact us directly.",
      });
    }

    const resendApiKey = dependencies.environment.RESEND_API_KEY?.trim();
    if (!resendApiKey) {
      context.error("[contact-api] RESEND_API_KEY not configured");
      return jsonResponse(503, {
        success: false,
        message: "Email service is not configured",
      });
    }

    const from =
      dependencies.environment.CONTACT_FROM_EMAIL?.trim() ||
      DEFAULT_FROM_EMAIL;
    const to =
      dependencies.environment.CONTACT_TO_EMAIL?.trim() || DEFAULT_TO_EMAIL;
    const submissionTime = dependencies.now().toLocaleString("en-AU", {
      timeZone: "Australia/Melbourne",
    });
    const emailContent = createContactEmailContent(
      submission,
      submissionTime,
    );

    try {
      const transport = dependencies.createTransport(resendApiKey);
      const result = await transport.send({
        from,
        to,
        replyTo: submission.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });

      if (result.error) {
        context.error("[contact-api] Resend transport failed");
        return jsonResponse(503, {
          success: false,
          message:
            "Failed to send enquiry. Please try again or contact us directly.",
        });
      }
    } catch {
      context.error("[contact-api] Resend transport failed");
      return jsonResponse(503, {
        success: false,
        message:
          "Failed to send enquiry. Please try again or contact us directly.",
      });
    }

    return jsonResponse(200, {
      success: true,
      message: "Enquiry sent successfully",
    });
  };
}

export const contactHandler = createContactHandler();
