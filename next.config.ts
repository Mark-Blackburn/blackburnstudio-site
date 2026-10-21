import type { NextConfig } from "next";
import path from "node:path";

const staticExport = process.env.BLACKBURN_STATIC_EXPORT === "1";
const contactTransport = staticExport
  ? "./lib/contact/submitContactHttp.ts"
  : "./lib/actions/submitContactForm.ts";

const nextConfig: NextConfig = {
  ...(staticExport ? { output: "export" as const } : {}),
  turbopack: {
    resolveAlias: { "@contact-transport": contactTransport },
  },
  webpack(config) {
    config.resolve.alias["@contact-transport$"] =
      path.resolve(contactTransport);
    return config;
  },
  images: {
    unoptimized: true,
  },
  ...(staticExport
    ? {}
    : {
        rewrites() {
          return [
            {
              source: "/clients/:path+",
              destination: "/clients",
            },
          ];
        },
      }),
};

export default nextConfig;
