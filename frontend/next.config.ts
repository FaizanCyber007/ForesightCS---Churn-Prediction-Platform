import type { NextConfig } from "next";

const rawBackendUrl =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const destinationBase = rawBackendUrl
  .replace(/\/api\/v\d+\/?$/, "")
  .replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Suppress the Three.js module warning about server-side issues
  serverExternalPackages: ["three"],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${destinationBase}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
