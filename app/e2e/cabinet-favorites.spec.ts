import { expect, test } from '@playwright/test';

test('guest signs up, sets a role, and sees an empty cabinet', async ({ page }) => {
  const email = `test-${Date.now()}@example.com`;

  await page.goto('/cabinet');
  await expect(page.getByText(/Кабинет нужен/)).toBeVisible();

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill('correct horse battery staple');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();

  await expect(page.getByRole('heading', { name: 'Кабинет' })).toBeVisible();

  await page.getByLabel('Я фотограф').check();
  await page.getByRole('button', { name: 'Сохранить профиль' }).click();

  await expect(page.getByText('Пока пусто — добавляйте места в избранное с карты.')).toBeVisible();
  await expect(page.getByText('Сохранённых маршрутов пока нет.')).toBeVisible();
});
