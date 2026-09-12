import { HttpRequest, InvocationContext } from "@azure/functions";
import { describe, expect, it, vi } from "vitest";

import { CONTACT_MAX_FIELD_LENGTH } from "../../lib/contact/contactSubmission";
import {
  CONTACT_RATE_LIMIT_MAX_TRACKED_KEYS,
  CONTACT_REQUEST_MAX_BYTES,
  createContactHandler,
  createInMemoryContactRateLimiter,
  type ContactEmailMessage,
} from "../src/contact";

const validSubmission = {
  name: "Test Person",
  email: "test@example.com",
  phone: "424 961 192",
  services: ["new-website"],
  setup: "",
  message: "I need help with a new website project.",
  contactMethod: "email",
  timing: "one-month",
  requiredDate: "",
  consent: true,
  honeypot: "",
};

const unsupportedContentTypeHeaders: Record<string, string>[] = [
  {},
  { "content-type": "text/plain" },
];

function createRequest(
  body: string,
  headers: Record<string, string> = {
    "content-type": "application/json",
  },
): HttpRequest {
  return new HttpRequest({
    method: "POST",
    url: "http://localhost/api/contact",
    headers,
    body: { string: body },
  });
}

function createContext() {
  const logs: Array<{ level: string; args: unknown[] }> = [];
  const context = new InvocationContext({
    functionName: "contact",
    logHandler(level, ...args) {
      logs.push({ level, args });
    },
  });

  return { context, logs };
}

function createHarness(
  overrides: Parameters<typeof createContactHandler>[0] = {},
) {
  const sentMessages: ContactEmailMessage[] = [];
  const send = vi.fn(async (message: ContactEmailMessage) => {
    sentMessages.push(message);
    return { error: false };
  });
  const handler = createContactHandler({
    environment: {
      RESEND_API_KEY: "test-api-key",
      CONTACT_FROM_EMAIL: "Website <from@example.com>",
      CONTACT_TO_EMAIL: "to@example.com",
    },
    now: () => new Date("2027-05-17T00:30:00.000Z"),
    rateLimiter: { consume: () => true },
    createTransport: () => ({ send }),
    ...overrides,
  });
  const { context, logs } = createContext();

  return { context, handler, logs, send, sentMessages };
}

function expectNoStore(response: Awaited<ReturnType<ReturnType<typeof createContactHandler>>>) {
  expect(new Headers(response.headers).get("cache-control")).toBe("no-store");
  expect(new Headers(response.headers).get("content-type")).toBe(
    "application/json; charset=utf-8",
  );
}

