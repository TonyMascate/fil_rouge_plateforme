"use client";

import { useState } from "react";
import Link from "next/link";

type BillingPeriod = "mensuel" | "annuel";

interface Plan {
  id: string;
  badge: string;
  name: string;
  desc: string;
  price: string;
  annualNote: string | null;
  isPro?: boolean;
  ctaLabel: string;
  ctaHref: string;
  features: { ok: boolean; label: string }[];
}

const PLANS: Record<BillingPeriod, Plan[]> = {
  mensuel: [
    {
      id: "free",
      badge: "Gratuit",
      name: "Starter",
      desc: "Pour découvrir PhotoApp et partager vos premiers souvenirs.",
      price: "0",
      annualNote: null,
      ctaLabel: "Commencer gratuitement",
      ctaHref: "/register",
      features: [
        { ok: true, label: "500 MB de stockage" },
        { ok: true, label: "Albums illimités" },
        { ok: true, label: "Partage par lien" },
        { ok: true, label: "Exploration chromatique" },
        { ok: false, label: "Stockage étendu" },
        { ok: false, label: "Statistiques avancées" },
        { ok: false, label: "Domaine personnalisé" },
        { ok: false, label: "Support prioritaire" },
      ],
    },
    {
      id: "pro",
      badge: "✦ Populaire",
      name: "Pro",
      desc: "Pour les photographes et créateurs qui partagent régulièrement.",
      price: "7",
      annualNote: null,
      isPro: true,
      ctaLabel: "Démarrer l'essai gratuit",
      ctaHref: "/register",
      features: [
        { ok: true, label: "50 GB de stockage" },
        { ok: true, label: "Albums illimités" },
        { ok: true, label: "Partage par lien" },
        { ok: true, label: "Exploration chromatique" },
        { ok: true, label: "Statistiques avancées" },
        { ok: true, label: "Téléchargement HD" },
        { ok: true, label: "Support prioritaire" },
        { ok: false, label: "Domaine personnalisé" },
      ],
    },
    {
      id: "team",
      badge: "Équipe",
      name: "Équipe",
      desc: "Pour les studios et agences avec plusieurs collaborateurs.",
      price: "19",
      annualNote: "par utilisateur",
      ctaLabel: "Contacter l'équipe",
      ctaHref: "mailto:hello@photoapp.fr",
      features: [
        { ok: true, label: "Stockage illimité" },
        { ok: true, label: "Albums illimités" },
        { ok: true, label: "Partage par lien" },
        { ok: true, label: "Exploration chromatique" },
        { ok: true, label: "Statistiques avancées" },
        { ok: true, label: "Téléchargement HD" },
        { ok: true, label: "Support prioritaire" },
        { ok: true, label: "Domaine personnalisé" },
      ],
    },
  ],
  annuel: [
    {
      id: "free",
      badge: "Gratuit",
      name: "Starter",
      desc: "Pour découvrir PhotoApp et partager vos premiers souvenirs.",
      price: "0",
      annualNote: null,
      ctaLabel: "Commencer gratuitement",
      ctaHref: "/register",
      features: [
        { ok: true, label: "500 MB de stockage" },
        { ok: true, label: "Albums illimités" },
        { ok: true, label: "Partage par lien" },
        { ok: true, label: "Exploration chromatique" },
        { ok: false, label: "Stockage étendu" },
        { ok: false, label: "Statistiques avancées" },
        { ok: false, label: "Domaine personnalisé" },
        { ok: false, label: "Support prioritaire" },
      ],
    },
    {
      id: "pro",
      badge: "✦ Populaire",
      name: "Pro",
      desc: "Pour les photographes et créateurs qui partagent régulièrement.",
      price: "5",
      annualNote: "facturé 60 €/an",
      isPro: true,
      ctaLabel: "Démarrer l'essai gratuit",
      ctaHref: "/register",
      features: [
        { ok: true, label: "50 GB de stockage" },
        { ok: true, label: "Albums illimités" },
        { ok: true, label: "Partage par lien" },
        { ok: true, label: "Exploration chromatique" },
        { ok: true, label: "Statistiques avancées" },
        { ok: true, label: "Téléchargement HD" },
        { ok: true, label: "Support prioritaire" },
        { ok: false, label: "Domaine personnalisé" },
      ],
    },
    {
      id: "team",
      badge: "Équipe",
      name: "Équipe",
      desc: "Pour les studios et agences avec plusieurs collaborateurs.",
      price: "15",
      annualNote: "par utilisateur · facturé annuellement",
      ctaLabel: "Contacter l'équipe",
      ctaHref: "mailto:hello@photoapp.fr",
      features: [
        { ok: true, label: "Stockage illimité" },
        { ok: true, label: "Albums illimités" },
        { ok: true, label: "Partage par lien" },
        { ok: true, label: "Exploration chromatique" },
        { ok: true, label: "Statistiques avancées" },
        { ok: true, label: "Téléchargement HD" },
        { ok: true, label: "Support prioritaire" },
        { ok: true, label: "Domaine personnalisé" },
      ],
    },
  ],
};

