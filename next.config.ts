import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  rewrites() {
    return [
      {
        source: "/clients/:path+",
        destination: "/clients",
      },
    ];
  },
};

export default nextConfig;