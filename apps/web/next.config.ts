import type { NextConfig } from "next";

const cloudFrontDomain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;
if (!cloudFrontDomain) {
  throw new Error("NEXT_PUBLIC_CLOUDFRONT_DOMAIN is required");
}

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: cloudFrontDomain,
        pathname: "/optimized/**",
      },
    ],
  },
};

export default nextConfig;
