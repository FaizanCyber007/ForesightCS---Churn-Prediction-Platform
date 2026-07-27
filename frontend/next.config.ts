import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Suppress the Three.js module warning about server-side issues
  serverExternalPackages: ['three'],
};

export default nextConfig;