describe("contact Function HTTP contract", () => {
  it("accepts a valid request and sends the normalized shared email", async () => {
    const harness = createHarness();
    const response = await harness.handler(
      createRequest(JSON.stringify(validSubmission)),
      harness.context,
    );

    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({
      success: true,
      message: "Enquiry sent successfully",
    });
    expectNoStore(response);
    expect(harness.send).toHaveBeenCalledTimes(1);
    expect(harness.sentMessages[0]).toEqual(
      expect.objectContaining({
        from: "Website <from@example.com>",
        to: "to@example.com",
        replyTo: "test@example.com",
        subject:
          "New Blackburn Studio enquiry — New website — Test Person",
      }),
    );
    expect(harness.sentMessages[0].text).toContain("Phone: +61424961192");
    expect(harness.sentMessages[0].text).toContain(
      "Existing setup: No — this is something new",
    );
  });

  it("accepts application/json with media type parameters", async () => {
    const harness = createHarness();
    const response = await harness.handler(
      createRequest(JSON.stringify(validSubmission), {
        "content-type": "Application/JSON; charset=utf-8",
      }),
      harness.context,
    );

    expect(response.status).toBe(200);
    expectNoStore(response);
  });

  it.each(unsupportedContentTypeHeaders)(
    "rejects an unsupported Content-Type",
    async (headers) => {
    const harness = createHarness();
    const response = await harness.handler(
      createRequest(JSON.stringify(validSubmission), headers),
      harness.context,
    );

    expect(response.status).toBe(415);
    expect(response.jsonBody).toEqual({
      success: false,
      message: "Content-Type must be application/json.",
      },
    );
    expectNoStore(response);
    expect(harness.send).not.toHaveBeenCalled();
  });

  it("rejects an oversized declared Content-Length", async () => {
    const harness = createHarness();
    const response = await harness.handler(
      createRequest("{}", {
        "content-type": "application/json",
        "content-length": String(CONTACT_REQUEST_MAX_BYTES + 1),
      }),
      harness.context,
    );

    expect(response.status).toBe(413);
    expectNoStore(response);
    expect(harness.send).not.toHaveBeenCalled();
  });

  it("rejects an oversized body when Content-Length is absent", async () => {
    const harness = createHarness();
    const response = await harness.handler(
      createRequest(`"${"A".repeat(CONTACT_REQUEST_MAX_BYTES)}"`),
      harness.context,
    );

    expect(response.status).toBe(413);
    expectNoStore(response);
    expect(harness.send).not.toHaveBeenCalled();
  });

  it("rejects a multibyte body whose UTF-8 byte size exceeds the limit", async () => {
    const harness = createHarness();
    const body = JSON.stringify({
      ...validSubmission,
      message: "😀".repeat(5_000),
    });

    expect(body.length).toBeLessThan(CONTACT_REQUEST_MAX_BYTES);
    expect(Buffer.byteLength(body, "utf8")).toBeGreaterThan(
      CONTACT_REQUEST_MAX_BYTES,
    );

    const response = await harness.handler(
      createRequest(body),
      harness.context,
    );

    expect(response.status).toBe(413);
    expectNoStore(response);
    expect(harness.send).not.toHaveBeenCalled();
  });

  it.each(["2", "not-a-number"])(
    "rejects an oversized actual body with Content-Length %s",
    async (contentLength) => {
      const harness = createHarness();
      const body = JSON.stringify({
        ...validSubmission,
        message: "A".repeat(CONTACT_REQUEST_MAX_BYTES),
      });
      const response = await harness.handler(
        createRequest(body, {
          "content-type": "application/json",
          "content-length": contentLength,
        }),
        harness.context,
      );

      expect(response.status).toBe(413);
      expectNoStore(response);
      expect(harness.send).not.toHaveBeenCalled();
    },
  );

  it("rejects malformed JSON without reflecting the body", async () => {
    const harness = createHarness();
    const attackerValue = "<script>private-attacker-value</script>";
    const response = await harness.handler(
      createRequest(`{"name":"${attackerValue}"`),
      harness.context,
    );

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.jsonBody)).not.toContain(attackerValue);
    expectNoStore(response);
  });

  it.each([
    "null",
    "[]",
    '"primitive"',
    JSON.stringify({ ...validSubmission, services: "photography" }),
    JSON.stringify({ ...validSubmission, consent: "true" }),
  ])("rejects a non-contract JSON shape", async (body) => {
    const harness = createHarness();
    const response = await harness.handler(
      createRequest(body),
      harness.context,
    );

    expect(response.status).toBe(400);
    expect(response.jsonBody).toEqual({
      success: false,
      message: "Invalid contact submission.",
    });
    expectNoStore(response);
    expect(harness.send).not.toHaveBeenCalled();
  });

  it("returns shared validation errors for missing required fields", async () => {
    const harness = createHarness();
    const response = await harness.handler(
      createRequest("{}"),
      harness.context,
    );

    expect(response.status).toBe(400);
    expect(response.jsonBody).toEqual({
      success: false,
      errors: expect.arrayContaining([
        { field: "name", message: "Please enter your name." },
        { field: "email", message: "Please enter your email address." },
        { field: "services", message: "Select at least one service." },
        {
          field: "contactMethod",
          message: "Choose a preferred contact method.",
        },
        { field: "consent", message: "You must consent to proceed." },
      ]),
    });
    expectNoStore(response);
  });

  it("rejects an oversized raw service without calling transport", async () => {
    const harness = createHarness();
    const service = `new-website${" ".repeat(
      CONTACT_MAX_FIELD_LENGTH - "new-website".length + 1,
    )}`;
    const response = await harness.handler(
      createRequest(
        JSON.stringify({
          ...validSubmission,
          services: [service],
        }),
      ),
      harness.context,
    );

    expect(response.status).toBe(400);
    expect(response.jsonBody).toEqual({
      success: false,
      errors: [
        {
          field: "services",
          message: "One or more services are invalid.",
        },
      ],
    });
    expectNoStore(response);
    expect(harness.send).not.toHaveBeenCalled();
  });

   it.each([
    "Mark\r\nInjected",
    "Mark\nInjected",
    "Mark\tInjected",
    "Mark\u0000Injected",
    "Mark\u007FInjected",
    "Mark\u0085Injected",
    "Mark\u009FInjected",
  ])(
    "rejects control characters before constructing the email subject",
    async (name) => {
      const harness = createHarness();
      const response = await harness.handler(
        createRequest(JSON.stringify({ ...validSubmission, name })),
        harness.context,
      );

      expect(response.status).toBe(400);
      expect(response.jsonBody).toEqual({
        success: false,
        errors: [{ field: "name", message: "Please enter your name." }],
      });
      expectNoStore(response);
      expect(harness.send).not.toHaveBeenCalled();
      expect(JSON.stringify(harness.logs)).not.toContain(name);
    },
  );

  it("rejects an email containing a control character with a controlled validation response", async () => {
    const harness = createHarness();
    const response = await harness.handler(
      createRequest(
        JSON.stringify({
          ...validSubmission,
          email: "attacker\u0000@example.com",
        }),
      ),
      harness.context,
    );

    expect(response.status).toBe(400);
    expect(response.jsonBody).toEqual({
      success: false,
      errors: [{ field: "email", message: "Enter a valid email address." }],
    });
    expectNoStore(response);
    expect(harness.send).not.toHaveBeenCalled();
  });

  it("rejects an oversized field instead of sending a truncated value", async () => {
    const harness = createHarness();
    const response = await harness.handler(
      createRequest(
        JSON.stringify({
          ...validSubmission,
          name: "A".repeat(501),
        }),
      ),
      harness.context,
    );

    expect(response.status).toBe(400);
    expect(response.jsonBody).toEqual({
      success: false,
      errors: [{ field: "name", message: "Please enter your name." }],
    });
    expectNoStore(response);
    expect(harness.send).not.toHaveBeenCalled();
  });

  it("fails the honeypot closed with only the generic validation error", async () => {
    const harness = createHarness();
    const attackerValue = "private-bot-payload";
    const response = await harness.handler(
      createRequest(
        JSON.stringify({ ...validSubmission, honeypot: attackerValue }),
      ),
      harness.context,
    );

    expect(response.status).toBe(400);
    expect(response.jsonBody).toEqual({
      success: false,
      errors: [
        { field: "form", message: "Form submission failed validation" },
      ],
    });
    expect(JSON.stringify(response.jsonBody)).not.toContain(attackerValue);
    expect(JSON.stringify(harness.logs)).not.toContain(attackerValue);
    expectNoStore(response);
    expect(harness.send).not.toHaveBeenCalled();
  });

  it("returns 429 without sending when the limiter rejects the request", async () => {
    const harness = createHarness({
      rateLimiter: { consume: () => false },
    });
    const response = await harness.handler(
      createRequest(JSON.stringify(validSubmission)),
      harness.context,
    );

    expect(response.status).toBe(429);
    expect(response.jsonBody).toEqual({
      success: false,
      message:
        "Too many submissions. Please try again later or contact us directly.",
    });
    expectNoStore(response);
    expect(harness.send).not.toHaveBeenCalled();
  });

  it("returns 503 without sending when Resend is not configured", async () => {
    const harness = createHarness({ environment: {} });
    const response = await harness.handler(
      createRequest(JSON.stringify(validSubmission)),
      harness.context,
    );

    expect(response.status).toBe(503);
    expect(response.jsonBody).toEqual({
      success: false,
      message: "Email service is not configured",
    });
    expectNoStore(response);
    expect(harness.send).not.toHaveBeenCalled();
  });

  it("returns a safe 503 when the transport reports a failure", async () => {
    const secret = "provider-secret-error";
    const harness = createHarness({
      createTransport: () => ({
        async send() {
          return { error: Boolean(secret) };
        },
      }),
    });
    const response = await harness.handler(
      createRequest(JSON.stringify(validSubmission)),
      harness.context,
    );

    expect(response.status).toBe(503);
    expect(JSON.stringify(response.jsonBody)).not.toContain(secret);
    expect(JSON.stringify(harness.logs)).not.toContain(secret);
    expectNoStore(response);
  });

  it("returns a safe 503 when the transport throws", async () => {
    const secret = "provider-secret-exception";
    const harness = createHarness({
      createTransport: () => ({
        async send() {
          throw new Error(secret);
        },
      }),
    });
    const response = await harness.handler(
      createRequest(JSON.stringify(validSubmission)),
      harness.context,
    );

    expect(response.status).toBe(503);
    expect(JSON.stringify(response.jsonBody)).not.toContain(secret);
    expect(JSON.stringify(harness.logs)).not.toContain(secret);
    expectNoStore(response);
  });
});

