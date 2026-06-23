import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

// Une seule requête /auth/refresh en vol à la fois : tous les 401 concurrents
// (typiquement lors d'un upload multipart de plusieurs photos) partagent la même
// promesse. Sans ça, chaque 401 lance son propre refresh ; comme l'API fait de la
// rotation destructive du refresh token, seul le premier gagne et les autres
// reçoivent un 401 « Token invalide », faisant échouer les uploads en cours.
let refreshPromise: Promise<unknown> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest.url?.includes("/auth/refresh")) {
      console.error("Le token de rafraîchissement est invalide ou a expiré. Veuillez vous reconnecter.");
      globalThis.location.href = "/login";
      throw error;
    }
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes("/auth/login")) {
      originalRequest._retry = true;
      try {
        refreshPromise ??= api.post("/auth/refresh").finally(() => {
          refreshPromise = null;
        });
        await refreshPromise;
        return api(originalRequest);
      } catch (refreshError) {
        console.error("Erreur lors du rafraîchissement du token. Veuillez vous reconnecter.", refreshError);
        globalThis.location.href = "/login";
        throw refreshError;
      }
    }
    throw error;
  },
);

export default api;
