import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// ─── Mocks Next.js ────────────────────────────────────────────────────────────
// Ces mocks s'appliquent à tous les tests. Les composants qui importent
// next/navigation, next/image ou next/link obtiennent des versions légères
// qui fonctionnent dans jsdom.

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock('next/image', () => ({
  default: function MockImage({ src, alt, width, height, priority, ...props }: { src: string; alt: string; width?: number; height?: number; priority?: boolean; [key: string]: unknown }) {
    return React.createElement('img', { src, alt, width, height, ...props });
  },
}));

vi.mock('next/link', () => ({
  default: function MockLink({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) {
    return React.createElement('a', { href, ...props }, children);
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  Toaster: () => null,
}));
