import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './page';

// vi.hoisted() exécute la fonction AVANT les imports — évite l'erreur
// "Cannot access 'mockPost' before initialization" liée au hoisting de vi.mock
const mockPost = vi.hoisted(() => vi.fn());
vi.mock('@/lib/axios', () => ({
  default: { post: mockPost },
}));

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockPost.mockResolvedValue({ data: {} });
  });

  it('affiche les champs email, mot de passe et le bouton de connexion', () => {
    renderWithQuery(<LoginPage />);

    expect(screen.getByLabelText('Adresse e-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument();
  });

  it('affiche le lien vers la page d\'inscription', () => {
    renderWithQuery(<LoginPage />);
    expect(screen.getByRole('link', { name: 'Créer un compte gratuit' })).toBeInTheDocument();
  });

  it('affiche une erreur Zod pour un email invalide', async () => {
    const user = userEvent.setup();
    renderWithQuery(<LoginPage />);

    await user.type(screen.getByLabelText('Adresse e-mail'), 'pas-un-email');
    await user.type(screen.getByLabelText('Mot de passe'), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() => {
      expect(screen.getByText("Format d'email invalide")).toBeInTheDocument();
    });
  });

  it('affiche une erreur Zod pour un mot de passe trop court', async () => {
    const user = userEvent.setup();
    renderWithQuery(<LoginPage />);

    await user.type(screen.getByLabelText('Adresse e-mail'), 'user@example.com');
    await user.type(screen.getByLabelText('Mot de passe'), '123');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() => {
      expect(screen.getByText('Le mot de passe doit faire au moins 8 caractères')).toBeInTheDocument();
    });
  });

  it('affiche "Connexion..." pendant la requête en attente', async () => {
    const user = userEvent.setup();
    // Mutation qui ne se résout jamais → isPending reste true
    mockPost.mockImplementation(() => new Promise(() => {}));
    renderWithQuery(<LoginPage />);

    await user.type(screen.getByLabelText('Adresse e-mail'), 'user@example.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Connexion...' })).toBeInTheDocument();
    });
  });

  it('affiche/masque le mot de passe en cliquant sur l\'icône', async () => {
    const user = userEvent.setup();
    renderWithQuery(<LoginPage />);

    const passwordInput = screen.getByLabelText('Mot de passe');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Masquer le mot de passe' }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
