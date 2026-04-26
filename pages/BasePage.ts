import { Page, Locator, expect } from '@playwright/test';

/**
 * Abstract base for all Page Object classes.
 * Provides shared navigation, wait, and interaction patterns
 * so subclasses stay focused on page-specific actions only.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Navigate to the page's canonical URL.
   * Each subclass defines its own URL.
   */
  abstract navigate(): Promise<void>;

  /**
   * Wait for the page to reach a stable loaded state.
   * Uses 'domcontentloaded' to avoid blocking on slow third-party scripts.
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Return the current document title.
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Wait for a locator to be visible, with an optional custom timeout.
   * @param locator - Playwright locator to wait for
   * @param timeout - Override timeout in ms (uses global expect.timeout if omitted)
   */
  async waitForElement(locator: Locator, timeout?: number): Promise<void> {
    await expect(locator).toBeVisible(timeout !== undefined ? { timeout } : undefined);
  }

  /**
   * Fill an input and assert the value was accepted.
   * Catches autofill interference and masked input edge cases.
   * @param locator - Target input locator
   * @param value - Value to type
   */
  async fillAndVerify(locator: Locator, value: string): Promise<void> {
    await locator.fill(value);
    await expect(locator).toHaveValue(value);
  }
}
