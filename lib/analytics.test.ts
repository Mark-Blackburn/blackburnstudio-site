import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  sendPublicPageView,
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

  describe("public page view boundary", () => {
    const gtagMock = vi.fn();

    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", measurementId);
      window.gtag = gtagMock;
      gtagMock.mockReset();
      window.history.replaceState({}, "", "/about");
      document.title = "About | Blackburn Studio";
      Reflect.deleteProperty(window, disableKey);
    });

    afterEach(() => {
      vi.unstubAllEnvs();
      Reflect.deleteProperty(window, disableKey);
      delete window.gtag;
      document.title = "";
    });

    it("uses the current public document title for the page view payload", () => {
      setAnalyticsMeasurementEnabled(measurementId, true);

      expect(sendPublicPageView("/about", "")).toBe(true);
      expect(gtagMock).toHaveBeenCalledWith("event", "page_view", {
        page_title: "About | Blackburn Studio",
        page_location: "http://localhost:3000/about",
        page_path: "/about",
      });
    });

    it("uses the route-specific public title instead of SITE_NAME", () => {
      document.title = "Work | Blackburn Studio";
      window.history.replaceState({}, "", "/work");
      setAnalyticsMeasurementEnabled(measurementId, true);

      expect(sendPublicPageView("/work", "featured=true")).toBe(true);
      expect(gtagMock).toHaveBeenCalledWith("event", "page_view", {
        page_title: "Work | Blackburn Studio",
        page_location: "http://localhost:3000/work?featured=true",
        page_path: "/work?featured=true",
      });
    });

    it("falls back to SITE_NAME when the public title is empty", () => {
      document.title = "   ";
      setAnalyticsMeasurementEnabled(measurementId, true);

      expect(sendPublicPageView("/about", "")).toBe(true);
      expect(gtagMock).toHaveBeenCalledWith("event", "page_view", {
        page_title: "Blackburn Studio",
        page_location: "http://localhost:3000/about",
        page_path: "/about",
      });
    });

    it.each(["/clients/g_opaque", "/admin/galleries"])(
      "keeps private route page views blocked for %s",
      (pathname) => {
        document.title = "Private Gallery | Blackburn Studio";
        window.history.replaceState({}, "", pathname);
        setAnalyticsMeasurementEnabled(measurementId, true);

        expect(sendPublicPageView(pathname, "")).toBe(false);
        expect(gtagMock).not.toHaveBeenCalled();
      },
    );

    it("keeps page_location and page_path behavior unchanged", () => {
      setAnalyticsMeasurementEnabled(measurementId, true);

      expect(sendPublicPageView("/about", "ref=menu")).toBe(true);
      expect(gtagMock).toHaveBeenCalledWith("event", "page_view", {
        page_title: "About | Blackburn Studio",
        page_location: "http://localhost:3000/about?ref=menu",
        page_path: "/about?ref=menu",
      });
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