import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/Footer";
import { DotBackground, CtaSection } from "@/components/ui/FeatureSection";
import { PricingSection } from "../../../components/PricingSection";
import { FaqSection } from "../../../components/FaqSection";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TarifsPage() {
  return (
    <>
      <Navbar />
      <main className="relative flex flex-col items-center overflow-hidden">
        {/* Glows */}
        <div className="absolute top-0 right-[5%] w-[1000px] h-[1000px] bg-violet-300/20 rounded-full blur-[200px] pointer-events-none" />
        <div className="absolute top-[40%] left-0 w-[900px] h-[900px] bg-violet-200/20 rounded-full blur-[200px] pointer-events-none" />

        {/* Hero */}
        <section className="w-full relative overflow-hidden border-b border-border">
          <DotBackground />
          <div className="relative z-10 flex flex-col items-center text-center gap-6 pt-20 pb-12 px-8">
            <span className="px-4 py-1.5 rounded-full bg-card border border-border text-xs font-semibold tracking-widest uppercase text-primary shadow-sm">✦ Tarifs</span>
            <h1 className="text-6xl font-bold leading-[1.05] tracking-tight max-w-xl">
              Simple, <span className="text-primary">transparent.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">Commencez gratuitement. Passez au Pro quand vous en avez besoin. Aucune surprise.</p>
          </div>
        </section>

        {/* Plans (client — toggle billing) */}
        <PricingSection />

        {/* Comparison table */}
        <section className="w-full max-w-5xl px-8 pb-20 relative z-10">
          <div className="rounded-3xl border border-border overflow-hidden shadow-sm bg-white">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-b border-border">
              <div className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">Fonctionnalité</div>
              {["Starter", "Pro", "Équipe"].map((name, i) => (
                <div key={name} className={`px-4 py-4 text-center text-sm font-semibold border-l border-border ${i === 1 ? "text-primary bg-primary/[0.03]" : "text-foreground"}`}>
                  {name}
                </div>
              ))}
            </div>
            {[
              ["Stockage", "500 MB", "50 GB", "Illimité"],
              ["Albums", "✓", "✓", "✓"],
              ["Partage par lien", "✓", "✓", "✓"],
              ["Exploration chromatique", "✓", "✓", "✓"],
              ["Statistiques avancées", "✗", "✓", "✓"],
              ["Téléchargement HD", "✗", "✓", "✓"],
              ["Domaine personnalisé", "✗", "✗", "✓"],
              ["Support prioritaire", "✗", "✓", "✓"],
            ].map(([feat, ...vals], ri) => (
              <div key={ri} className={`grid grid-cols-[2fr_1fr_1fr_1fr] ${ri < 7 ? "border-b border-border" : ""} ${ri % 2 === 1 ? "bg-muted/20" : "bg-white"}`}>
                <div className="px-6 py-3.5 text-sm text-foreground">{feat}</div>
                {vals.map((v, ci) => (
                  <div key={ci} className={`px-4 py-3.5 text-center text-sm border-l border-border font-medium ${ci === 1 ? "bg-primary/[0.03]" : ""} ${v === "✓" ? (ci === 1 ? "text-primary" : "text-emerald-600") : "text-muted-foreground"}`}>
                    {v}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <FaqSection />

        <CtaSection
          title={
            <>
              Essayez <span className="text-primary">PhotoApp</span>
              <br />
              gratuitement.
            </>
          }
          subtitle="500 MB offerts · Aucune carte bancaire · Prêt en 30 secondes"></CtaSection>
      </main>
    </>
  );
}
