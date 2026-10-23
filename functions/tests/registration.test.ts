import { afterEach, describe, expect, it, vi } from "vitest";

const registration = vi.hoisted(() => ({ http: vi.fn(), timer: vi.fn() }));
vi.mock("@azure/functions", () => ({ app: registration }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
});

describe("retention timer registration", () => {
  it.each([undefined, "", "disabled"])(
    "keeps maintenance disabled for %s",
    async (mode) => {
      vi.stubEnv("CONTACT_RATE_LIMIT_RETENTION_MODE", mode);
      await import("../src/index");
      expect(registration.http).toHaveBeenCalledOnce();
      expect(registration.timer).not.toHaveBeenCalled();
    },
  );
  it.each(["dry-run", "delete"])(
    "registers explicitly enabled %s maintenance",
    async (mode) => {
      vi.stubEnv("CONTACT_RATE_LIMIT_RETENTION_MODE", mode);
      await import("../src/index");
      expect(registration.timer).toHaveBeenCalledExactlyOnceWith(
        "contactRateLimitRetention",
        {
          schedule: "0 15 * * * *",
          runOnStartup: false,
          useMonitor: true,
          handler: expect.any(Function),
        },
      );
    },
  );
});

describe("gallery route registration", () => {
  it("registers gallery access only when explicitly enabled", async () => {
    vi.stubEnv("GALLERY_API_ENABLED", "true");
    vi.stubEnv("CONTACT_RATE_LIMIT_RETENTION_MODE", "disabled");
    await import("../src/index");
    expect(registration.http.mock.calls.map(call => call[0])).toEqual([
      "contact", "galleryExchange", "galleryMetadata", "galleryLogout",
    ]);
    expect(registration.http.mock.calls.slice(1).map(call => call[1].route)).toEqual([
      "galleries/{galleryId}/exchange", "galleries/{galleryId}", "galleries/{galleryId}/logout",
    ]);
  });

  it("returns a generic gallery 503 for missing configuration without breaking contact registration", async () => {
    vi.stubEnv("GALLERY_API_ENABLED", "true");
    vi.stubEnv("GALLERY_ACCESS_HMAC_KEY", "");
    await import("../src/index");
    const handler = registration.http.mock.calls.find(call => call[0] === "galleryExchange")![1].handler;
    const error = vi.fn();
    expect(await handler({}, { error })).toMatchObject({ status: 503, headers: { "Cache-Control": "no-store" } });
    expect(error).toHaveBeenCalledExactlyOnceWith("[gallery-api] Request failed");
    expect(registration.http.mock.calls[0][0]).toBe("contact");
  });
});
