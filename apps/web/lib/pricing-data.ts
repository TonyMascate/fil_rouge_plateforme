export type BillingPeriod = "mensuel" | "annuel";

export interface Feature {
  label: string;
  starter: boolean | string;
  pro: boolean | string;
  team: boolean | string;
}

export const FEATURES: Feature[] = [
  { label: "Stockage",              starter: "500 MB", pro: "50 GB",  team: "Illimité" },
  { label: "Albums illimités",      starter: true,     pro: true,     team: true       },
  { label: "Partage par lien",      starter: true,     pro: true,     team: true       },
  { label: "Exploration chromatique", starter: true,   pro: true,     team: true       },
  { label: "Statistiques avancées", starter: false,    pro: true,     team: true       },
  { label: "Téléchargement HD",     starter: false,    pro: true,     team: true       },
  { label: "Support prioritaire",   starter: false,    pro: true,     team: true       },
  { label: "Domaine personnalisé",  starter: false,    pro: false,    team: true       },
];

export interface Plan {
  id: "starter" | "pro" | "team";
  badge: string;
  name: string;
  desc: string;
  priceMensuel: string;
  priceAnnuel: string;
  annualNote: string | null;
  isPro?: boolean;
  ctaLabel: string;
  ctaHref: string;
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    badge: "Gratuit",
    name: "Starter",
    desc: "Pour découvrir PhotoApp et partager vos premiers souvenirs.",
    priceMensuel: "0",
    priceAnnuel: "0",
    annualNote: null,
    ctaLabel: "Commencer gratuitement",
    ctaHref: "/register",
  },
  {
    id: "pro",
    badge: "✦ Populaire",
    name: "Pro",
    desc: "Pour les photographes et créateurs qui partagent régulièrement.",
    priceMensuel: "7",
    priceAnnuel: "5",
    annualNote: "facturé 60 €/an",
    isPro: true,
    ctaLabel: "Démarrer l'essai gratuit",
    ctaHref: "/register",
  },
  {
    id: "team",
    badge: "Équipe",
    name: "Équipe",
    desc: "Pour les studios et agences avec plusieurs collaborateurs.",
    priceMensuel: "19",
    priceAnnuel: "15",
    annualNote: "par utilisateur · facturé annuellement",
    ctaLabel: "Contacter l'équipe",
    ctaHref: "mailto:hello@photoapp.fr",
  },
];
