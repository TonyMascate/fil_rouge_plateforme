import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Pages accessibles à tous (connecté ou non) — jamais redirigées
const OPEN_PREFIXES = ["/fonctionnalites", "/tarifs", "/"];

// Pages réservées aux non-connectés — redirigent vers /galerie si connecté
const AUTH_ONLY_PREFIXES = ["/login", "/register"];

// Tente de rafraîchir la session via le refresh_token. Renvoie la réponse à
// retourner (cookies propagés) si le refresh réussit, sinon null.
async function attemptTokenRefresh(req: NextRequest, refreshToken: string, isAuthOnly: boolean): Promise<NextResponse | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const refreshResponse = await fetch(`${apiUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `refresh_token=${refreshToken}`,
      },
    });

    if (!refreshResponse.ok) return null;

    const setCookies = refreshResponse.headers.getSetCookie();

    // Propager les nouveaux tokens à la requête courante pour que les Server
    // Components en aval (GetSession dans le root layout) lisent le NOUVEL
    // access_token, et non l'ancien expiré. Sans ça, la navbar s'affiche
    // déconnectée jusqu'au prochain full reload.
    for (const setCookie of setCookies) {
      const firstPart = setCookie.split(";")[0];
      const separatorIndex = firstPart.indexOf("=");
      if (separatorIndex === -1) continue;
      const cookieName = firstPart.slice(0, separatorIndex).trim();
      const cookieValue = firstPart.slice(separatorIndex + 1).trim();
      req.cookies.set(cookieName, cookieValue);
    }

    // IMPORTANT : reconstruire explicitement l'en-tête `Cookie` forwardé.
    // req.cookies.set() ne réécrit pas toujours req.headers, donc forwarder
    // req.headers tel quel transmettrait l'ancien access_token expiré et
    // GetSession() renverrait null (navbar déconnectée jusqu'au reload).
    const forwardedHeaders = new Headers(req.headers);
    forwardedHeaders.set("cookie", req.cookies.toString());

    const response = isAuthOnly ? NextResponse.redirect(new URL("/galerie", req.url)) : NextResponse.next({ request: { headers: forwardedHeaders } });

    // Renvoyer aussi les cookies au navigateur pour les requêtes suivantes.
    for (const setCookie of setCookies) {
      response.headers.append("Set-Cookie", setCookie);
    }

    return response;
  } catch {
    // Refresh échoué
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;
  const isOpen = OPEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
  const isAuthOnly = AUTH_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
  const isPublic = isOpen || isAuthOnly;
  const JWT_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET ?? "");

  // Les prefetch de Next.js (chaque <Link> visible) passent aussi par le proxy.
  // Comme le refresh token est à rotation destructive (usage unique), laisser un
  // prefetch déclencher /auth/refresh invaliderait le token pour la vraie
  // navigation : cascade de 401 et boucle de redirections vers /login. On ne
  // rafraîchit donc JAMAIS sur un prefetch — il n'est de toute façon pas affiché.
  const isPrefetch = req.headers.get("next-router-prefetch") === "1" || req.headers.get("purpose") === "prefetch";

  // --- Routes publiques sans tokens : laisser passer ---
  if (isPublic && !accessToken && !refreshToken) {
    return NextResponse.next();
  }

  // --- Vérifier si l'access token est encore valide ---
  if (accessToken) {
    try {
      await jwtVerify(accessToken, JWT_SECRET);
      // Token valide : rediriger vers dashboard uniquement pour les pages auth-only (login, register)
      if (isAuthOnly) return NextResponse.redirect(new URL("/galerie", req.url));
      return NextResponse.next();
    } catch {
      // Token expiré, on continue vers le refresh
    }
  }

  // --- Tenter le refresh (jamais sur un prefetch : voir isPrefetch) ---
  if (refreshToken && !isPrefetch) {
    const refreshed = await attemptTokenRefresh(req, refreshToken, isAuthOnly);
    if (refreshed) return refreshed;
  }

  // --- Pas de session valide ---
  // Un prefetch n'est pas affiché : on le laisse passer plutôt que de le rediriger
  // vers /login (ce qui polluerait le cache du routeur Next).
  if (isPublic || isPrefetch) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  // NB : doit rester une chaîne littérale (Next analyse le matcher statiquement
  // au build). Ne PAS passer en String.raw / template tag, sinon le matcher est
  // ignoré et le middleware s'exécute sur _next/static → chunks JS redirigés.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|avif)$).*)"],
};
