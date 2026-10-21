import { afterEach, describe, expect, it, vi } from "vitest";
import { submitContactForm } from "./submitContactHttp";
import type { ContactSubmissionRequest } from "./contactSubmission";

const submission: ContactSubmissionRequest = {
  name: "Test Person",
  email: "test@example.com",
  phone: "",
  services: ["photography"],
  setup: "",
  message: "A test message longer than twenty characters.",
  contactMethod: "email",
  timing: "",
  requiredDate: "",
  consent: true,
  honeypot: "",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("static contact HTTP transport", () => {
  it("posts the full contract to the same-origin API and confirms success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { success: true }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await submitContactForm(submission)).success).toBe(true);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      "/api/contact",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(submission),
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        signal: expect.any(AbortSignal),
      }),
    );
  });
  it("preserves authoritative field errors", async () => {
    const errors = [
      { field: "email", message: "Enter a valid email address." },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(reply(400, { success: false, errors })),
    );
    expect(await submitContactForm(submission)).toMatchObject({
      success: false,
      errors,
    });
  });
  it("explains rate limiting without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(429, { success: false }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await submitContactForm(submission)).toMatchObject({
      success: false,
      message: expect.stringContaining("Too many"),
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it.each([
    [503, { success: false, message: "secret internal details" }],
    [404, { success: true }],
    [500, { success: true }],
    [200, { success: false }],
    [200, { success: "true" }],
    [400, { success: true }],
    [
      400,
      { success: false, errors: [{ field: "unknown", message: "Invalid" }] },
    ],
    [400, { success: false, errors: [] }],
    [400, { success: false, errors: [{ field: "email", message: 42 }] }],
  ])("fails safely for response %s/%j", async (status, body) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(reply(status as number, body)),
    );
    const result = await submitContactForm(submission);
    expect(result).toMatchObject({
      success: false,
      message: expect.stringContaining("Unable to confirm"),
    });
    expect(JSON.stringify(result)).not.toContain("secret internal details");
  });
  it.each(["<html>Fallback</html>", "{broken-json"])(
    "rejects HTML and malformed JSON",
    async (body) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(body, {
            status: 200,
            headers: {
              "Content-Type": body.startsWith("<")
                ? "text/html"
                : "application/json",
            },
          }),
        ),
      );
      expect((await submitContactForm(submission)).success).toBe(false);
    },
  );
  it("recovers from a network failure without resending", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new TypeError("Network failure"));
    vi.stubGlobal("fetch", fetchMock);
    expect((await submitContactForm(submission)).success).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("aborts a stalled request and releases the timer", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener("abort", () =>
              reject(new Error("Aborted")),
            );
          }),
      ),
    );
    const pending = submitContactForm(submission);
    await vi.advanceTimersByTimeAsync(30_000);
    expect((await pending).success).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
