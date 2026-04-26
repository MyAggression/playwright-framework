import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

const PAGE_URL = 'https://the-internet.herokuapp.com/login';

export class LoginPage extends BasePage {
  private readonly usernameInput = this.page.locator('#username');
  private readonly passwordInput = this.page.locator('#password');
  private readonly submitButton = this.page.locator('button[type="submit"]');
  private readonly flashMessage = this.page.locator('#flash');
  private readonly logoutLink = this.page.getByRole('link', { name: 'Logout' });
  private readonly secureHeading = this.page.locator('h2');

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto(PAGE_URL);
    await this.waitForPageLoad();
  }

  /**
   * Log in and wait for the page to settle after navigation.
   */
  async login(username: string, password: string): Promise<void> {
    await this.fillAndVerify(this.usernameInput, username);
    await this.fillAndVerify(this.passwordInput, password);
    await this.submitButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Submit credentials and return the flash message text.
   * Use when the login is expected to fail.
   */
  async loginExpectError(username: string, password: string): Promise<string> {
    await this.fillAndVerify(this.usernameInput, username);
    await this.fillAndVerify(this.passwordInput, password);
    await this.submitButton.click();
    await expect(this.flashMessage).toBeVisible();
    return (await this.flashMessage.textContent()) ?? '';
  }

  /**
   * Click logout from the secure area page.
   */
  async logout(): Promise<void> {
    await this.logoutLink.click();
    await this.waitForPageLoad();
  }

  /**
   * Returns true when the secure area heading is visible.
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      await expect(this.secureHeading).toContainText('Secure Area', { timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }
}
