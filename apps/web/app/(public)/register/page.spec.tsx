import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import RegisterPage from './page';

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

describe('RegisterPage', () => {
  beforeEach(() => {
    mockPost.mockResolvedValue({ data: {} });
    vi.mocked(toast.success).mockClear();
  });

  it('affiche les 5 champs et le bouton de création', () => {
    renderWithQuery(<RegisterPage />);
    expect(screen.getByLabelText('Prénom')).toBeInTheDocument();
    expect(screen.getByLabelText('Nom')).toBeInTheDocument();
    expect(screen.getByLabelText('Adresse e-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmer le mot de passe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer mon compte' })).toBeInTheDocument();
  });

  it('affiche une erreur Zod pour un email invalide', async () => {
    const user = userEvent.setup();
    renderWithQuery(<RegisterPage />);

    await user.type(screen.getByLabelText('Prénom'), 'Marie');
    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    await user.type(screen.getByLabelText('Adresse e-mail'), 'pas-un-email');
    await user.type(screen.getByLabelText('Mot de passe'), 'Password123!');
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() => {
      expect(screen.getByText("Format d'email invalide")).toBeInTheDocument();
    });
  });

  it('affiche une erreur Zod pour un mot de passe trop court', async () => {
    const user = userEvent.setup();
    renderWithQuery(<RegisterPage />);

    await user.type(screen.getByLabelText('Prénom'), 'Marie');
    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    await user.type(screen.getByLabelText('Adresse e-mail'), 'marie@example.com');
    // confirmPassword valide pour éviter le doublon d'erreur sur les deux champs
    await user.type(screen.getByLabelText('Mot de passe'), '123');
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() => {
      expect(screen.getByText('Le mot de passe doit faire au moins 8 caractères')).toBeInTheDocument();
    });
  });

  it('affiche une erreur Zod quand les mots de passe ne correspondent pas', async () => {
    const user = userEvent.setup();
    renderWithQuery(<RegisterPage />);

    await user.type(screen.getByLabelText('Prénom'), 'Marie');
    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    await user.type(screen.getByLabelText('Adresse e-mail'), 'marie@example.com');
    // les deux champs passent leurs validations individuelles mais diffèrent — le .refine() tourne
    await user.type(screen.getByLabelText('Mot de passe'), 'Password123!');
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'Password456!');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() => {
      expect(screen.getByText('Les mots de passe ne correspondent pas')).toBeInTheDocument();
    });
  });

  it('affiche "Création..." pendant la requête en attente', async () => {
    const user = userEvent.setup();
    mockPost.mockImplementation(() => new Promise(() => {}));
    renderWithQuery(<RegisterPage />);

    await user.type(screen.getByLabelText('Prénom'), 'Marie');
    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    await user.type(screen.getByLabelText('Adresse e-mail'), 'marie@example.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'Password123!');
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Création...' })).toBeInTheDocument();
    });
  });

  it('appelle toast.success avec le message de confirmation au succès', async () => {
    const user = userEvent.setup();
    renderWithQuery(<RegisterPage />);

    await user.type(screen.getByLabelText('Prénom'), 'Marie');
    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    await user.type(screen.getByLabelText('Adresse e-mail'), 'marie@example.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'Password123!');
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() => {
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Inscription réussie ! Redirection en cours...');
    });
  });
});
