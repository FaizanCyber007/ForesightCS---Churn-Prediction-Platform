import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { apiClient, ApiError, UNAUTHORIZED_EVENT } from './apiClient';

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

describe('apiClient 401 refresh-and-retry', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refreshes once and retries the original request after a 401', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'Not authenticated.' }))
      .mockResolvedValueOnce(jsonResponse(200, { user: { id: '1' } }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const result = await apiClient.get<{ ok: boolean }>('/api/v1/customers/');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain('/api/v1/auth/refresh/');
  });

  it('still retries the original request even when the refresh call itself fails (cross-tab race)', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const result = await apiClient.get<{ ok: boolean }>('/api/v1/customers/');

    expect(result).toEqual({ ok: true });
  });

  it('dispatches UNAUTHORIZED_EVENT and throws ApiError when the retry also 401s', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'Session expired.' }));

    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);

    await expect(apiClient.get('/api/v1/customers/')).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });

  it('does not attempt a refresh for a 401 from the login endpoint itself', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: 'Invalid credentials.' }));

    await expect(
      apiClient.post(
        '/api/v1/auth/login/',
        { identifier: 'x', password: 'y' },
        { skipAuthRedirect: true }
      )
    ).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not attempt a refresh or retry for a 401 when there is no browser window (server-side)', async () => {
    const originalWindow = globalThis.window;
    vi.stubGlobal('window', undefined);
    try {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(jsonResponse(401, { detail: 'Not authenticated.' }));

      await expect(apiClient.get('/api/v1/customers/')).rejects.toBeInstanceOf(ApiError);
      // Exactly one call: the original request. No refresh call, no retry.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.stubGlobal('window', originalWindow);
    }
  });
});
