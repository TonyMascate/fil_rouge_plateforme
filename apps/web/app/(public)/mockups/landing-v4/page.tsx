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

export default function LandingMockupV4() {
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
      <section className="relative overflow-hidden min-h-[calc(100vh-4rem)] flex flex-col">

        {/* Fond pointillé */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Contenu texte */}
        <div className="relative z-10 flex flex-col items-center text-center gap-6 pt-16 pb-12 px-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-border text-sm text-muted-foreground shadow-sm">
            ✦ Explorez vos souvenirs autrement
          </span>
          <h1 className="text-7xl font-bold leading-[1.05] tracking-tight max-w-3xl">
            Vos photos,<br />
            <span className="text-primary">par ambiance.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg">
            Uploadez, organisez et explorez vos photos par couleur. Partagez vos meilleurs moments en un clic.
          </p>
          <div className="flex items-center gap-4">
            <Link href="#" className="px-8 py-3.5 text-sm font-semibold rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-lg shadow-primary/30">
              Commencer gratuitement
            </Link>
            <Link href="#" className="px-8 py-3.5 text-sm font-medium rounded-full bg-white border border-border hover:shadow-md transition-shadow">
              Voir la démo →
            </Link>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>⭐ 4,9/5</span>
            <span className="text-border">·</span>
            <span>+2 000 utilisateurs</span>
            <span className="text-border">·</span>
            <span>500 MB gratuits dès l'inscription</span>
          </div>
        </div>

        {/* Grande fenêtre Mac — preview app */}
        <div className="relative z-10 flex-1 flex items-end justify-center px-16 pb-0">
          <MacWindow className="w-full max-w-5xl rounded-b-none shadow-2xl">
            <div className="p-4 grid grid-cols-6 gap-2 h-72 content-start">
              {[
                "bg-violet-300","bg-rose-300","bg-indigo-400","bg-pink-300","bg-violet-500","bg-amber-300",
                "bg-rose-400","bg-violet-400","bg-pink-400","bg-indigo-300","bg-amber-400","bg-rose-300",
                "bg-violet-300","bg-indigo-400","bg-pink-300","bg-rose-400","bg-violet-400","bg-amber-300",
              ].map((c, i) => (
                <div key={i} className={`${c} rounded-xl h-20`} />
              ))}
            </div>
          </MacWindow>
        </div>
      </section>

      {/* Wrapper features */}
      <div className="relative overflow-hidden bg-[#f8f8f6]">

        {/* Glows ambiants continus — violet uniquement */}
        <div className="absolute top-[0%] right-[5%] w-[1300px] h-[1300px] bg-violet-300/10 rounded-full blur-[200px] pointer-events-none" />
        <div className="absolute top-[40%] left-[0%] w-[1300px] h-[1300px] bg-violet-200/8 rounded-full blur-[200px] pointer-events-none" />
        <div className="absolute top-[72%] right-[5%] w-[1100px] h-[1100px] bg-violet-300/8 rounded-full blur-[200px] pointer-events-none" />

        {/* Feature 1 — Upload */}
        <section className="py-28 px-20 relative z-10">
          <div className="max-w-6xl mx-auto flex items-center gap-16">

            {/* Texte */}
            <div className="flex-1 flex flex-col gap-5 max-w-sm">
              <span className="text-xs font-semibold tracking-widest text-primary uppercase">Upload</span>
              <h2 className="text-4xl font-bold leading-tight">Glissez, déposez,<br />c'est fait.</h2>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Upload jusqu'à 50 MB par fichier avec reprise automatique. Vos photos sont optimisées en quelques secondes.
              </p>
              <ul className="flex flex-col gap-2.5">
                {["Drag & drop natif", "Progression en temps réel", "Optimisation WebP auto"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mac window upload */}
            <div className="flex-[1.4] relative">
              <MacWindow>
                <div className="p-5 flex gap-4">
                  {/* Zone de drop */}
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="flex items-center justify-center py-8 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-white shadow border border-violet-100 flex items-center justify-center text-xl text-violet-500">↑</div>
                        <p className="text-xs text-muted-foreground text-center">Glissez vos photos ici<br /><span className="text-primary font-medium">ou cliquez pour sélectionner</span></p>
                      </div>
                    </div>
                    <p className="text-xs text-center text-muted-foreground">JPG, PNG, WEBP, HEIC · Max 50 MB</p>
                  </div>
                  {/* File list */}
                  <div className="flex-1 flex flex-col gap-2.5 justify-center">
                    {[
                      { name: "vacances.jpg", size: "3,2 MB", w: "75%", color: "bg-primary", done: false },
                      { name: "portrait.png", size: "1,8 MB", w: "100%", color: "bg-primary", done: true },
                      { name: "paysage.jpg", size: "4,1 MB", w: "33%", color: "bg-primary", done: false },
                      { name: "bretagne.jpg", size: "2,6 MB", w: "0%", color: "bg-primary", done: false },
                    ].map((f) => (
                      <div key={f.name} className="bg-zinc-50 rounded-xl px-4 py-3 flex flex-col gap-2 border border-border/50">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium truncate max-w-[100px]">{f.name}</span>
                          <span className={`text-xs font-medium ${f.done ? "text-primary" : "text-muted-foreground"}`}>{f.done ? "✓" : f.size}</span>
                        </div>
                        <div className="w-full bg-zinc-200 rounded-full h-1.5">
                          <div className={`${f.color} h-1.5 rounded-full transition-all`} style={{ width: f.w }} />
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-center text-muted-foreground pt-1">4 fichiers · 11,7 MB</p>
                  </div>
                </div>
              </MacWindow>
              {/* Badge flottant */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-md border border-border px-4 py-2.5 flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">✓</div>
                <span className="text-xs font-medium">portrait.png optimisé · <span className="text-primary">−62%</span></span>
              </div>
            </div>

          </div>
        </section>

        {/* Feature 2 — Killer Feature */}
        <section className="py-28 px-20 relative z-10">
          <div className="max-w-6xl mx-auto flex items-center gap-16 flex-row-reverse">

            {/* Texte */}
            <div className="flex-1 flex flex-col gap-5 max-w-sm">
              <span className="text-xs font-semibold tracking-widest text-primary uppercase">Killer Feature</span>
              <h2 className="text-4xl font-bold leading-tight">Une nouvelle façon<br />d'explorer vos photos.</h2>
              <p className="text-muted-foreground leading-relaxed text-sm">
                En plus de la navigation classique par date, notre moteur chromatique regroupe vos photos par ambiance visuelle. Cliquez sur une couleur, laissez-vous surprendre.
              </p>
              <Link href="#" className="w-fit px-6 py-3 text-sm font-medium rounded-full bg-foreground text-background hover:opacity-80 transition-opacity">
                Découvrir la feature →
              </Link>
            </div>

            {/* Mac window killer feature */}
            <div className="flex-[1.4] relative">
              <MacWindow>
                <div className="flex flex-col h-72">
                  {/* Onglets Par date / Par couleur */}
                  <div className="flex items-center gap-1 px-4 py-2.5 border-b border-border bg-zinc-50">
                    <div className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-white cursor-pointer">Par date</div>
                    <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white shadow-sm border border-border cursor-pointer text-foreground">Par couleur ✦</div>
                  </div>
                  {/* Palette + résultats */}
                  <div className="flex flex-1 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border w-full flex-wrap content-start">
                      {[
                        { c: "bg-violet-500", active: true },
                        { c: "bg-rose-400", active: false },
                        { c: "bg-amber-400", active: false },
                        { c: "bg-pink-400", active: false },
                        { c: "bg-indigo-500", active: false },
                        { c: "bg-orange-400", active: false },
                        { c: "bg-purple-500", active: false },
                        { c: "bg-red-400", active: false },
                      ].map((n, i) => (
                        <div key={i} className={`${n.c} rounded-full w-8 h-8 cursor-pointer shrink-0 ${n.active ? "ring-2 ring-offset-2 ring-violet-400 scale-110" : "opacity-60"}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 p-4 flex flex-col gap-2 overflow-hidden">
                    <p className="text-xs text-muted-foreground">12 photos · Tonalité <span className="text-violet-500 font-semibold">violette</span></p>
                    <div className="grid grid-cols-4 gap-2">
                      {["bg-violet-300","bg-violet-500","bg-violet-400","bg-indigo-400","bg-purple-400","bg-violet-300","bg-violet-600","bg-indigo-300"].map((c, i) => (
                        <div key={i} className={`${c} rounded-xl h-14`} />
                      ))}
                    </div>
                  </div>
                </div>
              </MacWindow>
            </div>

          </div>
        </section>

        {/* Feature 3 — Partage */}
        <section className="py-28 px-20 relative z-10">
          <div className="max-w-6xl mx-auto flex items-center gap-16">

            {/* Texte */}
            <div className="flex-1 flex flex-col gap-5 max-w-sm">
              <span className="text-xs font-semibold tracking-widest text-primary uppercase">Albums & Partage</span>
              <h2 className="text-4xl font-bold leading-tight">Partagez<br />en un lien.</h2>
              <p className="text-muted-foreground leading-relaxed text-sm">
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

            {/* Mac window partage */}
            <div className="flex-[1.4] relative">
              <MacWindow>
                <div className="flex h-72">
                  {/* Galerie album */}
                  <div className="flex-1 p-4 grid grid-cols-3 gap-2 content-start">
                    {["bg-violet-300","bg-rose-300","bg-amber-300","bg-pink-400","bg-indigo-300","bg-rose-400","bg-violet-400","bg-amber-400","bg-pink-300"].map((c, i) => (
                      <div key={i} className={`${c} rounded-xl h-16`} />
                    ))}
                  </div>
                  {/* Panel partage */}
                  <div className="w-52 border-l border-border p-4 flex flex-col gap-4 bg-zinc-50/50 shrink-0">
                    <div>
                      <p className="text-xs font-semibold mb-1">Vacances Bretagne</p>
                      <p className="text-xs text-muted-foreground">42 photos · Public</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground">Lien de partage</p>
                      <div className="bg-white rounded-lg px-3 py-2 border border-border">
                        <span className="text-xs text-muted-foreground font-mono">photoapp.fr/s/xK92j</span>
                      </div>
                      <button className="w-full py-2 text-xs font-semibold text-white bg-primary rounded-lg">Copier le lien</button>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                      <span className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">✓</span>
                      Accessible sans compte
                    </div>
                  </div>
                </div>
              </MacWindow>
            </div>

          </div>
        </section>

        {/* CTA final — dans le wrapper pour hériter du fond sans coupure */}
        <section className="px-20 py-36 flex flex-col items-center gap-6 text-center relative z-10">
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

      </div>

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
