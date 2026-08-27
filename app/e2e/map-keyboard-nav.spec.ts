// app/e2e/map-keyboard-nav.spec.ts
import { expect, test } from '@playwright/test';

test('Tab reaches a map marker and Enter opens its popup', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.leaflet-marker-icon');

  // Tab from the top of the document until a marker is focused, capped to avoid an infinite loop
  let focusedIsMarker = false;
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press('Tab');
    focusedIsMarker = await page.evaluate(
      () => document.activeElement?.classList.contains('leaflet-marker-icon') ?? false,
    );
    if (focusedIsMarker) break;
  }
  expect(focusedIsMarker).toBe(true);

  await page.keyboard.press('Enter');
  await expect(page.locator('.leaflet-popup')).toBeVisible();
});
