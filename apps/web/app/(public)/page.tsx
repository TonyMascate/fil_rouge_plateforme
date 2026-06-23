import { MacWindow } from "@/components/ui/MacWindow";
import { DotBackground, CtaSection } from "@/components/ui/FeatureSection";
import { UploadFeature, ChromaFeature, AlbumsFeature, GlowBoxes } from "@/components/ui/Features";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const HERO_SWATCHES = ["bg-violet-300", "bg-rose-300", "bg-indigo-400", "bg-pink-300", "bg-violet-500", "bg-amber-300", "bg-rose-400", "bg-violet-400", "bg-pink-400", "bg-indigo-300", "bg-amber-400", "bg-rose-300", "bg-violet-300", "bg-indigo-400", "bg-pink-300", "bg-rose-400", "bg-violet-400", "bg-amber-300"].map((color, index) => ({ id: `hero-swatch-${index}`, color }));

export default function Home() {
  return (
    <main className="relative flex flex-col justify-start items-center gap-35 pb-35 px-8 overflow-hidden">
        {/* Glows */}
        <GlowBoxes />

        {/* Hero */}
        <section className="w-full relative overflow-hidden flex flex-col">
          <DotBackground />
          <div className="flex flex-col items-center text-center gap-6 pt-16 pb-12 px-8 z-10">
            <span className="px-4 py-1.5 rounded-full bg-card border border-border text-sm text-muted-foreground shadow-sm">✦ Explorez vos souvenirs autrement</span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight max-w-3xl">
              Vos photos,
              <br />
              <span className="text-primary">par ambiance.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg">Uploadez, organisez et explorez vos photos par couleur. Partagez vos meilleurs moments en un clic.</p>
            <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/30">
              <Link href="/register">Commencer gratuitement</Link>
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span>⭐ 4,9/5</span>
              <span>+2 000 utilisateurs</span>
              <span>500 MB gratuits dès l'inscription</span>
            </div>
          </div>
          <div className="relative z-10 flex-1 flex items-end justify-center px-4 sm:px-8 md:px-16 pb-0">
            <MacWindow className="w-full max-w-5xl rounded-b-none shadow-2xl">
              <div className="p-4 grid grid-cols-6 gap-2 h-72 content-start">
                {HERO_SWATCHES.map(({ id, color }) => (
                  <div key={id} className={`${color} rounded-xl h-20`} />
                ))}
              </div>
            </MacWindow>
          </div>
        </section>

        <section className="w-full max-w-6xl flex flex-col items-center gap-35">
          <UploadFeature />
          <ChromaFeature />
          <AlbumsFeature />

          <CtaSection
            title={
              <>
                Prêt à voir vos photos
                <br />
                <span className="text-primary">autrement ?</span>
              </>
            }
            subtitle="Rejoignez des milliers d'utilisateurs qui explorent leur galerie par ambiance et couleur."
            footnote="Gratuit · 500 MB inclus · Sans carte bancaire"
            className="relative z-10"
          />
        </section>
    </main>
  );
}
