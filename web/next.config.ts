import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve map/lineup images straight from /public without the optimizer,
    // which avoids aggressive caching of stale variants during editing.
    unoptimized: true,
  },
};

export default nextConfig;
