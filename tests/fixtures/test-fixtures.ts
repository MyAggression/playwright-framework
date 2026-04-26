import { test as base, expect, APIRequestContext, Page } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

type CustomFixtures = {
  /** A Page that has already completed login. Authentication is done via UI. */
  authenticatedPage: Page;
  /** A pre-configured APIRequestContext pointing at reqres.in with JSON headers. */
  apiContext: APIRequestContext;
  /** Cleanup hook: clears TodoMVC localStorage after the test. */
  cleanupTodos: void;
};

export const test = base.extend<CustomFixtures>({
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('tomsmith', 'SuperSecretPassword!');

    await use(page);
    await context.close();
  },

  apiContext: async ({ playwright }, use) => {
    const apiContext = await playwright.request.newContext({
      baseURL: 'https://reqres.in',
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    await use(apiContext);
    await apiContext.dispose();
  },

  cleanupTodos: [
    async ({ page }, use) => {
      await use();
      await page.evaluate(() => {
        // TodoMVC implementations vary in localStorage key
        ['todos-vanillajs', 'todos-react', 'todos-vue', 'todos-angular'].forEach(key =>
          localStorage.removeItem(key)
        );
      });
    },
    { auto: false },
  ],
});

export { expect };
