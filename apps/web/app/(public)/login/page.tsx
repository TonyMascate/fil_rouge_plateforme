"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { UserLoginDto, UserLoginSchema } from "@repo/shared";
import api from "../../../lib/axios";
import { useFormMutation } from "../../../lib/useFormMutation";
import { MacWindow } from "@/components/ui/MacWindow";
import { DotBackground } from "@/components/ui/FeatureSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UserLoginDto>({
    resolver: zodResolver(UserLoginSchema),
  });

  const loginMutation = useFormMutation({
    mutationFn: async (data: UserLoginDto) => {
      const response = await api.post("/auth/login", data);
      return response.data;
    },
    setError,
    successMessage: "Connexion réussie !",
    onSuccess: () => {
      // router.refresh() invalide le cache RSC pour que le RootLayout (Server Component)
      // re-fetch GetSession() et affiche la navbar authentifiée sans full reload.
      router.push("/galerie");
      router.refresh();
    },
  });

  const onSubmit = (data: UserLoginDto) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="grid flex-1 md:grid-cols-2 bg-background">
      {/* ── Left panel (hidden on mobile) ── */}
      <div className="relative hidden md:flex flex-col border-r border-border overflow-hidden">
        <DotBackground />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[115%] max-w-[680px] rotate-[-8deg] translate-x-[12%] translate-y-[2%] shrink-0">
            <MacWindow className="shadow-2xl">
              <Image src="/boilerplate.png" alt="Aperçu de PhotoApp" width={1902} height={915} priority className="w-full h-auto block" />
            </MacWindow>
          </div>
        </div>

        <div className="relative z-20 flex items-center gap-6 px-10 py-8 mt-auto text-xs text-muted-foreground">
          <span>⭐ 4,9/5</span>
          <span className="w-px h-3.5 bg-border" />
          <span>+2 000 utilisateurs</span>
          <span className="w-px h-3.5 bg-border" />
          <span>500 MB gratuits</span>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-col items-center justify-center px-6 py-12 md:px-8">
        <div className="w-full max-w-[420px] flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Bon retour 👋</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pas encore de compte ?{" "}
              <Link href="/register" className="text-primary font-medium hover:underline">
                Créer un compte gratuit
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input id="email" type="email" placeholder="vous@exemple.fr" autoComplete="email" disabled={loginMutation.isPending} aria-invalid={!!errors.email} className="h-11 bg-white rounded-xl" {...register("email")} />
              {errors.email && <span className="text-xs text-destructive">{errors.email.message}</span>}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" autoComplete="current-password" disabled={loginMutation.isPending} aria-invalid={!!errors.password} className="h-11 bg-white rounded-xl pr-11" {...register("password")} />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <span className="text-xs text-destructive">{errors.password.message}</span>}
            </div>

            <div className="flex justify-end -mt-1">
              <Link href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Mot de passe oublié ?
              </Link>
            </div>

            <Button type="submit" size="lg" disabled={loginMutation.isPending} className="w-full rounded-full shadow-lg shadow-primary/30 mt-2">
              {loginMutation.isPending ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            En vous connectant, vous acceptez nos{" "}
            <Link href="#" className="underline hover:text-foreground">
              Conditions d'utilisation
            </Link>{" "}
            et notre{" "}
            <Link href="#" className="underline hover:text-foreground">
              Politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
