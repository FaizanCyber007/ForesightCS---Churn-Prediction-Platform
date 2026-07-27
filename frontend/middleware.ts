import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * First line of defense for protected routes -- a presence-only check on
 * the refresh_token HttpOnly cookie (name mirrors
 * backend/core/authentication.py::REFRESH_TOKEN_COOKIE), run at the edge
 * before any page code executes.
 *
 * Deliberately checks refresh_token, NOT access_token: access_token has a
 * 15-minute max_age (backend/core/authentication.py), so the browser drops
 * it from its cookie jar well before a session is actually over. Gating on
 * it meant anyone who opened a protected link (e.g. a new tab) more than 15
 * minutes after their last request got bounced to /login by this
 * edge-level check BEFORE apiClient's client-side silent-refresh
 * (frontend/lib/apiClient.ts::request) ever got a chance to run.
 * refresh_token carries the real 7-day session lifetime, so its presence
 * is the correct proxy for "might still have a valid session."
 *
 * This still can't verify the token is still valid (that would mean either
 * shipping the JWT secret to the edge runtime or calling the backend on
 * every navigation, both more complexity than this needs); an
 * expired/invalid/blacklisted cookie is instead caught by AuthProvider's
 * real session check (`GET /api/v1/auth/me/`) and apiClient's global 401
 * handler, both of which redirect to /login too. Together: no logged-out
 * user ever sees a flash of protected content, and no stale-cookie session
 * gets stuck rendering an error state.
 */
const SESSION_COOKIE = 'refresh_token';

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (hasSession) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
