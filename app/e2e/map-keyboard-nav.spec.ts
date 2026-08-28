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

  // After the marker's direct click-to-toggle handler was removed, activating
  // the popup's own "Добавить в маршрут" / "Убрать из маршрута" button is the
  // ONLY way a keyboard user can add a place to the route. Standard popover
  // accessibility practice: opening the popup moves keyboard focus directly
  // onto that toggle button (see PlacesMap's `popupopen` handler) — zero Tab
  // presses needed, not the 15+ it used to take tabbing past every other
  // marker. The handler defers its focus() call by one animation frame (a
  // real DOM race against react-leaflet's own popup-repositioning work, not
  // just an arbitrary guess), so poll for it with a bounded `waitForFunction`
  // instead of a fixed sleep. A timeout here is a genuine regression, not
  // flakiness — this does not retry via extra Tab presses.
  const isToggleButtonFocused = () => {
    const el = document.activeElement;
    if (!el || el.tagName !== 'BUTTON') return false;
    const text = el.textContent ?? '';
    return text.includes('Добавить в маршрут') || text.includes('Убрать из маршрута');
  };
  await page.waitForFunction(isToggleButtonFocused, { timeout: 2000 });
  expect(await page.evaluate(isToggleButtonFocused)).toBe(true);

  const toggleButton = page.locator('.leaflet-popup button', { hasText: /Добавить в маршрут|Убрать из маршрута/ });
  await expect(toggleButton).toHaveText('Добавить в маршрут');

  await page.keyboard.press('Enter');
  await expect(toggleButton).toHaveText('Убрать из маршрута');

  // The route-selection state actually changed, not just the button's own label.
  await expect(page.getByText('Выбрано мест: 1')).toBeVisible();
});
