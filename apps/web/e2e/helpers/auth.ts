import { SignJWT } from 'jose';
import type { BrowserContext } from '@playwright/test';
import { E2E_JWT_SECRET } from './constants';

export async function loginAs(context: BrowserContext, role: 'USER' | 'ADMIN' = 'USER') {
  const secret = new TextEncoder().encode(E2E_JWT_SECRET);
  const token = await new SignJWT({
    sub: 'test-user-1',
    role,
    email: 'playwright@example.com',
    firstName: 'Playwright',
    lastName: 'Test',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(secret);

  await context.addCookies([
    {
      name: 'access_token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}
