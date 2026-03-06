"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserLoginDto, UserLoginSchema } from "@repo/shared";
import api from "../../../lib/axios";
import { useFormMutation } from "../../../lib/useFormMutation";

export default function LoginPage() {
  const router = useRouter();

  // Configuration du formulaire
  const {
    register,
    handleSubmit,
    setError, // 🚩 Nécessaire pour injecter les erreurs du serveur
    formState: { errors },
  } = useForm<UserLoginDto>({
    resolver: zodResolver(UserLoginSchema),
  });

  // 🚩 Utilisation de ton Hook personnalisé avec TanStack Query
  const loginMutation = useFormMutation({
    mutationFn: async (data: UserLoginDto) => {
      const response = await api.post("/auth/login", data);
      return response.data;
    },
    setError,
    successMessage: "Connexion réussie !",
    onSuccess: () => {
      // Redirection et rafraîchissement
      router.push("/dashboard");
      router.refresh();
    },
  });

  // Soumission
  const onSubmit = (data: UserLoginDto) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Connexion</h2>
          <p className="mt-2 text-sm text-gray-600">Accédez à votre espace sécurisé</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 rounded-md shadow-sm">
            {/* Email */}
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Adresse email"
                disabled={loginMutation.isPending} // 🚩 Utilise l'état de la mutation
                className={`relative block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${errors.email ? "ring-red-500" : ""}`}
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="sr-only">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                placeholder="Mot de passe"
                disabled={loginMutation.isPending} // 🚩 Utilise l'état de la mutation
                className={`relative block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${errors.password ? "ring-red-500" : ""}`}
                {...register("password")}
              />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loginMutation.isPending} // 🚩 Utilise l'état de la mutation
              className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-400">
              {loginMutation.isPending ? "Connexion..." : "Se connecter"}
            </button>
          </div>
        </form>

        <div className="text-center text-sm">
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
            S'inscrire
          </Link>
        </div>
      </div>
    </div>
  );
}
