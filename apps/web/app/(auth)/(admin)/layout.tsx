import { GetSession } from "@/lib/auth";
import { Role } from "@repo/shared";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await GetSession();

  // On sait qu'il est connecté (grâce au layout parent), on check le rôle
  if (session?.role !== Role.ADMIN) {
    redirect("/unauthorized"); // Trop bas niveau pour être ici
  }

  return <>{children}</>;
}
