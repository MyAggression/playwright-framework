import { test, expect } from '@playwright/test';

const BASE = 'https://reqres.in/api';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string;
}

interface UserListResponse {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  data: User[];
}

interface CreatedUser {
  name: string;
  job: string;
  id: string;
  createdAt: string;
}

test.describe('GET /users', () => {
  test('returns paginated list with correct schema', async ({ request }) => {
    const response = await request.get(`${BASE}/users?page=1`);

    expect(response.status()).toBe(200);

    const body: UserListResponse = await response.json();
    expect(typeof body.page).toBe('number');
    expect(typeof body.per_page).toBe('number');
    expect(typeof body.total).toBe('number');
    expect(Array.isArray(body.data)).toBe(true);

    const user = body.data[0];
    expect(typeof user.id).toBe('number');
    expect(typeof user.email).toBe('string');
    expect(typeof user.first_name).toBe('string');
    expect(typeof user.last_name).toBe('string');
  });

  test('page 2 returns different users than page 1', async ({ request }) => {
    const [r1, r2] = await Promise.all([
      request.get(`${BASE}/users?page=1`),
      request.get(`${BASE}/users?page=2`),
    ]);

    const body1: UserListResponse = await r1.json();
    const body2: UserListResponse = await r2.json();

    expect(body1.page).toBe(1);
    expect(body2.page).toBe(2);

    const ids1 = body1.data.map(u => u.id);
    const ids2 = body2.data.map(u => u.id);
    const overlap = ids1.filter(id => ids2.includes(id));
    expect(overlap.length).toBe(0);
  });
});

test.describe('GET /users/:id', () => {
  test('returns a single user with correct schema', async ({ request }) => {
    const response = await request.get(`${BASE}/users/2`);

    expect(response.status()).toBe(200);

    const body = await response.json();
    const user: User = body.data;

    expect(typeof user.id).toBe('number');
    expect(typeof user.email).toBe('string');
    expect(typeof user.first_name).toBe('string');
    expect(typeof user.last_name).toBe('string');
    expect(typeof user.avatar).toBe('string');
  });

  test('non-existent user returns 404', async ({ request }) => {
    const response = await request.get(`${BASE}/users/9999`);
    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body).toEqual({});
  });
});

test.describe('POST /users — data-driven creation', () => {
  const newUsers = [
    { name: 'Alice', job: 'QA Engineer' },
    { name: 'Bob', job: 'Backend Developer' },
    { name: 'Carol', job: 'Product Manager' },
  ];

  for (const userData of newUsers) {
    test(`creates user: ${userData.name} (${userData.job})`, async ({ request }) => {
      const response = await request.post(`${BASE}/users`, {
        data: userData,
      });

      expect(response.status()).toBe(201);

      const body: CreatedUser = await response.json();
      expect(body.name).toBe(userData.name);
      expect(body.job).toBe(userData.job);
      expect(typeof body.id).toBe('string');
      expect(typeof body.createdAt).toBe('string');
    });
  }
});

test.describe('PUT /users/:id', () => {
  test('updates user and returns updatedAt timestamp', async ({ request }) => {
    const response = await request.put(`${BASE}/users/2`, {
      data: { name: 'Updated Name', job: 'Senior SDET' },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.name).toBe('Updated Name');
    expect(body.job).toBe('Senior SDET');
    expect(typeof body.updatedAt).toBe('string');
  });
});

test.describe('DELETE /users/:id', () => {
  test('returns 204 with empty body', async ({ request }) => {
    const response = await request.delete(`${BASE}/users/2`);

    expect(response.status()).toBe(204);
    expect(await response.text()).toBe('');
  });
});