describe("temporary in-memory contact rate limiter", () => {
  it("limits an address within the window and permits it after expiry", () => {
    let currentTime = 1_000;
    const limiter = createInMemoryContactRateLimiter(() => currentTime);

    expect(limiter.consume("test@example.com")).toBe(true);
    expect(limiter.consume("test@example.com")).toBe(true);
    expect(limiter.consume("test@example.com")).toBe(true);
    expect(limiter.consume("test@example.com")).toBe(true);
    expect(limiter.consume("test@example.com")).toBe(true);
    expect(limiter.consume("test@example.com")).toBe(false);

    currentTime += 60 * 60 * 1000;
    expect(limiter.consume("test@example.com")).toBe(true);
  });

  it("bounds tracked keys by evicting the oldest key", () => {
    const trackedKeyLimit = 3;
    const limiter = createInMemoryContactRateLimiter(
      () => 1_000,
      trackedKeyLimit,
    );

    expect(limiter.consume("first@example.com")).toBe(true);
    expect(limiter.consume("second@example.com")).toBe(true);
    expect(limiter.consume("third@example.com")).toBe(true);
    expect(limiter.trackedKeyCount).toBe(trackedKeyLimit);

    expect(() => limiter.consume("fourth@example.com")).not.toThrow();
    expect(limiter.trackedKeyCount).toBe(trackedKeyLimit);

    expect(limiter.consume("first@example.com")).toBe(true);
    expect(limiter.trackedKeyCount).toBe(trackedKeyLimit);
  });

  it("uses the configured production key bound", () => {
    const limiter = createInMemoryContactRateLimiter(() => 1_000);

    for (let index = 0; index <= CONTACT_RATE_LIMIT_MAX_TRACKED_KEYS; index += 1) {
      expect(limiter.consume(`contact-${index}@example.com`)).toBe(true);
      expect(limiter.trackedKeyCount).toBeLessThanOrEqual(
        CONTACT_RATE_LIMIT_MAX_TRACKED_KEYS,
      );
    }
  });
});
