import { test, expect } from '@playwright/test';

test.describe('Routes protégées (auth guard)', () => {
  test('redirige /galerie vers /login quand non authentifié', async ({ page }) => {
    await page.goto('/galerie');
    await expect(page).toHaveURL('/login');
  });

  test('redirige /albums vers /login quand non authentifié', async ({ page }) => {
    await page.goto('/albums');
    await expect(page).toHaveURL('/login');
  });

  test('redirige /explore vers /login quand non authentifié', async ({ page }) => {
    await page.goto('/explore');
    await expect(page).toHaveURL('/login');
  });
});
