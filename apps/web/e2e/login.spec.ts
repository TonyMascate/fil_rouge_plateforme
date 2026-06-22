import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { API_URL } from './helpers/constants';

test.describe('Page de connexion (/login)', () => {
  test('est accessible sans authentification', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Bon retour 👋' })).toBeVisible();
  });

  test('affiche les champs email, mot de passe et le bouton', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Adresse e-mail')).toBeVisible();
    await expect(page.getByLabel('Mot de passe', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Créer un compte gratuit' })).toBeVisible();
  });

  test('affiche une erreur Zod pour un email invalide', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill('pas-un-email');
    await page.getByLabel('Mot de passe', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByText("Format d'email invalide")).toBeVisible();
  });

  test('affiche une erreur Zod pour un mot de passe trop court', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill('user@example.com');
    await page.getByLabel('Mot de passe', { exact: true }).fill('123');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByText('Le mot de passe doit faire au moins 8 caractères')).toBeVisible();
  });

  test('redirige vers /galerie après connexion réussie (API mockée)', async ({ page, context }) => {
    // Localement, Playwright réutilise le dev server existant (JWT_ACCESS_SECRET différent de E2E_JWT_SECRET).
    // Le cookie JWT injecté par loginAs() est alors rejeté côté serveur → redirect /login.
    // En CI, Playwright démarre un serveur frais avec JWT_ACCESS_SECRET = E2E_JWT_SECRET → test complet.
    // Pour exécuter localement : arrêtez votre dev server avant de lancer `bun run test:e2e`.
    test.skip(!process.env.CI, "Dev server local réutilisé : arrêtez-le d'abord ou exécutez en CI");

    // Playwright évalue les routes dans l'ordre inverse d'enregistrement (la dernière gagne).
    // Le catch-all doit donc être enregistré AVANT la route /auth/login, sinon il intercepte
    // aussi /auth/login et loginAs() n'est jamais appelé → pas de cookie → redirect /login.
    await page.route(`${API_URL}/**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[],"total":0}' }),
    );
    await page.route(`${API_URL}/auth/login`, async (route) => {
      await loginAs(context);
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill('user@example.com');
    await page.getByLabel('Mot de passe', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL('/galerie', { timeout: 8000 });
  });

  test('affiche "Email ou mot de passe incorrect." lors d\'un 401 (API mockée)', async ({ page }) => {
    // Le 401 sur /auth/login ne déclenche PAS le refresh (condition dans l'intercepteur axios)
    await page.route(`${API_URL}/auth/login`, (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'AUTH_INVALID_CREDENTIALS', message: 'Identifiants invalides', statusCode: 401 }),
      }),
    );

    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill('user@example.com');
    await page.getByLabel('Mot de passe', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.getByText('Email ou mot de passe incorrect.')).toBeVisible({ timeout: 5000 });
  });
});
