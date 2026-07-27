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
  // Next's default trailingSlash:false normalization 308-redirects every
  // incoming "/api/v1/foo/" request to "/api/v1/foo" *before* the rewrite
  // below ever runs, adding a pointless extra hop (and rewriting the
  // Set-Cookie/redirect chain unnecessarily) on top of the trailing-slash
  // fix in the rewrite destination. Disabling it lets the rewrite handle
  // the trailing slash itself, deterministically, in one hop.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      // Next.js's `:path*` catch-all drops any trailing slash when it
      // reconstructs the destination URL (e.g. a request to
      // /api/v1/auth/login/ is proxied upstream as .../auth/login, with no
      // trailing slash). Every Django/DRF route in this project requires a
      // trailing slash, so the backend's APPEND_SLASH middleware then
      // 301-redirects back to the exact path the browser already requested
      // -- an infinite loop (ERR_TOO_MANY_REDIRECTS) since the round trip
      // repeats forever. Appending the slash explicitly here restores it.
      {
        source: "/api/v1/:path*",
        destination: `${destinationBase}/api/v1/:path*/`,
      },
    ];
  },
};

export default nextConfig;
