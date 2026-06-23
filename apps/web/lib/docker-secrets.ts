import { readFileSync } from 'node:fs';

// Code réservé au runtime Node. Importé dynamiquement par instrumentation.ts
// uniquement quand NEXT_RUNTIME === 'nodejs' → jamais inclus dans le bundle Edge,
// où les modules Node ('fs') ne sont pas supportés.
//
// En prod, lit les Docker Secrets JWT depuis /run/secrets/ (tmpfs RAM) et les injecte
// dans process.env pour que le middleware d'auth y ait accès normalement.
// En dev, les fichiers /run/secrets/ n'existent pas — les env vars sont déjà dans .env.
export function loadDockerSecrets() {
  const secrets: Record<string, string> = {
    JWT_ACCESS_SECRET: '/run/secrets/jwt_access_secret',
    JWT_REFRESH_SECRET: '/run/secrets/jwt_refresh_secret',
  };

  for (const [name, filePath] of Object.entries(secrets)) {
    try {
      process.env[name] = readFileSync(filePath, 'utf8').trim();
    } catch {
      // Fichier absent = mode dev, la variable est déjà dans process.env via .env
    }
  }
}
