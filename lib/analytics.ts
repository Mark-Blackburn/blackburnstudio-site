import { isPrivateRoute } from "@/lib/privateRoutes";
import { SITE_NAME } from "@/lib/siteConfig";

type AnalyticsEventParameters = Record<
  string,
  string | number | boolean | undefined
>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function measurementDisableKey(measurementId: string) {
  return `ga-disable-${measurementId}`;
}

function configuredMeasurementId() {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
}

function canSend(measurementId: string): boolean {
  return (
    typeof window !== "undefined" &&
    !isPrivateRoute(window.location.pathname) &&
    Reflect.get(window, measurementDisableKey(measurementId)) !== true &&
    typeof window.gtag === "function"
  );
}

export function setAnalyticsMeasurementEnabled(
  measurementId: string,
  enabled: boolean,
) {
  if (typeof window === "undefined") return;
  Reflect.set(window, measurementDisableKey(measurementId), !enabled);
}

export function sendPublicAnalyticsEvent(
  eventName: string,
  parameters: AnalyticsEventParameters,
): boolean {
  const measurementId = configuredMeasurementId();
  if (!measurementId || !canSend(measurementId)) return false;

  window.gtag?.("event", eventName, parameters);
  return true;
}

export function sendPublicPageView(
  pathname: string,
  searchParams: string,
): boolean {
  const measurementId = configuredMeasurementId();
  if (
    !measurementId ||
    isPrivateRoute(pathname) ||
    typeof window === "undefined" ||
    window.location.pathname !== pathname ||
    !canSend(measurementId)
  ) {
    return false;
  }

  const pagePath = searchParams ? `${pathname}?${searchParams}` : pathname;
  const pageLocation = new URL(pagePath, window.location.origin).toString();
  const pageTitle = document.title.trim() || SITE_NAME;

  window.gtag?.("event", "page_view", {
    page_title: pageTitle,
    page_location: pageLocation,
    page_path: pagePath,
  });
  return true;
}