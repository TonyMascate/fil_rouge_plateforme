import Link from "next/link";

export default function LandingMockup() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-20 h-16 border-b border-border">
        <span className="text-lg font-semibold text-primary">PhotoApp</span>
        <div className="flex items-center gap-8 text-sm text-muted-foreground">
          <Link href="#features" className="hover:text-foreground transition-colors">Fonctionnalités</Link>
          <Link href="#explorer" className="hover:text-foreground transition-colors">Explorer</Link>
          <Link href="#tarifs" className="hover:text-foreground transition-colors">Tarifs</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="#" className="px-4 py-2 text-sm font-medium rounded-md hover:bg-secondary transition-colors">
            Se connecter
          </Link>
          <Link href="#" className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            S'inscrire
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex items-center gap-16 px-20 py-24">
        <div className="flex-1 flex flex-col gap-6">
          <span className="inline-flex items-center gap-2 w-fit px-3 py-1 rounded-full border border-border text-sm text-muted-foreground">
            ✦ Nouvelle façon d'explorer vos photos
          </span>
          <h1 className="text-6xl font-bold leading-tight tracking-tight">
            Vos photos,{" "}
            <span className="text-primary">organisées par ambiance.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg">
            Uploadez vos photos, explorez-les par couleur et partagez vos meilleurs moments en quelques clics.
          </p>
          <div className="flex items-center gap-4 mt-2">
            <Link href="#" className="px-6 py-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              Commencer gratuitement
            </Link>
            <Link href="#" className="px-6 py-3 text-sm font-medium rounded-md border border-border hover:bg-secondary transition-colors">
              Voir la démo
            </Link>
          </div>
        </div>

        {/* Mockup placeholder */}
        <div className="flex-1 h-96 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground text-sm">
          Aperçu de l'application
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-secondary px-20 py-16">
        <div className="grid grid-cols-3 gap-8">
          {[
            { icon: "↑", title: "Upload intelligent", desc: "Drag & drop, reprise automatique, jusqu'à 50 MB par fichier." },
            { icon: "⊞", title: "Galerie & Albums", desc: "Organisez vos photos en albums et partagez-les via un lien public." },
            { icon: "◉", title: "Exploration Chromatique", desc: "Naviguez dans vos photos par couleur et par ambiance visuelle." },
          ].map((f) => (
            <div key={f.title} className="flex flex-col gap-3 p-6 rounded-xl bg-card border border-border">
              <span className="text-2xl">{f.icon}</span>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Killer Feature */}
      <section id="explorer" className="flex items-center gap-16 px-20 py-24">
        <div className="flex-1 h-80 rounded-2xl bg-gradient-to-br from-violet-500 via-pink-400 to-orange-300 flex items-center justify-center text-white text-sm font-medium">
          Nuage de nœuds chromatique
        </div>
        <div className="flex-1 flex flex-col gap-5">
          <span className="text-xs font-semibold tracking-widest text-primary uppercase">Killer Feature</span>
          <h2 className="text-4xl font-bold leading-tight">
            Explorez par couleur,<br />pas par date.
          </h2>
          <p className="text-muted-foreground">
            Notre moteur chromatique analyse vos photos et les regroupe par ambiance visuelle.
            Cliquez sur une couleur, laissez-vous surprendre.
          </p>
          <Link href="#" className="w-fit px-6 py-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            Découvrir
          </Link>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-primary px-20 py-20 flex flex-col items-center gap-6 text-center">
        <h2 className="text-4xl font-bold text-primary-foreground">
          Prêt à redécouvrir vos photos ?
        </h2>
        <p className="text-primary-foreground/80 max-w-md">
          Rejoignez des milliers d'utilisateurs qui explorent leur galerie autrement.
        </p>
        <Link href="#" className="px-8 py-3 text-sm font-semibold rounded-md bg-white text-primary hover:opacity-90 transition-opacity">
          Créer un compte gratuit
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-20 py-8 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
        <span>© 2026 PhotoApp. Tous droits réservés.</span>
        <div className="flex gap-6">
          <Link href="#" className="hover:text-foreground transition-colors">Confidentialité</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Conditions</Link>
        </div>
      </footer>

    </div>
  );
}
