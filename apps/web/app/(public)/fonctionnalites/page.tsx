import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/Footer";
import { DotBackground, CtaSection } from "@/components/ui/FeatureSection";
import { UploadFeature, ChromaFeature, ShareFeature, AlbumsFeature, GlowBoxes } from "@/components/ui/Features";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function FonctionnalitesPage() {
  return (
    <>
      <main className="relative flex flex-col items-center gap-35 pb-35 px-8 overflow-hidden">
        {/* Glows */}
        <GlowBoxes />
        {/* Hero */}
        <section className="w-full relative overflow-hidden ">
          <DotBackground />
          <div className="relative z-10 flex flex-col items-center text-center gap-6 pt-20 pb-16 px-8">
            <span className="px-4 py-1.5 rounded-full bg-card border border-border text-sm text-muted-foreground shadow-sm">✦ Fonctionnalités</span>
            <h1 className="text-6xl font-bold leading-[1.05] tracking-tight max-w-2xl">
              Tout ce dont vous avez besoin
              <br />
              <span className="text-primary">pour vos photos.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">De l'import à la diffusion, en passant par l'exploration chromatique — PhotoApp centralise l'ensemble de votre flux photo.</p>
            <div className="flex items-center gap-3">
              <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/30">
                <Link href="/register">Commencer gratuitement</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link href="#">Voir les tarifs →</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="w-full max-w-6xl flex flex-col items-center gap-28 relative z-10">
          <UploadFeature />
          <ChromaFeature />
          <ShareFeature />
          <AlbumsFeature />
        </section>

        {/* CTA final */}
        <CtaSection
          title={
            <>
              Prêt à découvrir
              <br />
              <span className="text-primary">PhotoApp ?</span>
            </>
          }
          subtitle="500 MB gratuits · Aucune carte bancaire · Partage illimité"
        />
      </main>
    </>
  );
}
