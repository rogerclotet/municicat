import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // `Special:FilePath` is the stable URL for a Commons file; it redirects to the CDN.
      { protocol: "https", hostname: "commons.wikimedia.org", pathname: "/wiki/Special:FilePath/**" },
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/commons/**" },
    ],
  },
};

export default nextConfig;
