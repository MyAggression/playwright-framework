import { test, expect } from '@playwright/test';

const BASE = 'https://reqres.in/api';

// reqres.in valid credentials for login
const VALID_EMAIL = 'eve.holt@reqres.in';
const VALID_PASSWORD = 'cityslicka';

// reqres.in valid credentials for register
const REGISTER_EMAIL = 'eve.holt@reqres.in';
const REGISTER_PASSWORD = 'pistol';

test.describe('POST /login', () => {
  test('valid credentials return token with status 200', async ({ request }) => {
    const start = Date.now();
    const response = await request.post(`${BASE}/login`, {
      data: { email: VALID_EMAIL, password: VALID_PASSWORD },
    });
    const elapsed = Date.now() - start;

    expect(response.status()).toBe(200);
    expect(elapsed).toBeLessThan(2_000);
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.json();
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(0);
  });

  test('missing password returns 400 with error message', async ({ request }) => {
    const response = await request.post(`${BASE}/login`, {
      data: { email: VALID_EMAIL },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  test('wrong credentials return 400', async ({ request }) => {
    const response = await request.post(`${BASE}/login`, {
      data: { email: VALID_EMAIL, password: 'wrongpassword' },
    });

    expect(response.status()).toBe(400);
  });

  test('missing email returns 400', async ({ request }) => {
    const response = await request.post(`${BASE}/login`, {
      data: { password: VALID_PASSWORD },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toContain('Missing email or username');
  });
});

test.describe('POST /register', () => {
  test('valid registration returns id and token', async ({ request }) => {
    const start = Date.now();
    const response = await request.post(`${BASE}/register`, {
      data: { email: REGISTER_EMAIL, password: REGISTER_PASSWORD },
    });
    const elapsed = Date.now() - start;

    expect(response.status()).toBe(200);
    expect(elapsed).toBeLessThan(2_000);
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.json();
    expect(typeof body.id).toBe('number');
    expect(typeof body.token).toBe('string');
  });

  test('missing password returns 400', async ({ request }) => {
    const response = await request.post(`${BASE}/register`, {
      data: { email: REGISTER_EMAIL },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('missing email returns 400', async ({ request }) => {
    const response = await request.post(`${BASE}/register`, {
      data: { password: REGISTER_PASSWORD },
    });

    expect(response.status()).toBe(400);
  });

  test('non-registered email returns 400', async ({ request }) => {
    const response = await request.post(`${BASE}/register`, {
      data: { email: 'not.registered@example.com', password: 'password123' },
    });

    expect(response.status()).toBe(400);
  });
});
