/**
 * Security boundary tests — API layer
 *
 * Classes of vulnerabilities covered:
 *   - IDOR (Insecure Direct Object Reference)
 *   - Privilege escalation
 *   - Broken authentication (invalid/expired JWT)
 *   - Mass assignment (injected privilege fields)
 *   - Rate limiting
 *   - Input validation (SQL injection, XSS, oversized payload)
 *
 * Implementation note on mocking:
 *   Playwright's APIRequestContext (request fixture) bypasses page.route() by design —
 *   it makes requests directly from Node.js, not from the browser.
 *   For tests that need route interception, we use page.route() + page.evaluate(fetch())
 *   so the browser-level fetch is intercepted before the request hits the network.
 */

import { test, expect } from '@playwright/test';

// Fake host for mocked tests — intercepted by page.route() before DNS resolution
const MOCK = 'https://api.mock.test';

// Real APIs for non-mocked tests
const AUTH_API = 'https://dummyjson.com';
const CRUD_API = 'https://jsonplaceholder.typicode.com';

test.describe('IDOR — Insecure Direct Object Reference', () => {
  test('request with foreign user token returns 403 (mocked enforcement)', async ({ page }) => {
    await page.route(`${MOCK}/users/2`, route => {
      const auth = route.request().headers()['authorization'] ?? '';
      if (!auth || auth === 'Bearer user-1-token') {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ error: 'Access denied: resource belongs to another user' }),
        });
      } else {
        route.continue();
      }
    });

    const result = await page.evaluate(async (url: string) => {
      const res = await fetch(url, { headers: { Authorization: 'Bearer user-1-token' } });
      return { status: res.status, body: await res.json() };
    }, `${MOCK}/users/2`);

    expect(result.status).toBe(403);
    expect(result.body.error).toContain('Access denied');
  });

  test('unauthenticated request to protected resource returns 401 (mocked enforcement)', async ({ page }) => {
    await page.route(`${MOCK}/users/1`, route => {
      const auth = route.request().headers()['authorization'];
      if (!auth) {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      } else {
        route.continue();
      }
    });

    const result = await page.evaluate(async (url: string) => {
      const res = await fetch(url);
      return { status: res.status };
    }, `${MOCK}/users/1`);

    expect(result.status).toBe(401);
  });
});

test.describe('Broken authentication — JWT handling', () => {
  test('request with invalid JWT returns 401 (mocked enforcement)', async ({ page }) => {
    await page.route(`${MOCK}/protected`, route => {
      const auth = route.request().headers()['authorization'] ?? '';
      const valid = auth.startsWith('Bearer ') && auth.split('.').length === 3;
      route.fulfill({
        status: valid ? 200 : 401,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(valid ? { data: 'ok' } : { error: 'Invalid token' }),
      });
    });

    const result = await page.evaluate(async (url: string) => {
      const res = await fetch(url, { headers: { Authorization: 'Bearer invalid' } });
      return { status: res.status };
    }, `${MOCK}/protected`);

    expect(result.status).toBe(401);
  });

  test('request with expired token returns 401 (mocked enforcement)', async ({ page }) => {
    await page.route(`${MOCK}/protected`, route => {
      const auth = route.request().headers()['authorization'] ?? '';
      const expired = auth.includes('expired');
      route.fulfill({
        status: expired ? 401 : 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(expired ? { error: 'Token expired' } : { data: 'ok' }),
      });
    });

    const result = await page.evaluate(async (url: string) => {
      const res = await fetch(url, { headers: { Authorization: 'Bearer expired.jwt.token' } });
      return { status: res.status };
    }, `${MOCK}/protected`);

    expect(result.status).toBe(401);
  });

  test('real API rejects missing auth token with 401', async ({ request }) => {
    const response = await request.get(`${AUTH_API}/auth/me`);
    expect(response.status()).toBe(401);
  });
});

test.describe('Privilege escalation', () => {
  test('admin endpoint without credentials returns 403 (mocked enforcement)', async ({ page }) => {
    await page.route(`${MOCK}/admin/**`, route => {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ error: 'Insufficient permissions' }),
      });
    });

    const result = await page.evaluate(async (url: string) => {
      const res = await fetch(url);
      return { status: res.status };
    }, `${MOCK}/admin/users`);

    expect(result.status).toBe(403);
  });
});

test.describe('Mass assignment', () => {
  // jsonplaceholder echoes all fields including injected ones — no protection by design.
  // We use page.route() to simulate a properly implemented server that strips unknown fields.
  test('PATCH with role escalation fields stripped by server (mocked enforcement)', async ({ page }) => {
    await page.route(`${MOCK}/posts/1`, route => {
      if (route.request().method() === 'PATCH') {
        // Proper implementation: only return recognised fields, drop the rest
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ id: 1, title: 'Regular Update', userId: 1 }),
        });
      } else {
        route.continue();
      }
    });

    const result = await page.evaluate(async (url: string) => {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Regular Update',
          role: 'admin',
          is_admin: true,
          permissions: ['delete', 'manage_users'],
        }),
      });
      return { status: res.status, body: await res.json() };
    }, `${MOCK}/posts/1`);

    expect(result.status).toBe(200);
    expect(result.body).not.toHaveProperty('role', 'admin');
    expect(result.body).not.toHaveProperty('is_admin');
    expect(result.body).not.toHaveProperty('permissions');
  });
});

test.describe('Rate limiting', () => {
  test('10 rapid requests do not cause server errors', async ({ request }) => {
    const requests = Array.from({ length: 10 }, () =>
      request.get(`${CRUD_API}/users`)
    );
    const responses = await Promise.all(requests);
    const statuses = responses.map(r => r.status());

    expect(statuses.every(s => s < 500)).toBe(true);

    const rateLimited = statuses.some(s => s === 429);
    if (!rateLimited) {
      console.warn('[security] API does not enforce rate limiting — flag for production review');
    }
  });
});

test.describe('Input validation', () => {
  test('SQL injection in credential fields returns 4xx, not 500', async ({ request }) => {
    const response = await request.post(`${AUTH_API}/auth/login`, {
      data: {
        username: "' OR '1'='1'--",
        password: 'anypassword',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('XSS payload in credentials returns 4xx, not 500', async ({ request }) => {
    const response = await request.post(`${AUTH_API}/auth/login`, {
      data: {
        username: '<script>alert(document.cookie)</script>',
        password: 'password123',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('oversized payload returns 4xx, not 500', async ({ request }) => {
    const response = await request.post(`${AUTH_API}/auth/login`, {
      data: {
        username: 'a'.repeat(10_000),
        password: 'b'.repeat(10_000),
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });
});
