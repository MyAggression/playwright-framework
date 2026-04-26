import { test, expect } from '@playwright/test';

// reqres.in now requires an API key — switched to dummyjson.com (free, no key needed)
const BASE = 'https://dummyjson.com';
const VALID_USERNAME = 'emilys';
const VALID_PASSWORD = 'emilyspass';

test.describe('POST /auth/login', () => {
  test('valid credentials return token and user data', async ({ request }) => {
    const start = Date.now();
    const response = await request.post(`${BASE}/auth/login`, {
      data: { username: VALID_USERNAME, password: VALID_PASSWORD, expiresInMins: 30 },
    });
    const elapsed = Date.now() - start;

    expect(response.status()).toBe(200);
    expect(elapsed).toBeLessThan(2_000);
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.json();
    // dummyjson.com returns accessToken (not token)
    expect(typeof body.accessToken).toBe('string');
    expect(body.accessToken.length).toBeGreaterThan(0);
    expect(typeof body.id).toBe('number');
    expect(typeof body.username).toBe('string');
  });

  test('wrong password returns 400 with error message', async ({ request }) => {
    const response = await request.post(`${BASE}/auth/login`, {
      data: { username: VALID_USERNAME, password: 'wrongpassword' },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('message');
    expect(typeof body.message).toBe('string');
  });

  test('non-existent username returns 400', async ({ request }) => {
    const response = await request.post(`${BASE}/auth/login`, {
      data: { username: 'nonexistentuser999', password: VALID_PASSWORD },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('message');
  });

  test('missing password returns 400', async ({ request }) => {
    const response = await request.post(`${BASE}/auth/login`, {
      data: { username: VALID_USERNAME },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(typeof body.message).toBe('string');
  });

  test('missing username returns 400', async ({ request }) => {
    const response = await request.post(`${BASE}/auth/login`, {
      data: { password: VALID_PASSWORD },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('GET /auth/me — token validation', () => {
  test('valid token returns authenticated user profile', async ({ request }) => {
    const loginResponse = await request.post(`${BASE}/auth/login`, {
      data: { username: VALID_USERNAME, password: VALID_PASSWORD, expiresInMins: 30 },
    });
    const { accessToken: token } = await loginResponse.json();

    const start = Date.now();
    const response = await request.get(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const elapsed = Date.now() - start;

    expect(response.status()).toBe(200);
    expect(elapsed).toBeLessThan(2_000);
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.json();
    expect(typeof body.id).toBe('number');
    expect(typeof body.username).toBe('string');
    expect(typeof body.email).toBe('string');
  });

  test('missing token returns 401', async ({ request }) => {
    const response = await request.get(`${BASE}/auth/me`);
    expect(response.status()).toBe(401);
  });

  test('invalid token returns 401', async ({ request }) => {
    const response = await request.get(`${BASE}/auth/me`, {
      headers: { Authorization: 'Bearer this.is.not.a.valid.token' },
    });
    expect(response.status()).toBe(401);
  });
});
