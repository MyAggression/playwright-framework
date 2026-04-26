import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

const VALID_USERNAME = 'tomsmith';
const VALID_PASSWORD = 'SuperSecretPassword!';

test.describe('Authentication flows', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
  });

  test.describe('Login — data-driven', () => {
    const cases: [string, string, string, boolean, string | null][] = [
      ['valid credentials',        VALID_USERNAME,           VALID_PASSWORD,     true,  null],
      ['wrong password',           VALID_USERNAME,           'wrongpassword',    false, 'Your password is invalid!'],
      ['non-existent user',        'unknown_user',           VALID_PASSWORD,     false, 'Your username is invalid!'],
      ['empty username',           '',                       VALID_PASSWORD,     false, 'Your username is invalid!'],
      ['empty password',           VALID_USERNAME,           '',                 false, 'Your password is invalid!'],
      ['SQL injection in username', "' OR '1'='1'--",        'any',              false, 'Your username is invalid!'],
      ['XSS attempt in username',  '<script>alert(1)</script>', 'any',           false, 'Your username is invalid!'],
    ];

    for (const [scenario, username, password, expectSuccess, expectedError] of cases) {
      test(`${scenario}`, async () => {
        if (expectSuccess) {
          await loginPage.login(username, password);
          expect(await loginPage.isLoggedIn()).toBe(true);
        } else {
          const errorText = await loginPage.loginExpectError(username, password);
          expect(errorText).toContain(expectedError!);
        }
      });
    }
  });

  test('redirects to secure area after successful login', async ({ page }) => {
    await loginPage.login(VALID_USERNAME, VALID_PASSWORD);
    await expect(page).toHaveURL(/\/secure/);
  });

  test('session cookie is set after login', async ({ page, context }) => {
    await loginPage.login(VALID_USERNAME, VALID_PASSWORD);
    const cookies = await context.cookies();
    expect(cookies.length).toBeGreaterThan(0);
  });

  test.describe('Session management', () => {
    test('logged-in state persists on reload', async ({ page }) => {
      await loginPage.login(VALID_USERNAME, VALID_PASSWORD);
      expect(await loginPage.isLoggedIn()).toBe(true);
      await page.reload();
      await expect(page).toHaveURL(/\/secure/);
    });

    test('logout redirects back to login page', async ({ page }) => {
      await loginPage.login(VALID_USERNAME, VALID_PASSWORD);
      await loginPage.logout();
      await expect(page).toHaveURL(/\/login/);
    });

    test('accessing secure area after logout is not possible', async ({ page }) => {
      await loginPage.login(VALID_USERNAME, VALID_PASSWORD);
      await loginPage.logout();
      await page.goto('https://the-internet.herokuapp.com/secure');
      await expect(page).not.toHaveURL(/\/secure$/);
    });
  });
});
