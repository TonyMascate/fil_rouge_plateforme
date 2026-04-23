import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PREFIXES = ["/login", "/register", "/mockups"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;
  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
  const JWT_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET ?? "");

  // --- Routes publiques sans tokens : laisser passer ---
  if (isPublic && !accessToken && !refreshToken) {
    return NextResponse.next();
  }

  // --- Vérifier si l'access token est encore valide ---
  if (accessToken) {
    try {
      await jwtVerify(accessToken, JWT_SECRET);
      // Token valide : rediriger si route publique, sinon laisser passer
      if (isPublic) return NextResponse.redirect(new URL("/dashboard", req.url));
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
        // Rediriger vers dashboard si route publique, sinon laisser passer
        const response = isPublic ? NextResponse.redirect(new URL("/dashboard", req.url)) : NextResponse.next();

        // Recopier les Set-Cookie de l'API vers le navigateur
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
