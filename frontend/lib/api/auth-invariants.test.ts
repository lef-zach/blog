import { ApiClient } from './client';

const mockFetch = global.fetch as jest.Mock;

describe('Auth Invariants', () => {
    let client: ApiClient;

    beforeEach(() => {
        mockFetch.mockReset();
        client = new ApiClient();
    });

    it('Mutex: Concurrent requests trigger only 1 refresh and retry with new token', async () => {
        (client as any).accessToken = 'expired-token';

        // 1. Initial Failures
        mockFetch.mockResolvedValueOnce({ status: 401, ok: false, json: () => ({ error: { code: 'UNAUTHORIZED' } }) });
        mockFetch.mockResolvedValueOnce({ status: 401, ok: false, json: () => ({ error: { code: 'UNAUTHORIZED' } }) });

        // 2. Refresh Success
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { accessToken: 'new-token' } }) });

        // 3. Retries Success
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => ({ data: 'OK-A' }) });
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => ({ data: 'OK-B' }) });

        const reqA = client.request('/resource-a');
        const reqB = client.request('/resource-b');

        await Promise.all([reqA, reqB]);

        const calls = mockFetch.mock.calls;

        // Log all calls
        console.log('--- CALLS START ---');
        calls.forEach((c, i) => {
            console.log(`[${i}] ${c[0]} | Auth: ${c[1]?.headers?.Authorization}`);
        });
        console.log('--- CALLS END ---');

        expect(calls.length).toBe(5);

        // Index 0: First URL (expired)
        expect(calls[0][1].headers.Authorization).toContain('expired-token');

        // Index 1: Second URL (expired)
        expect(calls[1][1].headers.Authorization).toContain('expired-token');

        // Index 2: Refresh (undefined auth usually, or cookie)
        // Refresh call might not have Authorization header, or it might have cookie
        expect(calls[2][0]).toContain('/auth/refresh');

        // Index 3: Retry 1 (new-token)
        expect(calls[3][1].headers.Authorization).toContain('new-token');

        // Index 4: Retry 2 (new-token)
        expect(calls[4][1].headers.Authorization).toContain('new-token');
    });
});
