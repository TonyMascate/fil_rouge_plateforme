"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "@repo/shared";
import api from "@/lib/axios";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    api
      .get("/users/profile")
      .then((res) => setUser(res.data))
      .catch(() => router.push("/login"));
  }, [router]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>
      {user ? (
        <p>
          Connecté en tant que: {user.email} ({user.role})
        </p>
      ) : (
        <p>Chargement...</p>
      )}
      <div className="mt-4 flex gap-4">
        <Link href="/admin" className="text-blue-500 underline">
          Aller vers l'Admin
        </Link>
        <button onClick={() => api.post("/auth/logout").then(() => router.push("/login"))} className="text-red-500 underline">
          Déconnexion
        </button>
      </div>
    </div>
  );
}
