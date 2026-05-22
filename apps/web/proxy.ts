import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Pages accessibles à tous (connecté ou non) — jamais redirigées
const OPEN_PREFIXES = ["/fonctionnalites", "/tarifs", "/mockups"];

// Pages réservées aux non-connectés — redirigent vers /dashboard si connecté
const AUTH_ONLY_PREFIXES = ["/login", "/register", "/"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;
  const isOpen = OPEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
  const isAuthOnly = AUTH_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
  const isPublic = isOpen || isAuthOnly;
  const JWT_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET ?? "");

  // --- Routes publiques sans tokens : laisser passer ---
  if (isPublic && !accessToken && !refreshToken) {
    return NextResponse.next();
  }

  // --- Vérifier si l'access token est encore valide ---
  if (accessToken) {
    try {
      await jwtVerify(accessToken, JWT_SECRET);
      // Token valide : rediriger vers dashboard uniquement pour les pages auth-only (login, register)
      if (isAuthOnly) return NextResponse.redirect(new URL("/dashboard", req.url));
      return NextResponse.next();
    } catch {
      // Token expiré, on continue vers le refresh
    }
  }

  // --- Tenter le refresh ---
  if (refreshToken) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const refreshResponse = await fetch(`${apiUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `refresh_token=${refreshToken}`,
        },
      });

      if (refreshResponse.ok) {
        const response = isAuthOnly ? NextResponse.redirect(new URL("/dashboard", req.url)) : NextResponse.next();

        const setCookies = refreshResponse.headers.getSetCookie();
        for (const cookie of setCookies) {
          response.headers.append("Set-Cookie", cookie);
        }

        return response;
      }
    } catch {
      // Refresh échoué
    }
  }

  // --- Pas de session valide ---
  if (isPublic) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
