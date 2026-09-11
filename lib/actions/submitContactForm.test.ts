import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("resend", () => {
  return {
    Resend: class {
      emails = {
        send: sendMock,
      };
    },
  };
});

import { submitContactForm } from "@/lib/actions/submitContactForm";
import { CONTACT_MAX_FIELD_LENGTH } from "@/lib/contact/contactSubmission";

const invalidRuntimeResult = {
  success: false,
  errors: [{ field: "form", message: "Form submission failed validation" }],
};

function buildFormData(overrides: Partial<Parameters<typeof submitContactForm>[0]> = {}) {
  const seed = Math.random().toString(36).slice(2);
  return {
    name: "Test Person",
    email: `contact-${seed}@example.com`,
    phone: "0412 345 678",
    services: ["new-website"],
    setup: "",
    message: "A".repeat(120),
    contactMethod: "email",
    timing: "",
    requiredDate: "",
    consent: true,
    honeypot: "",
    ...overrides,
  };
}

function submitRuntimeValue(value: unknown) {
  return submitContactForm(
    value as Parameters<typeof submitContactForm>[0],
  );
}

describe("submitContactForm message limits", () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ id: "email_123", error: null });
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.CONTACT_FROM_EMAIL = "Blackburn Studio Website <noreply@theblackburn.studio>";
    process.env.CONTACT_TO_EMAIL = "hello@theblackburn.studio";
  });

  it("accepts a message just under 5000 characters", async () => {
    const result = await submitContactForm(
      buildFormData({
        message: "A".repeat(4999),
      }),
    );

    expect(result.success).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a message over 5000 characters", async () => {
    const result = await submitContactForm(
      buildFormData({
        message: "A".repeat(5001),
      }),
    );

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "message",
          message: "Message is too long.",
        }),
      ]),
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("does not silently reduce messages over 500 characters to 500", async () => {
    const longMessage = "A".repeat(700);

    const result = await submitContactForm(
      buildFormData({
        message: longMessage,
      }),
    );

    expect(result.success).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].text).toContain(longMessage);
  });

  it("requires a preferred contact method", async () => {
    const result = await submitContactForm(
      buildFormData({
        contactMethod: "",
      }),
    );

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "contactMethod",
          message: "Choose a preferred contact method.",
        }),
      ]),
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it.each([
    "Mark\r\nInjected",
    "Mark\nInjected",
    "Mark\tInjected",
    "Mark\u0000Injected",
  ])("rejects control characters before they reach the email subject", async (name) => {
    const result = await submitContactForm(buildFormData({ name }));

    expect(result).toEqual({
      success: false,
      errors: [{ field: "name", message: "Please enter your name." }],
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized name instead of sending a truncated subject", async () => {
    const result = await submitContactForm(
      buildFormData({
        name: "A".repeat(CONTACT_MAX_FIELD_LENGTH + 1),
      }),
    );

    expect(result).toEqual({
      success: false,
      errors: [{ field: "name", message: "Please enter your name." }],
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'consent: "false"', value: { consent: "false" } },
    {
      label: "a non-string service",
      value: { services: ["photography", 42] },
    },
    { label: "an object name", value: { name: { nested: "name" } } },
    { label: "null", value: null },
    { label: "a primitive", value: "invalid submission" },
  ])("fails closed for runtime input with $label", async ({ value }) => {
    const result = await submitRuntimeValue(value);

    expect(result).toEqual(invalidRuntimeResult);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("does not consume rate-limit capacity for malformed runtime input", async () => {
    const email = `malformed-${Math.random().toString(36).slice(2)}@example.com`;

    for (let submission = 0; submission < 6; submission += 1) {
      const result = await submitRuntimeValue({
        ...buildFormData({ email }),
        consent: "false",
      });

      expect(result).toEqual(invalidRuntimeResult);
    }

    const validResult = await submitContactForm(buildFormData({ email }));

    expect(validResult.success).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("fails closed for sparse services without consuming rate-limit capacity", async () => {
    const email = `sparse-${Math.random().toString(36).slice(2)}@example.com`;
    const services = new Array<string>(2);
    services[1] = "new-website";

    for (let submission = 0; submission < 6; submission += 1) {
      const result = await submitRuntimeValue({
        ...buildFormData({ email }),
        services,
      });

      expect(result).toEqual(invalidRuntimeResult);
    }

    const validResult = await submitContactForm(buildFormData({ email }));

    expect(validResult.success).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an oversized raw service without calling transport", async () => {
    const result = await submitContactForm(
      buildFormData({
        services: [
          `new-website${" ".repeat(
            CONTACT_MAX_FIELD_LENGTH - "new-website".length + 1,
          )}`,
        ],
      }),
    );

    expect(result).toEqual({
      success: false,
      errors: [
        {
          field: "services",
          message: "One or more services are invalid.",
        },
      ],
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("accepts 9-digit autofill mobile and sends canonical phone", async () => {
    const result = await submitContactForm(
      buildFormData({
        phone: "424961192",
      }),
    );

    expect(result.success).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].text).toContain("Phone: +61424961192");
  });

  it("does not log the submitter email when rate limiting", async () => {
    const email = `rate-limit-${Math.random().toString(36).slice(2)}@example.com`;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      for (let submission = 0; submission < 6; submission += 1) {
        await submitContactForm(buildFormData({ email }));
      }

      expect(logSpy).toHaveBeenCalledWith(
        "[contact-form] Rate limit exceeded",
      );
      expect(JSON.stringify(logSpy.mock.calls)).not.toContain(email);
    } finally {
      logSpy.mockRestore();
    }
  });
});
