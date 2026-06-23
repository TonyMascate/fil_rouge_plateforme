"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "Puis-je changer de plan à tout moment ?",
    a: "Oui, vous pouvez passer à un plan supérieur ou inférieur à tout moment depuis vos paramètres. En cas de passage à un plan inférieur en cours d'abonnement annuel, le remboursement au prorata est automatique.",
  },
  {
    q: "Que se passe-t-il si je dépasse mon quota de stockage ?",
    a: "Vous recevez une notification par e-mail à 80% du quota utilisé. Au-delà, l'import est simplement suspendu — vos photos existantes restent accessibles et vos liens de partage continuent de fonctionner.",
  },
  {
    q: "L'essai gratuit du plan Pro nécessite-t-il une carte bancaire ?",
    a: "Non. L'essai gratuit de 14 jours est activé à l'inscription, sans carte bancaire requise. Vous serez invité à renseigner vos coordonnées bancaires uniquement à la fin de la période d'essai si vous souhaitez continuer.",
  },
  {
    q: "Comment fonctionne le partage sans inscription ?",
    a: "Chaque photo ou album génère un lien unique. Vos destinataires cliquent sur le lien et accèdent directement au contenu depuis leur navigateur — sans créer de compte, sans télécharger d'application.",
  },
  {
    q: "Mes photos sont-elles privées par défaut ?",
    a: "Oui. Toutes vos photos sont privées par défaut. Un lien de partage est généré uniquement lorsque vous le créez manuellement. Vous pouvez révoquer ce lien à tout moment.",
  },
];

function FaqItem({ q, a }: Readonly<{ q: string; a: string }>) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border last:border-b">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left text-base font-medium text-foreground">
        <span>{q}</span>
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 transition-all ${open ? "bg-primary text-white rotate-180" : "bg-muted text-muted-foreground"}`}>
          ▾
        </span>
      </button>
      {open && (
        <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export function FaqSection() {
  return (
    <section className="w-full max-w-2xl px-8 py-20 relative z-10">
      <div className="text-center mb-12">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">FAQ</p>
        <h2 className="text-3xl font-bold tracking-tight">Questions fréquentes</h2>
      </div>
      <div className="flex flex-col">
        {FAQS.map((f) => (
          <FaqItem key={f.q} q={f.q} a={f.a} />
        ))}
      </div>
    </section>
  );
}
