import * as path from 'path';

export interface UserData {
  email: string;
  password: string;
  name: string;
}

export interface TodoData {
  text: string;
}

/** Generate a user with guaranteed-unique email using timestamp. */
export function generateUser(): UserData {
  const id = Date.now();
  return {
    email: `test.user.${id}@example.com`,
    password: `Pass${id}!`,
    name: `Test User ${id}`,
  };
}

/** Generate a unique todo item text. */
export function generateTodo(): TodoData {
  return {
    text: `Task created at ${Date.now()}`,
  };
}

export const validCredentials = {
  username: 'tomsmith',
  password: 'SuperSecretPassword!',
  email: 'eve.holt@reqres.in',
  apiPassword: 'cityslicka',
} as const;

export const invalidCredentials = {
  username: 'nonexistent_user',
  password: 'wrong_password_123',
  email: 'not.a.user@example.com',
} as const;

export const sqlInjectionPayloads: string[] = [
  "' OR '1'='1'--",
  "'; DROP TABLE users;--",
  "1 UNION SELECT * FROM users--",
];

export const xssPayloads: string[] = [
  '<script>alert(document.cookie)</script>',
  '<img src=x onerror=alert(1)>',
  'javascript:alert(document.domain)',
];

export const fileFixtures = {
  png: path.join(__dirname, '../test-data/sample.png'),
  pdf: path.join(__dirname, '../test-data/sample.pdf'),
  exe: path.join(__dirname, '../test-data/sample.exe'),
} as const;
