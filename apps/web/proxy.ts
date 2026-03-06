import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;

  // Redirection vers le dashboard si l'utilisateur est déjà connecté
  if (token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register"],
};
