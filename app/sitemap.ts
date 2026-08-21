import type { MetadataRoute } from "next";

import { absoluteUrl, INDEXABLE_ROUTES } from "@/lib/siteConfig";

export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_ROUTES.map((path) => ({
    url: absoluteUrl(path),
  }));
}