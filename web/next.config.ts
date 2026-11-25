import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/api/analyze": ["./public/datasets/*.csv"],
  },
};

export default nextConfig;
