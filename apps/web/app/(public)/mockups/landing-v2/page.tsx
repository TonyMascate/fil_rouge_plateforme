import Link from "next/link";

export default function LandingMockupV2() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-10 h-16 sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <span className="text-lg font-semibold">PhotoApp</span>
        <div className="flex items-center gap-8 text-sm text-muted-foreground">
          <Link href="#" className="hover:text-foreground transition-colors">Fonctionnalités</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Explorer</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Tarifs</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="#" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Se connecter
          </Link>
          <Link href="#" className="px-5 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            S'inscrire gratuitement
          </Link>
        </div>
      </nav>

      {/* Hero sombre */}
      <section className="relative bg-zinc-950 text-white overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/40 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-8 pt-20 pb-12 gap-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 text-xs text-white/50 bg-white/5">
            ✦ Exploration Chromatique — Découvrez vos photos autrement
          </span>
          <h1 className="text-7xl font-bold leading-[1.05] tracking-tight max-w-4xl">
            Vos souvenirs,<br />
            <span className="text-primary">par ambiance.</span>
          </h1>
          <p className="text-lg text-white/50 max-w-md">
            Une galerie photo qui parle à vos sens. Explorez, organisez et partagez par couleur.
          </p>
          <div className="flex items-center gap-4 mt-2">
            <Link href="#" className="px-8 py-3.5 text-sm font-semibold rounded-lg bg-primary text-white hover:opacity-90 transition-opacity shadow-lg shadow-primary/40">
              Commencer gratuitement
            </Link>
            <Link href="#" className="px-8 py-3.5 text-sm font-medium rounded-lg border border-white/20 text-white/80 hover:bg-white/5 transition-colors">
              Voir la démo →
            </Link>
          </div>
        </div>

        {/* Aperçu app */}
        <div className="relative z-10 px-20 pb-0 flex justify-center">
          <div className="w-full max-w-5xl rounded-t-2xl overflow-hidden border border-white/10" style={{ background: "#18181b" }}>
            {/* Barre titre */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <div className="w-3 h-3 rounded-full bg-red-400/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
              <div className="w-3 h-3 rounded-full bg-green-400/60" />
              <div className="flex-1 bg-white/10 rounded-md h-5 ml-3 max-w-xs" />
            </div>
            {/* Galerie */}
            <div className="grid grid-cols-4 gap-2 p-4">
              {[
                "bg-amber-400", "bg-rose-400", "bg-violet-500", "bg-sky-400",
                "bg-emerald-400", "bg-orange-400", "bg-pink-500", "bg-indigo-400",
              ].map((c, i) => (
                <div key={i} className={`${c} rounded-xl h-36`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <div className="border-b border-border px-20 py-5 flex items-center gap-12 text-sm text-muted-foreground">
        <span className="shrink-0">Ils nous font confiance</span>
        <div className="flex items-center gap-10 font-semibold text-foreground/30 text-base">
          <span>Acme Co.</span>
          <span>Globex</span>
          <span>Initech</span>
          <span>Umbrella</span>
          <span>Hooli</span>
        </div>
      </div>

      {/* Features en alternance */}
      <section className="px-20 py-24 flex flex-col gap-20">

        {/* Upload */}
        <div className="flex items-center gap-16">
          <div className="flex-1 flex flex-col gap-4">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">Upload</span>
            <h2 className="text-3xl font-bold">Glissez, déposez, c'est fait.</h2>
            <p className="text-muted-foreground leading-relaxed">
              Upload jusqu'à 50 MB par fichier avec reprise automatique en cas de coupure. Vos photos sont optimisées et disponibles en quelques secondes.
            </p>
            <ul className="flex flex-col gap-2 mt-2">
              {["Drag & drop natif", "Barre de progression en temps réel", "Optimisation automatique WebP"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-primary font-bold">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 h-72 rounded-2xl bg-violet-50 border border-violet-100 flex flex-col items-center justify-center gap-4 p-8">
            <div className="w-20 h-20 rounded-2xl bg-white shadow-md border border-violet-100 flex items-center justify-center text-3xl text-violet-600">↑</div>
            <div className="w-full max-w-xs flex flex-col gap-3">
              {[
                { name: "vacances.jpg", size: "3,2 MB", progress: "w-3/4", color: "bg-primary" },
                { name: "portrait.png", size: "1,8 MB", progress: "w-full", color: "bg-emerald-500" },
                { name: "paysage.jpg", size: "4,1 MB", progress: "w-1/3", color: "bg-primary" },
              ].map((f) => (
                <div key={f.name} className="bg-white rounded-xl px-4 py-3 border border-violet-100 flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">{f.name}</span>
                    <span className="text-muted-foreground">{f.size}</span>
                  </div>
                  <div className="w-full bg-violet-100 rounded-full h-1.5">
                    <div className={`${f.color} h-1.5 rounded-full ${f.progress}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Killer Feature */}
        <div className="flex items-center gap-16 flex-row-reverse">
          <div className="flex-1 flex flex-col gap-4">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">Killer Feature</span>
            <h2 className="text-3xl font-bold">Explorez par couleur,<br />pas par date.</h2>
            <p className="text-muted-foreground leading-relaxed">
              Notre moteur chromatique analyse chaque photo et la regroupe par ambiance. Naviguez dans vos souvenirs comme jamais auparavant.
            </p>
            <Link href="#" className="w-fit text-sm font-semibold text-primary hover:underline">
              En savoir plus →
            </Link>
          </div>
          <div className="flex-1 h-72 rounded-2xl bg-gradient-to-br from-pink-50 via-violet-50 to-orange-50 border border-pink-100 flex items-center justify-center overflow-hidden">
            <div className="relative w-64 h-64">
              {[
                { w: 80, h: 80, color: "bg-violet-500", top: 20, left: 80 },
                { w: 56, h: 56, color: "bg-pink-400", top: 0, left: 160 },
                { w: 44, h: 44, color: "bg-orange-400", top: 90, left: 200 },
                { w: 68, h: 68, color: "bg-rose-500", top: 140, left: 60 },
                { w: 40, h: 40, color: "bg-purple-400", top: 60, left: 10 },
                { w: 52, h: 52, color: "bg-amber-400", top: 170, left: 160 },
                { w: 32, h: 32, color: "bg-sky-400", top: 10, left: 40 },
              ].map((n, i) => (
                <div
                  key={i}
                  className={`${n.color} absolute rounded-full opacity-85`}
                  style={{ width: n.w, height: n.h, top: n.top, left: n.left }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Partage */}
        <div className="flex items-center gap-16">
          <div className="flex-1 flex flex-col gap-4">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">Albums & Partage</span>
            <h2 className="text-3xl font-bold">Partagez en un lien.</h2>
            <p className="text-muted-foreground leading-relaxed">
              Créez des albums, partagez-les via un lien public. Vos proches peuvent voir vos photos sans créer de compte.
            </p>
            <ul className="flex flex-col gap-2 mt-2">
              {["Albums illimités", "Lien public sans compte", "Vue détaillée de chaque photo"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-primary font-bold">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 h-72 rounded-2xl bg-sky-50 border border-sky-100 flex flex-col items-center justify-center gap-5 p-8">
            <div className="w-full max-w-sm bg-white rounded-2xl border border-sky-200 overflow-hidden shadow-sm">
              <div className="grid grid-cols-3 gap-1 p-1">
                {["bg-amber-300","bg-rose-300","bg-sky-300","bg-violet-300","bg-emerald-300","bg-pink-300"].map((c,i) => (
                  <div key={i} className={`${c} h-20 rounded-xl`} />
                ))}
              </div>
              <div className="px-4 py-3 border-t border-sky-100 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">photoapp.fr/s/xK92j</span>
                <span className="text-xs font-semibold text-primary">Copier</span>
              </div>
            </div>
            <p className="text-xs text-sky-500 font-medium">✓ Accessible sans compte</p>
          </div>
        </div>

      </section>

      {/* CTA final */}
      <section className="bg-zinc-950 px-20 py-24 flex flex-col items-center gap-6 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-primary/25 rounded-full blur-[80px]" />
        <h2 className="relative text-5xl font-bold text-white tracking-tight">
          Prêt à redécouvrir<br />vos photos ?
        </h2>
        <p className="relative text-white/40 max-w-md">
          Gratuit, sans carte bancaire. 500 MB inclus dès l'inscription.
        </p>
        <Link href="#" className="relative px-10 py-4 text-sm font-semibold rounded-lg bg-primary text-white hover:opacity-90 transition-opacity shadow-lg shadow-primary/40">
          Créer un compte gratuit
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-20 py-8 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">PhotoApp</span>
        <div className="flex gap-6">
          <Link href="#" className="hover:text-foreground transition-colors">Confidentialité</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Conditions</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
        </div>
        <span>© 2026 PhotoApp</span>
      </footer>

    </div>
  );
}