function PlanCard({ plan }: { plan: Plan }) {
  const { isPro } = plan;
  return (
    <div className={`rounded-3xl border p-8 flex flex-col gap-6 transition-shadow ${isPro ? "bg-primary border-transparent text-white shadow-[0_20px_60px_oklch(0.511_0.262_276.966/0.35)] -translate-y-2" : "bg-white border-border shadow-sm hover:shadow-md"}`}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <span className={`text-xs font-semibold tracking-widest uppercase rounded-full px-3 py-1 w-fit ${isPro ? "bg-white/20 text-white" : plan.id === "team" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          {plan.badge}
        </span>
        <p className={`text-2xl font-bold tracking-tight ${isPro ? "text-white" : "text-foreground"}`}>{plan.name}</p>
        <p className={`text-sm leading-relaxed ${isPro ? "text-white/70" : "text-muted-foreground"}`}>{plan.desc}</p>
      </div>

      {/* Price */}
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-1">
          <span className={`text-xl font-semibold ${isPro ? "text-white/70" : "text-muted-foreground"}`}>€</span>
          <span className={`text-5xl font-bold tracking-tight leading-none ${isPro ? "text-white" : "text-foreground"}`}>{plan.price}</span>
          <span className={`text-sm ${isPro ? "text-white/70" : "text-muted-foreground"}`}>/mois</span>
        </div>
        {plan.annualNote && <p className={`text-xs ${isPro ? "text-white/60" : "text-muted-foreground"}`}>{plan.annualNote}</p>}
      </div>

      {/* CTA */}
      <Link
        href={plan.ctaHref}
        className={`flex items-center justify-center px-6 py-3 rounded-full text-sm font-semibold transition-opacity ${isPro ? "bg-white text-primary shadow-md hover:opacity-90" : plan.id === "team" ? "bg-foreground text-white hover:opacity-85" : "bg-white text-foreground border border-border hover:shadow-md"}`}>
        {plan.ctaLabel}
      </Link>

      <div className={`h-px ${isPro ? "bg-white/20" : "bg-border"}`} />

      {/* Features */}
      <ul className="flex flex-col gap-2.5">
        {plan.features.map((f) => (
          <li key={f.label} className="flex items-start gap-2.5 text-sm">
            {f.ok ? (
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 ${isPro ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>✓</span>
            ) : (
              <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px] text-muted-foreground shrink-0 mt-0.5">✕</span>
            )}
            <span className={f.ok ? (isPro ? "text-white/90" : "text-foreground") : isPro ? "text-white/35" : "text-muted-foreground"}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PricingSection() {
  const [billing, setBilling] = useState<BillingPeriod>("mensuel");

  return (
    <section className="w-full relative z-10 px-8 py-16 flex flex-col items-center gap-12">
      {/* Toggle */}
      <div className="flex items-center gap-1 bg-white border border-border rounded-full p-1 shadow-sm">
        <button
          onClick={() => setBilling("mensuel")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${billing === "mensuel" ? "bg-foreground text-white font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
          Mensuel
        </button>
        <button
          onClick={() => setBilling("annuel")}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${billing === "annuel" ? "bg-foreground text-white font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
          Annuel
          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-semibold rounded-full px-2 py-0.5">−30%</span>
        </button>
      </div>

      {/* Cards */}
      <div className="w-full max-w-5xl grid grid-cols-1 gap-5 items-start md:grid-cols-3">
        {PLANS[billing].map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      {/* Trust note */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {["Aucune carte bancaire pour l'essai", "14 jours d'essai Pro gratuit", "Annulation sans conditions"].map((t, i) => (
          <span key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
            {i > 0 && <span className="text-border">·</span>}
            <span className="text-primary">✓</span>
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}
