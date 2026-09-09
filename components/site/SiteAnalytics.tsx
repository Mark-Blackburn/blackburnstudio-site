"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  sendPublicPageView,
  setAnalyticsMeasurementEnabled,
} from "@/lib/analytics";
import { isPrivateRoute } from "@/lib/privateRoutes";

export default function SiteAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isConfigured, setIsConfigured] = useState(false);
  const lastPageViewRef = useRef<string | null>(null);
  const privateRoute = isPrivateRoute(pathname);
  const search = searchParams.toString();
  const routeKey = search ? `${pathname}?${search}` : pathname;

  useLayoutEffect(() => {
    if (!measurementId) return;

    setAnalyticsMeasurementEnabled(measurementId, !privateRoute);
    if (privateRoute) {
      lastPageViewRef.current = null;
    }
  }, [measurementId, privateRoute]);

  useEffect(() => {
    if (
      !measurementId ||
      !isConfigured ||
      privateRoute ||
      lastPageViewRef.current === routeKey
    ) {
      return;
    }

    setAnalyticsMeasurementEnabled(measurementId, true);
    if (sendPublicPageView(pathname, search)) {
      lastPageViewRef.current = routeKey;
    }
  }, [isConfigured, measurementId, pathname, privateRoute, routeKey, search]);

  if (!measurementId || (privateRoute && !isConfigured)) {
    return null;
  }

  const measurementIdJson = JSON.stringify(measurementId);
  const disableKeyJson = JSON.stringify(`ga-disable-${measurementId}`);

  return (
    <>
      <Script
        id="blackburn-ga-init"
        onReady={() => setIsConfigured(true)}
        dangerouslySetInnerHTML={{
          __html: `
window[${disableKeyJson}] = false;
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
window.gtag('js', new Date());
window.gtag('set', {'send_page_view': false});
window.gtag('config', ${measurementIdJson}, {'send_page_view': false});`,
        }}
      />
      <Script
        id="blackburn-ga-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
      />
    </>
  );
}