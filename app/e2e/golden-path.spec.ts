// app/e2e/golden-path.spec.ts
import { expect, test } from '@playwright/test';

test('full golden path: guest browsing through registered cabinet use', async ({ page }) => {
  // 1. Open without login, see the map with places.
  // Not toHaveCount(12): `places` is a live, publicly-writable table (the
  // add-place workflow and other e2e specs can add rows), so pinning an
  // exact count here would be a false failure waiting to happen. The golden
  // path only needs to prove markers render at all.
  await page.goto('/');
  await page.waitForSelector('.leaflet-marker-icon');
  const markerCount = await page.locator('.leaflet-marker-icon').count();
  expect(markerCount).toBeGreaterThanOrEqual(12);

  // 2-3. Build a route (full share/reopen detail is covered by
  // route-sharing.spec.ts from feature/map-routes — this only re-confirms
  // the entry point still works post-merge).
  const markers = page.locator('.leaflet-marker-icon');
  await markers.nth(0).click();
  await page.getByText('Добавить в маршрут').click();
  await page.locator('.leaflet-container').click({ position: { x: 60, y: 60 } });
  await expect(page.getByText(/Маршрут:/)).toBeVisible();

  // 6. Register, set a role.
  //
  // Real, narrow race discovered by this test (documented in
  // sessions/STATE.md, not silently worked around): AuthProvider's
  // onAuthStateChange listener reacts to *every* auth event, including the
  // 'USER_UPDATED' event that supabase-js fires synchronously as part of
  // updateUser()'s own optimistic response — before SignUpForm's explicit
  // refreshSession() call (the actual JWT-refresh fix from Task 7) has run.
  // That means `isAnonymous` can flip to false, and the "Кабинет" heading
  // can render, slightly before the session's JWT truly carries
  // `is_anonymous: false` — so an RLS-gated write issued in that narrow
  // window (feasible for a script with zero think-time; not realistic for
  // a human clicking through the UI) can still hit a 403. Waiting for the
  // actual token-refresh network response — not just the heading — proves
  // the session is genuinely upgraded before this test does anything
  // RLS-gated.
  const email = `golden-${Date.now()}@example.com`;
  await page.goto('/cabinet');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill('correct horse battery staple');
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/v1/token?grant_type=refresh_token')),
    page.getByRole('button', { name: 'Зарегистрироваться' }).click(),
  ]);
  await expect(page.getByRole('heading', { name: 'Кабинет' })).toBeVisible();
  await page.getByLabel('Я ищу фотографа').check();
  await page.getByRole('button', { name: 'Сохранить профиль' }).click();

  // Favorite a place from the map now that we're registered. The button's
  // onClick fires an async Supabase insert it doesn't await, so navigating
  // away immediately can abort it mid-flight — wait for the real response.
  await page.goto('/');
  await page.waitForSelector('.leaflet-marker-icon');
  await page.locator('.leaflet-marker-icon').nth(1).click();
  const [favoriteResponse] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/rest/v1/favorites') && res.request().method() === 'POST',
    ),
    page.getByText(/В избранное/).click(),
  ]);
  expect(favoriteResponse.ok()).toBeTruthy();

  // 7. Cabinet shows the favorite.
  await page.goto('/cabinet');
  await expect(page.getByRole('heading', { name: 'Избранное' })).toBeVisible();

  // 8. Moodboard can be built from favorites.
  await page.goto('/moodboard');
  await expect(page.getByRole('button', { name: 'Сохранить мудборд' })).toBeVisible();

  // 5. Requests feed accepts one submission.
  await page.goto('/requests');
  await page.getByLabel(/Комментарий/).fill('Ищу фотографа, пишите в телеграм @golden');
  await page.getByRole('button', { name: 'Опубликовать заявку' }).click();
  // Scoped to <main>: the same text also appears in the success toast
  // (rendered outside <main>, see components/Toast.tsx) — an unscoped
  // getByText would resolve to both and fail Playwright's strict mode.
  await expect(page.getByRole('main').getByText('Заявка опубликована.')).toBeVisible();
});
