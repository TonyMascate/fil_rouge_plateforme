// Tourne une seule fois au démarrage du serveur Next.js, avant les pages et le middleware.
// instrumentation.ts est compilé pour chaque runtime (nodejs + edge, à cause du
// middleware). Le code qui touche à 'fs' vit dans ./lib/docker-secrets et n'est
// importé que dans la branche Node : le bundle Edge ne traverse jamais 'fs'.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { loadDockerSecrets } = await import('./lib/docker-secrets');
  loadDockerSecrets();
}
