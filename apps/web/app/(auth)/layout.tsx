import { GetSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await GetSession();

  if (!session) {
    redirect("/login");
  }

  return <>{children}</>;
}
