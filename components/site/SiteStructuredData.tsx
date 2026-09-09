"use client";

import { usePathname } from "next/navigation";

import { isPrivateRoute } from "@/lib/privateRoutes";
import {
  DEFAULT_DESCRIPTION,
  SITE_EMAIL,
  SITE_NAME,
  SITE_URL,
} from "@/lib/siteConfig";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      inLanguage: "en-AU",
      publisher: {
        "@id": `${SITE_URL}/#business`,
      },
    },
    {
      "@type": "ProfessionalService",
      "@id": `${SITE_URL}/#business`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      email: SITE_EMAIL,
      description: DEFAULT_DESCRIPTION,
      areaServed: [
        {
          "@type": "City",
          name: "Gisborne",
        },
        {
          "@type": "AdministrativeArea",
          name: "Victoria",
        },
      ],
    },
  ],
};

export default function SiteStructuredData() {
  const pathname = usePathname();

  if (isPrivateRoute(pathname)) {
    return null;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
      }}
    />
  );
}