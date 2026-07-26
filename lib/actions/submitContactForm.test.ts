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
});
