import { expect, test } from '@playwright/test';

test('home page loads the header', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Москва в кадре')).toBeVisible();
});
