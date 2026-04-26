import { test, expect } from '@playwright/test';
import * as path from 'path';
import { FormsPage } from '../../pages/FormsPage';

const FIXTURE_FILE = path.join(__dirname, '../../test-data/sample.png');

type FormInput = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  gender: 'Male' | 'Female' | 'Other';
};

test.describe('demoqa.com — Automation Practice Form', () => {
  let formsPage: FormsPage;

  test.beforeEach(async ({ page }) => {
    formsPage = new FormsPage(page);
    await formsPage.navigate();
  });

  test.describe('Happy path — data-driven', () => {
    const formDataSets: [string, FormInput][] = [
      [
        'male user',
        { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', mobile: '1234567890', gender: 'Male' },
      ],
      [
        'female user',
        { firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com', mobile: '9876543210', gender: 'Female' },
      ],
      [
        'other gender user',
        { firstName: 'Alex', lastName: 'Morgan', email: 'alex@example.com', mobile: '5551234567', gender: 'Other' },
      ],
    ];

    for (const [scenario, data] of formDataSets) {
      test(`submits form for ${scenario}`, async () => {
        await formsPage.fillPersonalInfo(data.firstName, data.lastName, data.email, data.mobile);
        await formsPage.selectGender(data.gender);
        await formsPage.submit();
        await formsPage.waitForConfirmation();

        const confirmation = await formsPage.getConfirmationData();
        expect(confirmation['Student Name']).toContain(data.firstName);
        expect(confirmation['Student Name']).toContain(data.lastName);
        expect(confirmation['Student Email']).toBe(data.email);
        expect(confirmation['Gender']).toBe(data.gender);
        expect(confirmation['Mobile']).toBe(data.mobile);
      });
    }
  });

  test('required fields show validation errors on empty submit', async ({ page }) => {
    await formsPage.submit();

    // Required fields get a red border via Bootstrap is-invalid class
    const firstNameInput = page.locator('#firstName');
    await expect(firstNameInput).toHaveClass(/is-invalid|required/);
  });

  test('uploaded file name appears in confirmation', async () => {
    await formsPage.fillPersonalInfo('Upload', 'Test', 'upload@example.com', '1112223333');
    await formsPage.selectGender('Male');
    await formsPage.uploadFile(FIXTURE_FILE);
    await formsPage.submit();
    await formsPage.waitForConfirmation();

    const confirmation = await formsPage.getConfirmationData();
    expect(confirmation['Picture']).toContain('sample.png');
  });
});
