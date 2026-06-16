import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('affiche le texte passé en enfant', () => {
    render(<Button>Cliquer</Button>);
    expect(screen.getByRole('button', { name: 'Cliquer' })).toBeInTheDocument();
  });

  it('appelle onClick au clic', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Action</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('est désactivé quand disabled est vrai', () => {
    render(<Button disabled>Désactivé</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it("n'appelle pas onClick quand disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Désactivé</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('expose data-variant pour les variantes', () => {
    render(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'outline');
  });

  it('expose data-size pour les tailles', () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'lg');
  });

  it('render un Slot quand asChild est vrai', () => {
    render(
      <Button asChild>
        <a href="/test">Lien</a>
      </Button>,
    );
    expect(screen.getByRole('link', { name: 'Lien' })).toBeInTheDocument();
  });
});
