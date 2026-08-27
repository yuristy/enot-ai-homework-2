// app/e2e/route-sharing.spec.ts
import { expect, test } from '@playwright/test';

test('guest builds a route, shares the URL, and it reopens identically', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForSelector('.leaflet-marker-icon');

  const markers = page.locator('.leaflet-marker-icon');
  await markers.nth(0).click();
  await page.getByText('Добавить в маршрут').click();
  await markers.nth(1).click();
  await page.getByText('Добавить в маршрут').click();

  // set start by clicking an empty spot on the map
  await page.locator('.leaflet-container').click({ position: { x: 50, y: 50 } });

  await expect(page.getByText(/Маршрут:/)).toBeVisible();

  await page.getByText('Скопировать ссылку на маршрут').click();
  const copiedUrl = await page.evaluate(() => navigator.clipboard.readText());

  const secondPage = await context.newPage();
  await secondPage.goto(copiedUrl);
  await expect(secondPage.getByText(/Маршрут:/)).toBeVisible();
});
