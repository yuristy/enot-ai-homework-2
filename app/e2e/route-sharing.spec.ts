// app/e2e/route-sharing.spec.ts
import { expect, test } from '@playwright/test';

test('guest builds a route, shares the URL, and it reopens identically', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForSelector('.leaflet-marker-icon');

  // Markers cluster closely at this zoom level, so an open popup can visually
  // overlap the next marker's icon — close each popup before moving on,
  // mirroring how a real user would dismiss it.
  const markers = page.locator('.leaflet-marker-icon');
  const closePopup = page.locator('.leaflet-popup-close-button');

  await markers.nth(0).click();
  await page.getByText('Добавить в маршрут').click();
  await closePopup.click();

  await markers.nth(1).click();
  await page.getByText('Добавить в маршрут').click();
  await closePopup.click();

  await markers.nth(2).click();
  await page.getByText('Добавить в маршрут').click();
  await closePopup.click();

  // set start by clicking an empty spot on the map
  await page.locator('.leaflet-container').click({ position: { x: 50, y: 50 } });

  await expect(page.getByText(/Маршрут:/)).toBeVisible();
  await expect(page.getByText('Выбрано мест: 3')).toBeVisible();
  // textContent(), not innerText(): the design pass added a CSS text-transform
  // to this element, and innerText() is render-aware (would capture the
  // upper-cased text) while toHaveText() compares against the raw DOM text —
  // comparing textContent() on both sides keeps the test about the underlying
  // data being identical, not about a presentational transform.
  const firstSummary = (await page.getByText(/Маршрут:/).textContent()) ?? '';

  await page.getByText('Скопировать ссылку на маршрут').click();
  const copiedUrl = await page.evaluate(() => navigator.clipboard.readText());

  const secondPage = await context.newPage();
  await secondPage.goto(copiedUrl);
  await expect(secondPage.getByText(/Маршрут:/)).toHaveText(firstSummary);
  await expect(secondPage.getByText('Выбрано мест: 3')).toBeVisible();
});
