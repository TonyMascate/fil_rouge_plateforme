"use client";

import api from "@/lib/axios";
import { useFormMutation } from "@/lib/useFormMutation";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserCreateDto, UserCreateSchema } from "@repo/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";

const RegisterFormSchema = UserCreateSchema.extend({
  confirmPassword: UserCreateSchema.shape.password,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof RegisterFormSchema>;

export default function RegisterPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterFormSchema),
  });

  const registerMutation = useFormMutation({
    mutationFn: async (data: UserCreateDto) => {
      const response = await api.post("/auth/register", data);
      return response.data;
    },
    setError,
    successMessage: "Inscription réussie ! Redirection en cours...",
    onSuccess: () => {
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };

  //   TODO : refaire le design avec le bon design system

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Inscription</h2>
          <p className="mt-2 text-sm text-gray-600">Créez votre compte utilisateur</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Prénom */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Prénom</label>
              <input type="text" {...register("firstName")} className={`mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3 ${errors.firstName ? "ring-red-500" : ""}`} />
              {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
            </div>

            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom</label>
              <input type="text" {...register("lastName")} className={`mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3 ${errors.lastName ? "ring-red-500" : ""}`} />
              {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" {...register("email")} className={`mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3 ${errors.email ? "ring-red-500" : ""}`} />
              {/* Le message viendra soit de Zod Front, soit de l'API Back */}
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
              <input type="password" {...register("password")} className={`mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3 ${errors.password ? "ring-red-500" : ""}`} />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
              <input type="password" {...register("confirmPassword")} className={`mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3 ${errors.confirmPassword ? "ring-red-500" : ""}`} />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>
          </div>
          <button type="submit" disabled={registerMutation.isPending} className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-400">
            {registerMutation.isPending ? "Création..." : "S'inscrire"}
          </button>
        </form>

        <div className="text-center text-sm">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
