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
