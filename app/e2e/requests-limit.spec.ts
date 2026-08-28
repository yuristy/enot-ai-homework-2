import { expect, test } from '@playwright/test';

test('guest can post one request per day, second attempt is blocked', async ({ page }) => {
  await page.goto('/requests');

  await page.getByLabel(/Комментарий/).fill('Ищу фотографа на выходные, пишите в телеграм @test');
  await page.getByRole('button', { name: 'Опубликовать заявку' }).click();

  // Scoped to <main>: the same text also appears in the success toast
  // (rendered outside <main>, see components/Toast.tsx) — an unscoped
  // getByText would resolve to both and fail Playwright's strict mode.
  await expect(page.getByRole('main').getByText('Заявка опубликована.')).toBeVisible();
  await expect(page.locator('.card').first()).toContainText('Ищу фотографа на выходные');

  await page.getByLabel(/Комментарий/).fill('Вторая заявка в тот же день');
  await page.getByRole('button', { name: 'Опубликовать заявку' }).click();

  await expect(page.getByText('Дневной лимит исчерпан. Войдите, чтобы добавлять до 5 в день.')).toBeVisible();
});
