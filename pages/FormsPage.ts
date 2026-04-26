import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

const PAGE_URL = 'https://demoqa.com/automation-practice-form';

type GenderOption = 'Male' | 'Female' | 'Other';

export class FormsPage extends BasePage {
  private readonly firstNameInput = this.page.locator('#firstName');
  private readonly lastNameInput = this.page.locator('#lastName');
  private readonly emailInput = this.page.locator('#userEmail');
  private readonly mobileInput = this.page.locator('#userNumber');
  private readonly dobInput = this.page.locator('#dateOfBirthInput');
  private readonly fileUploadInput = this.page.locator('#uploadPicture');
  private readonly submitButton = this.page.locator('#submit');
  private readonly confirmationModal = this.page.locator('#example-modal-sizes-title-lg');
  private readonly confirmationTable = this.page.locator('.table-responsive');

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto(PAGE_URL);
    await this.waitForPageLoad();
    // Dismiss any ad overlays that demoqa.com may inject
    await this.page.evaluate(() => {
      document.querySelectorAll('#fixedban, #adplus-anchor').forEach(el => el.remove());
    });
  }

  /**
   * Fill the personal info section of the form.
   */
  async fillPersonalInfo(firstName: string, lastName: string, email: string, mobile: string): Promise<void> {
    await this.fillAndVerify(this.firstNameInput, firstName);
    await this.fillAndVerify(this.lastNameInput, lastName);
    await this.fillAndVerify(this.emailInput, email);
    await this.fillAndVerify(this.mobileInput, mobile);
  }

  /**
   * Select a gender radio button by clicking its visible label.
   * The actual radio inputs are hidden; labels are interactive.
   */
  async selectGender(gender: GenderOption): Promise<void> {
    await this.page.locator(`.custom-radio label`).filter({ hasText: gender }).click();
  }

  /**
   * Set the date of birth via the datepicker input.
   * Clears the field and types the date directly (avoids calendar navigation).
   */
  async setDateOfBirth(date: string): Promise<void> {
    await this.dobInput.click();
    await this.dobInput.selectText();
    await this.dobInput.fill(date);
    await this.dobInput.press('Escape');
  }

  /**
   * Upload a file via the hidden file input.
   * @param filePath - Absolute or relative path to the file
   */
  async uploadFile(filePath: string): Promise<void> {
    await this.fileUploadInput.setInputFiles(filePath);
  }

  /**
   * Submit the form by scrolling to the button and clicking.
   * Scroll is necessary because demoqa may have an ad footer covering the button.
   */
  async submit(): Promise<void> {
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click({ force: true });
    await expect(this.confirmationModal).toBeVisible();
  }

  /**
   * Extract key-value pairs from the confirmation table.
   * Returns a map like { 'Student Name': 'John Doe', 'Email': '...' }
   */
  async getConfirmationData(): Promise<Record<string, string>> {
    const rows = this.confirmationTable.locator('tbody tr');
    const count = await rows.count();
    const result: Record<string, string> = {};

    for (let i = 0; i < count; i++) {
      const cells = rows.nth(i).locator('td');
      const key = await cells.nth(0).textContent() ?? '';
      const value = await cells.nth(1).textContent() ?? '';
      result[key.trim()] = value.trim();
    }

    return result;
  }
}
