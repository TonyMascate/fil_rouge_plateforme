import { readFileSync } from 'fs';

// Tourne une seule fois au démarrage du serveur Next.js, avant les pages et le middleware.
// En prod, lit les Docker Secrets JWT depuis /run/secrets/ (tmpfs RAM) et les injecte
// dans process.env pour que le middleware d'auth y ait accès normalement.
// En dev, les fichiers /run/secrets/ n'existent pas — les env vars sont déjà dans .env.
export async function register() {
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
