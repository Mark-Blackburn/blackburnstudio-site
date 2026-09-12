"use server";

import { Resend } from "resend";

import { createContactEmailContent } from "@/lib/contact/contactEmail";
import {
  decodeContactSubmissionRequest,
  prepareContactSubmission,
  type ContactSubmissionRequest,
  type ContactSubmissionResult,
  validateContactSubmission,
} from "@/lib/contact/contactSubmission";

// Best-effort bounded in-memory rate limiting only; not distributed across serverless instances.
const submissionTimestamps: Map<string, number[]> = new Map();
const RATE_LIMIT_WINDOW_MS = 3600000;
const MAX_SUBMISSIONS_PER_HOUR = 5;
const MAX_TRACKED_RATE_LIMIT_KEYS = 100;

function cleanupRateLimit(now: number): void {
  for (const [entryKey, timestamps] of submissionTimestamps.entries()) {
    const recentTimestamps = timestamps.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
    );

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

  if (
    !submissionTimestamps.has(key) &&
    submissionTimestamps.size >= MAX_TRACKED_RATE_LIMIT_KEYS
  ) {
    const oldestKey = submissionTimestamps.keys().next().value;
    if (oldestKey !== undefined) {
      submissionTimestamps.delete(oldestKey);
    }
  }

  recentTimestamps.push(now);
  submissionTimestamps.set(key, recentTimestamps);
  return true;
}

export async function submitContactForm(
  formData: ContactSubmissionRequest,
): Promise<ContactSubmissionResult> {
  try {
    const decodedFormData = decodeContactSubmissionRequest(formData);
    if (!decodedFormData) {
      return {
        success: false,
        errors: [
          { field: "form", message: "Form submission failed validation" },
        ],
      };
    }

    const validationErrors = validateContactSubmission(decodedFormData);
    if (validationErrors.length > 0) {
      if (decodedFormData.honeypot.trim()) {
        console.log("[contact-form] Honeypot triggered");
      }

      return {
        success: false,
        errors: validationErrors,
      };
    }

    const submission = prepareContactSubmission(decodedFormData);
    if (!checkRateLimit(submission.email.toLowerCase())) {
      console.log("[contact-form] Rate limit exceeded");
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
    const submissionTime = new Date().toLocaleString("en-AU", {
      timeZone: "Australia/Melbourne",
    });
    const emailContent = createContactEmailContent(
      submission,
      submissionTime,
    );

    const result = await resend.emails.send({
      from: contactFromEmail,
      to: contactToEmail,
      replyTo: submission.email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    if (result.error) {
      console.error("[contact-form] Resend transport failed", {
        statusCode: result.error.statusCode,
        name: result.error.name,
      });
      return {
        success: false,
        message:
          "Failed to send enquiry. Please try again or contact us directly.",
      };
    }

    return {
      success: true,
      message: "Enquiry sent successfully",
    };
  } catch (error) {
    console.error("[contact-form] Unexpected error", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      success: false,
      message:
        "An unexpected error occurred. Please try again or contact us directly.",
    };
  }
}
