import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  sendPublicAnalyticsEvent,
  setAnalyticsMeasurementEnabled,
} from "@/lib/analytics";

const measurementId = "G-TEST123";
const disableKey = `ga-disable-${measurementId}`;

describe("public analytics event boundary", () => {
  const gtagMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", measurementId);
    window.gtag = gtagMock;
    gtagMock.mockReset();
    window.history.replaceState({}, "", "/contact");
    Reflect.deleteProperty(window, disableKey);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(window, disableKey);
    delete window.gtag;
  });

  it("sends a configured custom event on a public route", () => {
    setAnalyticsMeasurementEnabled(measurementId, true);

    expect(
      sendPublicAnalyticsEvent("generate_lead", {
        form_name: "project_enquiry",
      }),
    ).toBe(true);
    expect(gtagMock).toHaveBeenCalledWith("event", "generate_lead", {
      form_name: "project_enquiry",
    });
  });

  it.each(["/clients/g_opaque", "/admin/galleries"])(
    "blocks custom events on the private route %s",
    (pathname) => {
      window.history.replaceState({}, "", pathname);

      expect(
        sendPublicAnalyticsEvent("generate_lead", {
          form_name: "project_enquiry",
        }),
      ).toBe(false);
      expect(gtagMock).not.toHaveBeenCalled();
    },
  );

  it("blocks custom events while the measurement property is disabled", () => {
    setAnalyticsMeasurementEnabled(measurementId, false);

    expect(sendPublicAnalyticsEvent("generate_lead", {})).toBe(false);
    expect(gtagMock).not.toHaveBeenCalled();
  });

  it.each(["/clientservices", "/administration"])(
    "allows events on the public prefix-like route %s",
    (pathname) => {
      window.history.replaceState({}, "", pathname);
      setAnalyticsMeasurementEnabled(measurementId, true);

      expect(sendPublicAnalyticsEvent("generate_lead", {})).toBe(true);
      expect(gtagMock).toHaveBeenCalledOnce();
    },
  );
});