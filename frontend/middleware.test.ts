import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';

import { middleware } from './middleware';

function requestWithCookies(path: string, cookieHeader?: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
}

describe('middleware', () => {
  it('allows the request through when refresh_token is present', () => {
    const response = middleware(requestWithCookies('/dashboard', 'refresh_token=still-valid'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects to /login when refresh_token is absent', () => {
    const response = middleware(requestWithCookies('/dashboard'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login');
  });

  it('does not bounce a request whose access_token is missing/expired as long as refresh_token is present -- this is the new-tab-after-15-minutes bug this middleware fixes', () => {
    const response = middleware(
      requestWithCookies('/dashboard/customers', 'refresh_token=still-valid')
    );

    expect(response.status).toBe(200);
  });
});
