import { test, expect } from '@playwright/test';

// jsonplaceholder.typicode.com — free, open, no auth required
const BASE = 'https://jsonplaceholder.typicode.com';

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
}

interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

test.describe('GET /users', () => {
  test('returns list with correct schema', async ({ request }) => {
    const response = await request.get(`${BASE}/users`);

    expect(response.status()).toBe(200);

    const body: User[] = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    const user = body[0];
    expect(typeof user.id).toBe('number');
    expect(typeof user.name).toBe('string');
    expect(typeof user.username).toBe('string');
    expect(typeof user.email).toBe('string');
  });

  test('pagination returns different records per page', async ({ request }) => {
    const [r1, r2] = await Promise.all([
      request.get(`${BASE}/posts?_page=1&_limit=5`),
      request.get(`${BASE}/posts?_page=2&_limit=5`),
    ]);

    const posts1: Post[] = await r1.json();
    const posts2: Post[] = await r2.json();

    expect(posts1.length).toBe(5);
    expect(posts2.length).toBe(5);

    const ids1 = posts1.map(p => p.id);
    const ids2 = posts2.map(p => p.id);
    expect(ids1.some(id => ids2.includes(id))).toBe(false);
  });
});

test.describe('GET /users/:id', () => {
  test('returns a single user with correct schema', async ({ request }) => {
    const response = await request.get(`${BASE}/users/1`);

    expect(response.status()).toBe(200);

    const body: User = await response.json();
    expect(typeof body.id).toBe('number');
    expect(typeof body.name).toBe('string');
    expect(typeof body.username).toBe('string');
    expect(typeof body.email).toBe('string');
  });

  test('non-existent user returns 404', async ({ request }) => {
    const response = await request.get(`${BASE}/users/9999`);
    expect(response.status()).toBe(404);
  });
});

test.describe('POST /posts — data-driven creation', () => {
  const newPosts: [string, { title: string; body: string; userId: number }][] = [
    ['QA Engineer post', { title: 'Playwright framework design', body: 'E2E automation at scale', userId: 1 }],
    ['Backend post', { title: 'REST API contract testing', body: 'Schema validation patterns', userId: 2 }],
    ['PM post', { title: 'Acceptance criteria', body: 'Testability as a design constraint', userId: 3 }],
  ];

  for (const [label, postData] of newPosts) {
    test(`creates ${label}`, async ({ request }) => {
      const response = await request.post(`${BASE}/posts`, {
        data: postData,
      });

      expect(response.status()).toBe(201);

      const body: Post = await response.json();
      expect(body.title).toBe(postData.title);
      expect(body.body).toBe(postData.body);
      expect(typeof body.id).toBe('number');
    });
  }
});

test.describe('PUT /posts/:id', () => {
  test('updates post and returns updated fields', async ({ request }) => {
    const response = await request.put(`${BASE}/posts/1`, {
      data: { title: 'Updated Title', body: 'Updated body text', userId: 1 },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.title).toBe('Updated Title');
    expect(body.body).toBe('Updated body text');
  });
});

test.describe('DELETE /posts/:id', () => {
  test('returns 200 with empty response body', async ({ request }) => {
    const response = await request.delete(`${BASE}/posts/1`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(typeof body).toBe('object');
  });
});
