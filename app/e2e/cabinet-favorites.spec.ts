import { expect, test } from '@playwright/test';

test('guest signs up, sets a role, and sees an empty cabinet', async ({ page }) => {
  const email = `test-${Date.now()}@example.com`;

  await page.goto('/cabinet');
  await expect(page.getByText(/Кабинет нужен/)).toBeVisible();

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill('correct horse battery staple');
  // Same real, narrow race documented in golden-path.spec.ts: AuthProvider's
  // onAuthStateChange reacts to the 'USER_UPDATED' event updateUser() fires
  // synchronously as part of its own optimistic response, which can flip
  // isAnonymous (and render the "Кабинет" heading) before SignUpForm's
  // explicit refreshSession() call has actually landed the new JWT claim —
  // a plain .click() here was reachable by this test at a ~80% flake rate.
  // Waiting for the real token-refresh response, not just the heading,
  // proves the session is genuinely upgraded before anything RLS-gated runs.
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/v1/token?grant_type=refresh_token')),
    page.getByRole('button', { name: 'Зарегистрироваться' }).click(),
  ]);

  await expect(page.getByRole('heading', { name: 'Кабинет' })).toBeVisible();

  await page.getByLabel('Я фотограф').check();
  // toHaveCount(0) on the alert would pass trivially before the async upsert
  // even completes (no alert has ever been rendered yet) — waiting on the
  // actual network response is what proves the save round-trip finished
  // before reload() runs, otherwise reload() can cut the request off mid-flight.
  const [saveResponse] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/rest/v1/profiles') && res.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Сохранить профиль' }).click(),
  ]);
  expect(saveResponse.ok()).toBeTruthy();

  // Profile actually persisted server-side and is re-hydrated correctly on
  // reload — regression guard for the anonymous->registered RLS fix, and for
  // the ProfileForm-doesn't-reflect-the-loaded-profile bug found in review.
  await page.reload();
  await expect(page.getByLabel('Я фотограф')).toBeChecked();

  await expect(page.getByText('Пока пусто — добавляйте места в избранное с карты.')).toBeVisible();
  await expect(page.getByText('Сохранённых маршрутов пока нет.')).toBeVisible();
});
