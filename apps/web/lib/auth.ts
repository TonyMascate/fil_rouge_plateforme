import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import "server-only";

const secretEnv = process.env.JWT_ACCESS_SECRET;
if (!secretEnv) throw new Error("JWT_ACCESS_SECRET manquant dans le .env");
const JWT_SECRET = new TextEncoder().encode(secretEnv);

export async function GetSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { sub: string; email: string; role: string };
  } catch (error) {
    console.error("Erreur lors de la vérification du token JWT:", error);
    return null;
  }
}
