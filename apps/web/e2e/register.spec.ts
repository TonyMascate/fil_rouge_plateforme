import { test, expect } from '@playwright/test';
import { API_URL } from './helpers/constants';

test.describe('Page d\'inscription (/register)', () => {
  test('est accessible sans authentification', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL('/register');
    await expect(page.getByRole('heading', { name: 'Créer un compte' })).toBeVisible();
  });

  test('affiche tous les champs du formulaire', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByLabel('Prénom')).toBeVisible();
    await expect(page.getByLabel('Nom', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Adresse e-mail')).toBeVisible();
    await expect(page.getByLabel('Mot de passe', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirmer le mot de passe', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Créer mon compte' })).toBeVisible();
  });

  test('affiche une erreur quand les mots de passe ne correspondent pas', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Prénom').fill('Marie');
    await page.getByLabel('Nom', { exact: true }).fill('Dupont');
    await page.getByLabel('Adresse e-mail').fill('marie@example.com');
    await page.getByLabel('Mot de passe', { exact: true }).fill('Password123!');
    await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill('AutreMotDePasse1!');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await expect(page.getByText('Les mots de passe ne correspondent pas')).toBeVisible();
  });

  test('redirige vers /login après inscription réussie (API mockée)', async ({ page }) => {
    await page.route(`${API_URL}/auth/register`, (route) =>
      route.fulfill({ status: 201, contentType: 'application/json', body: '{}' }),
    );

    await page.goto('/register');
    await page.getByLabel('Prénom').fill('Marie');
    await page.getByLabel('Nom', { exact: true }).fill('Dupont');
    await page.getByLabel('Adresse e-mail').fill('marie@example.com');
    await page.getByLabel('Mot de passe', { exact: true }).fill('Password123!');
    await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();

    // Redirection avec délai de 2 secondes côté page
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });

  test('affiche "Un compte existe déjà avec cet email." lors d\'un 409 (API mockée)', async ({ page }) => {
    await page.route(`${API_URL}/auth/register`, (route) =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'USER_ALREADY_EXISTS', message: 'Email already in use', statusCode: 409 }),
      }),
    );

    await page.goto('/register');
    await page.getByLabel('Prénom').fill('Marie');
    await page.getByLabel('Nom', { exact: true }).fill('Dupont');
    await page.getByLabel('Adresse e-mail').fill('marie@example.com');
    await page.getByLabel('Mot de passe', { exact: true }).fill('Password123!');
    await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();

    await expect(page.getByText('Un compte existe déjà avec cet email.')).toBeVisible({ timeout: 5000 });
  });
});
