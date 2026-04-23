import Link from "next/link";

function MacWindow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-border overflow-hidden ${className}`}>
      <div className="flex items-center gap-1.5 px-4 py-3 bg-zinc-50 border-b border-border">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <div className="flex-1 bg-white rounded-md h-5 ml-3 border border-border max-w-[180px]" />
      </div>
      {children}
    </div>
  );
}

export default function LandingMockupV3() {
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

      {/* Hero — plein écran */}
      <section className="relative flex flex-col items-center justify-center text-center px-8 overflow-hidden min-h-[calc(100vh-4rem)]">

        {/* Fond pointillé */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Carte flottante — haut gauche */}
        <div className="absolute top-10 left-14 bg-white rounded-2xl shadow-md p-4 w-52 text-left rotate-[-3deg] z-10">
          <p className="text-xs text-muted-foreground mb-2">Album • Été 2025</p>
          <div className="grid grid-cols-2 gap-1">
            {["bg-amber-200", "bg-rose-200", "bg-sky-200", "bg-emerald-200"].map((c, i) => (
              <div key={i} className={`${c} rounded-md h-14`} />
            ))}
          </div>
          <p className="text-xs font-medium mt-2">42 photos</p>
        </div>

        {/* Carte flottante — haut droit */}
        <div className="absolute top-8 right-14 bg-white rounded-2xl shadow-md p-4 w-56 text-left rotate-[2deg] z-10">
          <p className="text-xs text-muted-foreground mb-3">Exploration chromatique</p>
          <div className="flex gap-2 flex-wrap">
            {["bg-violet-400","bg-pink-400","bg-orange-300","bg-sky-400","bg-emerald-400","bg-rose-300"].map((c, i) => (
              <div key={i} className={`${c} rounded-full w-8 h-8`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Naviguez par ambiance →</p>
        </div>

        {/* Carte flottante — bas gauche */}
        <div className="absolute bottom-20 left-16 bg-white rounded-2xl shadow-md p-4 w-48 text-left rotate-[2deg] z-10">
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

        {/* Carte flottante — bas droit : mini fenêtre Mac */}
        <div className="absolute bottom-16 right-12 rotate-[-2deg] z-10">
          <MacWindow className="w-64">
            <div className="grid grid-cols-3 gap-1 p-2">
              {["bg-amber-300","bg-rose-300","bg-violet-400","bg-sky-300","bg-emerald-300","bg-pink-300"].map((c, i) => (
                <div key={i} className={`${c} h-14 rounded-lg`} />
              ))}
            </div>
          </MacWindow>
        </div>

        {/* Contenu central */}
        <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-border text-sm text-muted-foreground shadow-sm">
            ✦ Explorez vos souvenirs autrement
          </span>
          <h1 className="text-7xl font-bold leading-[1.05] tracking-tight">
            Vos photos,<br />
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
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            <span>⭐ 4,9/5</span>
            <span className="text-border">·</span>
            <span>+2 000 utilisateurs</span>
            <span className="text-border">·</span>
            <span>500 MB gratuits dès l'inscription</span>
          </div>
        </div>
      </section>

      {/* Wrapper features — fond unique avec glows ambiants */}
      <div className="relative overflow-hidden">

        {/* Glows ambiants — positionnés pour couvrir toutes les sections sans coupure */}
        <div className="absolute top-[5%] right-[-10%] w-[600px] h-[600px] bg-violet-200/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[38%] left-[-10%] w-[600px] h-[600px] bg-pink-200/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[70%] right-[-5%] w-[600px] h-[600px] bg-sky-200/20 rounded-full blur-[120px] pointer-events-none" />

        {/* Feature 1 — Upload */}
        <section className="py-28 px-20 relative z-10">
          <div className="max-w-5xl mx-auto flex items-center gap-20">
            <div className="flex-1 flex flex-col gap-5">
              <span className="text-xs font-semibold tracking-widest text-primary uppercase">Upload</span>
              <h2 className="text-4xl font-bold leading-tight">Glissez, déposez,<br />c'est fait.</h2>
              <p className="text-muted-foreground leading-relaxed max-w-sm">
                Upload jusqu'à 50 MB par fichier avec reprise automatique. Vos photos sont optimisées en quelques secondes.
              </p>
              <ul className="flex flex-col gap-2.5">
                {["Drag & drop natif", "Barre de progression en temps réel", "Optimisation automatique WebP"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1">
              <MacWindow>
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-center py-6 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-white shadow border border-violet-100 flex items-center justify-center text-xl text-violet-500">↑</div>
                      <p className="text-xs text-muted-foreground">Glissez vos photos ici</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { name: "vacances.jpg", size: "3,2 MB", w: "w-3/4", color: "bg-primary" },
                      { name: "portrait.png", size: "1,8 MB", w: "w-full", color: "bg-emerald-500" },
                      { name: "paysage.jpg", size: "4,1 MB", w: "w-1/3", color: "bg-primary" },
                    ].map((f) => (
                      <div key={f.name} className="bg-zinc-50 rounded-xl px-4 py-3 flex flex-col gap-2">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{f.name}</span>
                          <span className="text-muted-foreground">{f.size}</span>
                        </div>
                        <div className="w-full bg-zinc-200 rounded-full h-1.5">
                          <div className={`${f.color} h-1.5 rounded-full ${f.w}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-center text-muted-foreground">3 fichiers · 9,1 MB · Optimisation en cours…</p>
                </div>
              </MacWindow>
            </div>
          </div>
        </section>

        {/* Feature 2 — Killer Feature */}
        <section className="py-28 px-20 relative z-10">
          <div className="max-w-5xl mx-auto flex items-center gap-20 flex-row-reverse">
            <div className="flex-1 flex flex-col gap-5">
              <span className="text-xs font-semibold tracking-widest text-primary uppercase">Killer Feature</span>
              <h2 className="text-4xl font-bold leading-tight">Explorez par couleur,<br />pas par date.</h2>
              <p className="text-muted-foreground leading-relaxed max-w-sm">
                Notre moteur chromatique analyse chaque photo et la regroupe par ambiance visuelle. Cliquez sur une couleur, laissez-vous surprendre.
              </p>
              <Link href="#" className="w-fit px-6 py-3 text-sm font-medium rounded-full bg-foreground text-background hover:opacity-80 transition-opacity">
                Découvrir la feature →
              </Link>
            </div>
            <div className="flex-1">
              <MacWindow>
                <div className="p-5 flex flex-col gap-4">
                  {/* Palette de couleurs cliquables */}
                  <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-border">
                    {["bg-violet-500","bg-pink-400","bg-orange-400","bg-sky-400","bg-emerald-400","bg-rose-500","bg-amber-400","bg-indigo-400"].map((c, i) => (
                      <div key={i} className={`${c} rounded-full w-8 h-8 cursor-pointer shadow-sm ${i === 0 ? "ring-2 ring-offset-2 ring-violet-400" : ""}`} />
                    ))}
                  </div>
                  {/* Grille résultat */}
                  <div className="grid grid-cols-4 gap-2">
                    {["bg-violet-300","bg-violet-400","bg-violet-500","bg-violet-400","bg-indigo-400","bg-purple-400","bg-violet-300","bg-violet-500"].map((c, i) => (
                      <div key={i} className={`${c} rounded-xl h-16`} />
                    ))}
                  </div>
                  <p className="text-xs text-center text-muted-foreground">8 photos · Tonalité violette</p>
                </div>
              </MacWindow>
            </div>
          </div>
        </section>

        {/* Feature 3 — Partage */}
        <section className="py-28 px-20 relative z-10">
          <div className="max-w-5xl mx-auto flex items-center gap-20">
            <div className="flex-1 flex flex-col gap-5">
              <span className="text-xs font-semibold tracking-widest text-primary uppercase">Albums & Partage</span>
              <h2 className="text-4xl font-bold leading-tight">Partagez<br />en un lien.</h2>
              <p className="text-muted-foreground leading-relaxed max-w-sm">
                Créez des albums, partagez-les via un lien public. Vos proches voient vos photos sans créer de compte.
              </p>
              <ul className="flex flex-col gap-2.5">
                {["Albums illimités", "Lien public sans compte", "Vue détaillée de chaque photo"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1">
              <MacWindow>
                <div className="p-5 flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-2">
                    {["bg-amber-300","bg-rose-300","bg-sky-300","bg-violet-300","bg-emerald-300","bg-pink-300"].map((c, i) => (
                      <div key={i} className={`${c} h-20 rounded-xl`} />
                    ))}
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <div className="flex-1 bg-zinc-50 rounded-lg px-3 py-2 border border-border">
                      <span className="text-xs text-muted-foreground font-mono">photoapp.fr/s/xK92j</span>
                    </div>
                    <button className="px-3 py-2 text-xs font-semibold text-primary bg-primary/8 rounded-lg">Copier</button>
                  </div>
                  <p className="text-xs text-center text-sky-500 font-medium">✓ Accessible sans compte</p>
                </div>
              </MacWindow>
            </div>
          </div>
        </section>

      </div>

      {/* CTA final */}
      <section className="px-20 py-36 flex flex-col items-center gap-6 text-center">
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
