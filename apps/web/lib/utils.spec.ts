import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('fusionne des noms de classes simples', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('ignore les valeurs falsy (undefined, null, false)', () => {
    expect(cn('foo', undefined, null, false as unknown as string, 'bar')).toBe('foo bar');
  });

  it('résout les conflits Tailwind — la dernière valeur gagne', () => {
    expect(cn('px-3', 'px-5')).toBe('px-5');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('supporte les conditions via objet', () => {
    expect(cn({ 'font-bold': true, 'text-sm': false })).toBe('font-bold');
  });

  it('retourne une chaîne vide sans arguments', () => {
    expect(cn()).toBe('');
  });
});
