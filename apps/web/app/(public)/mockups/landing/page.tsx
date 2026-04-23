import Link from "next/link";

export default function LandingMockup() {
  return (
    <div className="min-h-screen bg-[#f8f8f6] text-foreground font-sans">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-10 h-16 bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <span className="text-lg font-semibold text-foreground">PhotoApp</span>
        <div className="flex items-center gap-8 text-sm text-muted-foreground">
          <Link href="#" className="hover:text-foreground transition-colors">Fonctionnalités</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Explorer</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Tarifs</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="#" className="px-4 py-2 text-sm font-medium hover:text-primary transition-colors">
            Se connecter
          </Link>
          <Link href="#" className="px-5 py-2 text-sm font-medium rounded-full bg-foreground text-background hover:opacity-80 transition-opacity">
            Commencer
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-8 pt-24 pb-32 overflow-hidden">

        {/* Fond pointillé */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Carte flottante — haut gauche */}
        <div className="absolute top-12 left-16 bg-white rounded-2xl shadow-md p-4 w-52 text-left rotate-[-3deg]">
          <p className="text-xs text-muted-foreground mb-2">Album • Été 2025</p>
          <div className="grid grid-cols-2 gap-1">
            {["bg-amber-200", "bg-rose-200", "bg-sky-200", "bg-emerald-200"].map((c, i) => (
              <div key={i} className={`${c} rounded-md h-14`} />
            ))}
          </div>
          <p className="text-xs font-medium mt-2">42 photos</p>
        </div>

        {/* Carte flottante — haut droit */}
        <div className="absolute top-8 right-16 bg-white rounded-2xl shadow-md p-4 w-56 text-left rotate-[2deg]">
          <p className="text-xs text-muted-foreground mb-3">Exploration chromatique</p>
          <div className="flex gap-2 flex-wrap">
            {["bg-violet-400","bg-pink-400","bg-orange-300","bg-sky-400","bg-emerald-400","bg-rose-300"].map((c, i) => (
              <div key={i} className={`${c} rounded-full w-8 h-8`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Naviguez par ambiance →</p>
        </div>

        {/* Carte flottante — bas gauche */}
        <div className="absolute bottom-16 left-20 bg-white rounded-2xl shadow-md p-4 w-48 text-left rotate-[2deg]">
          <p className="text-xs text-muted-foreground mb-2">Upload en cours</p>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 text-xs">↑</div>
            <div>
              <p className="text-xs font-medium">vacances.jpg</p>
              <p className="text-xs text-muted-foreground">3,2 MB</p>
            </div>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full w-3/4" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">74%</p>
        </div>

        {/* Carte flottante — bas droit */}
        <div className="absolute bottom-20 right-16 bg-white rounded-2xl shadow-md p-4 w-52 text-left rotate-[-2deg]">
          <p className="text-xs text-muted-foreground mb-2">Lien de partage</p>
          <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground truncate">photoapp.fr/s/xK92j</span>
            <span className="text-xs text-primary font-medium ml-auto">Copier</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">✓ Accessible sans compte</p>
        </div>

        {/* Contenu central */}
        <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-border text-sm text-muted-foreground shadow-sm">
            ✦ Explorez vos souvenirs autrement
          </span>
          <h1 className="text-7xl font-bold leading-[1.05] tracking-tight">
            Vos photos,
            <br />
            <span className="text-primary">par ambiance.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg">
            Uploadez, organisez et explorez vos photos par couleur. Partagez vos meilleurs moments en un clic.
          </p>
          <div className="flex items-center gap-4 mt-2">
            <Link href="#" className="px-8 py-3.5 text-sm font-semibold rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-lg shadow-primary/30">
              Commencer gratuitement
            </Link>
            <Link href="#" className="px-8 py-3.5 text-sm font-medium rounded-full bg-white border border-border hover:shadow-md transition-shadow">
              Voir la démo →
            </Link>
          </div>
        </div>
      </section>

      {/* Bande sociale */}
      <div className="flex items-center justify-center gap-3 py-4 bg-white border-y border-border text-sm text-muted-foreground">
        <span>⭐ 4.9/5</span>
        <span className="text-border">·</span>
        <span>+2 000 utilisateurs</span>
        <span className="text-border">·</span>
        <span>500 MB gratuits dès l'inscription</span>
      </div>

      {/* Features */}
      <section className="px-20 py-24">
        <p className="text-center text-xs font-semibold tracking-widest text-primary uppercase mb-4">Fonctionnalités</p>
        <h2 className="text-4xl font-bold text-center mb-16">Tout ce dont vous avez besoin</h2>
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: "↑", color: "bg-violet-50 text-violet-600", title: "Upload intelligent", desc: "Drag & drop, reprise automatique, jusqu'à 50 MB. Vos photos sont optimisées automatiquement." },
            { icon: "◉", color: "bg-pink-50 text-pink-600", title: "Exploration Chromatique", desc: "Naviguez dans vos photos par couleur et ambiance. Une façon unique de retrouver vos souvenirs." },
            { icon: "⊞", color: "bg-sky-50 text-sky-600", title: "Albums & Partage", desc: "Organisez en albums, partagez via un lien public. Accessible sans compte pour vos proches." },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-8 border border-border hover:shadow-md transition-shadow">
              <div className={`${f.color} w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-5`}>
                {f.icon}
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Killer Feature */}
      <section className="px-20 py-24 bg-white border-y border-border">
        <div className="max-w-5xl mx-auto flex items-center gap-20">
          <div className="flex-1 flex flex-col gap-5">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">Killer Feature</span>
            <h2 className="text-4xl font-bold leading-tight">
              Explorez par couleur,<br />pas par date.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Notre moteur chromatique analyse chaque photo et la regroupe par ambiance visuelle.
              Cliquez sur une couleur, laissez-vous surprendre par vos propres souvenirs.
            </p>
            <Link href="#" className="w-fit px-6 py-3 text-sm font-medium rounded-full bg-foreground text-background hover:opacity-80 transition-opacity">
              Découvrir la feature →
            </Link>
          </div>
          <div className="flex-1 h-80 rounded-3xl bg-gradient-to-br from-violet-500 via-pink-400 to-orange-300 relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center gap-4 flex-wrap p-8">
              {[
                { size: "w-20 h-20", color: "bg-violet-600/80" },
                { size: "w-14 h-14", color: "bg-pink-400/80" },
                { size: "w-10 h-10", color: "bg-orange-300/80" },
                { size: "w-16 h-16", color: "bg-rose-400/80" },
                { size: "w-12 h-12", color: "bg-purple-300/80" },
                { size: "w-8 h-8", color: "bg-amber-300/80" },
              ].map((n, i) => (
                <div key={i} className={`${n.size} ${n.color} rounded-full backdrop-blur-sm`} />
              ))}
            </div>
            <span className="relative text-white font-semibold text-sm">Nuage chromatique interactif</span>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-20 py-24 flex flex-col items-center gap-6 text-center">
        <h2 className="text-5xl font-bold tracking-tight">
          Prêt à voir vos photos<br />
          <span className="text-primary">autrement ?</span>
        </h2>
        <p className="text-muted-foreground max-w-md">
          Rejoignez des milliers d'utilisateurs qui explorent leur galerie par ambiance et couleur.
        </p>
        <Link href="#" className="px-10 py-4 text-sm font-semibold rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-lg shadow-primary/30">
          Créer un compte gratuit
        </Link>
        <p className="text-xs text-muted-foreground">Gratuit · 500 MB inclus · Sans carte bancaire</p>
      </section>

      {/* Footer */}
      <footer className="px-20 py-8 border-t border-border flex items-center justify-between text-sm text-muted-foreground bg-white">
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
