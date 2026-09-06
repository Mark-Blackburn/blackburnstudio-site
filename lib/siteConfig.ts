import type { Metadata } from "next";

export const SITE_NAME = "Blackburn Studio";
export const SITE_URL = "https://www.theblackburn.studio";
export const SITE_EMAIL = "hello@theblackburn.studio";
export const DEFAULT_TITLE = "Blackburn Studio — Photography and Digital";
export const DEFAULT_DESCRIPTION =
  "Blackburn Studio creates photography, websites and digital workflows for people, businesses and community groups.";

export const INDEXABLE_ROUTES = [
  "/",
  "/digital",
  "/digital/websites",
  "/digital/hosting-domains",
  "/digital/microsoft-365",
  "/digital/support",
  "/tools",
  "/tools/image-resizer",
  "/tools/image-resizer/app",
  "/tools/qr-code-generator",
  "/tools/qr-code-generator/app",
  "/tools/pdf-reducer",
  "/work",
  "/work/portraits",
  "/work/families",
  "/work/couples",
  "/work/japan",
  "/about",
  "/contact",
] as const;

export type IndexableRoute = (typeof INDEXABLE_ROUTES)[number];

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

type PageMetadataOptions = {
  title: string;
  description: string;
  path: IndexableRoute;
  includeBrandSuffix?: boolean;
};

export function createPageMetadata({
  title,
  description,
  path,
  includeBrandSuffix = true,
}: PageMetadataOptions): Metadata {
  const socialTitle = includeBrandSuffix ? `${title} | ${SITE_NAME}` : title;

  return {
    title: includeBrandSuffix ? title : { absolute: title },
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      locale: "en_AU",
      url: path,
      siteName: SITE_NAME,
      title: socialTitle,
      description,
    },
    twitter: {
      card: "summary",
      title: socialTitle,
      description,
    },
  };
}