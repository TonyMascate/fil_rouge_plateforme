import type { ReactNode } from "react";
import { MacWindow } from "@/components/ui/MacWindow";
import Navbar from "@/components/ui/Navbar";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function FeatureText({ tag, title, description, children }: { tag: string; title: ReactNode; description: string; children?: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col gap-5 max-w-sm">
      <span className="text-xs font-semibold tracking-widest text-primary uppercase">{tag}</span>
      <h2 className="text-4xl font-bold leading-tight">{title}</h2>
      <p className="text-muted-foreground leading-relaxed text-sm">{description}</p>
      {children}
    </div>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="relative flex flex-col justify-start items-center gap-35 pb-35 overflow-hidden">
        {/* Hero */}
        <section className="w-full relative overflow-hidden flex flex-col">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="flex flex-col items-center text-center gap-6 pt-16 pb-12 px-8 z-10">
            <span className="px-4 py-1.5 rounded-full bg-card border border-border text-sm text-muted-foreground shadow-sm">✦ Explorez vos souvenirs autrement</span>
            <h1 className="text-7xl font-bold leading-[1.05] tracking-tight max-w-3xl">
              Vos photos,
              <br />
              <span className="text-primary">par ambiance.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg">Uploadez, organisez et explorez vos photos par couleur. Partagez vos meilleurs moments en un clic.</p>
            <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/30">
              <Link href="/register">Commencer gratuitement</Link>
            </Button>
            <div className="flex items-center gap-8 text-xs text-muted-foreground">
              <span>⭐ 4,9/5</span>
              <span>+2 000 utilisateurs</span>
              <span>500 MB gratuits dès l'inscription</span>
            </div>
          </div>
          <div className="relative z-10 flex-1 flex items-end justify-center px-16 pb-0">
            <MacWindow className="w-full max-w-5xl rounded-b-none shadow-2xl">
              <div className="p-4 grid grid-cols-6 gap-2 h-72 content-start">
                {["bg-violet-300", "bg-rose-300", "bg-indigo-400", "bg-pink-300", "bg-violet-500", "bg-amber-300", "bg-rose-400", "bg-violet-400", "bg-pink-400", "bg-indigo-300", "bg-amber-400", "bg-rose-300", "bg-violet-300", "bg-indigo-400", "bg-pink-300", "bg-rose-400", "bg-violet-400", "bg-amber-300"].map((c, i) => (
                  <div key={i} className={`${c} rounded-xl h-20`} />
                ))}
              </div>
            </MacWindow>
          </div>
        </section>

        {/* Glows ambiants — positionnés par rapport à <main> */}
        <div className="absolute top-0 right-[5%] w-[1300px] h-[1300px] bg-violet-300/20rounded-full blur-[200px] pointer-events-none" />
        <div className="absolute top-[40%] left-0 w-[1300px] h-[1300px] bg-violet-200/20 rounded-full blur-[200px] pointer-events-none" />
        <div className="absolute top-[72%] right-[5%] w-[1100px] h-[1100px] bg-violet-300/20 rounded-full blur-[200px] pointer-events-none" />

        <section className="w-full max-w-6xl flex flex-col items-center gap-35">
          {/* Feature 1 — Upload */}
          <section className="w-full">
            <div className="w-full flex items-center gap-16">
              <FeatureText
                tag="Upload"
                title={
                  <>
                    Glissez, déposez,
                    <br />
                    c'est fait.
                  </>
                }
                description="Upload jusqu'à 50 MB par fichier avec reprise automatique. Vos photos sont optimisées en quelques secondes.">
                <CheckList items={["Drag & drop natif", "Progression en temps réel", "Optimisation WebP auto"]} />
              </FeatureText>

              <div className="flex-[1.4] relative">
                <MacWindow>
                  <div className="p-5 flex gap-4">
                    <div className="flex-1 flex flex-col gap-4">
                      <div className="flex items-center justify-center py-8 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-background shadow border border-border flex items-center justify-center text-xl text-violet-500">↑</div>
                          <p className="text-xs text-muted-foreground text-center">
                            Glissez vos photos ici
                            <br />
                            <span className="text-primary font-medium">ou cliquez pour sélectionner</span>
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-center text-muted-foreground">JPG, PNG, WEBP, HEIC · Max 50 MB</p>
                    </div>
                    <div className="flex-1 flex flex-col gap-2.5 justify-center">
                      {[
                        { name: "vacances.jpg", size: "3,2 MB", w: "75%", done: false },
                        { name: "portrait.png", size: "1,8 MB", w: "100%", done: true },
                        { name: "paysage.jpg", size: "4,1 MB", w: "33%", done: false },
                        { name: "bretagne.jpg", size: "2,6 MB", w: "0%", done: false },
                      ].map((f) => (
                        <div key={f.name} className="bg-muted/50 rounded-xl px-4 py-3 flex flex-col gap-2 border border-border/50">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-medium truncate max-w-[100px]">{f.name}</span>
                            <span className={`text-xs font-medium ${f.done ? "text-primary" : "text-muted-foreground"}`}>{f.done ? "✓" : f.size}</span>
                          </div>
                          <div className="w-full bg-border rounded-full h-1.5">
                            <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: f.w }} />
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-center text-muted-foreground pt-1">4 fichiers · 11,7 MB</p>
                    </div>
                  </div>
                </MacWindow>
                <div className="absolute -bottom-4 -left-4 bg-background rounded-xl shadow-md border border-border px-4 py-2.5 flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">✓</div>
                  <span className="text-xs font-medium">
                    portrait.png optimisé · <span className="text-primary">−62%</span>
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Feature 2 — Killer Feature */}
          <section className="w-full">
            <div className="w-full flex items-center gap-16 flex-row-reverse">
              <FeatureText tag="Killer Feature" title="Une nouvelle façon d'explorer vos photos." description="En plus de la navigation classique par date, notre moteur chromatique regroupe vos photos par ambiance visuelle. Cliquez sur une couleur, laissez-vous surprendre.">
                <Button asChild className="w-fit rounded-full bg-foreground text-background hover:bg-foreground/80">
                  <Link href="#">Découvrir la feature →</Link>
                </Button>
              </FeatureText>

              <div className="flex-[1.4] relative">
                <MacWindow>
                  <div className="flex flex-col h-72">
                    <div className="flex items-center gap-1 px-4 py-2.5 border-b border-border bg-muted/50">
                      <div className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-background cursor-pointer">Par date</div>
                      <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-background shadow-sm border border-border cursor-pointer text-foreground">Par couleur ✦</div>
                    </div>
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
                      <p className="text-xs text-muted-foreground">
                        12 photos · Tonalité <span className="text-violet-500 font-semibold">violette</span>
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {["bg-violet-300", "bg-violet-500", "bg-violet-400", "bg-indigo-400", "bg-purple-400", "bg-violet-300", "bg-violet-600", "bg-indigo-300"].map((c, i) => (
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
          <section className="w-full">
            <div className="flex items-center gap-16">
              <FeatureText
                tag="Albums & Partage"
                title={
                  <>
                    Partagez
                    <br />
                    en un lien.
                  </>
                }
                description="Créez des albums, partagez-les via un lien public. Vos proches voient vos photos sans créer de compte.">
                <CheckList items={["Albums illimités", "Lien public sans compte", "Vue détaillée de chaque photo"]} />
              </FeatureText>

              <div className="flex-[1.4] relative">
                <MacWindow>
                  <div className="flex h-72">
                    <div className="flex-1 p-4 grid grid-cols-3 gap-2 content-start">
                      {["bg-violet-300", "bg-rose-300", "bg-amber-300", "bg-pink-400", "bg-indigo-300", "bg-rose-400", "bg-violet-400", "bg-amber-400", "bg-pink-300"].map((c, i) => (
                        <div key={i} className={`${c} rounded-xl h-16`} />
                      ))}
                    </div>
                    <div className="w-52 border-l border-border p-4 flex flex-col gap-4 bg-muted/30 shrink-0">
                      <div>
                        <p className="text-xs font-semibold mb-1">Vacances Bretagne</p>
                        <p className="text-xs text-muted-foreground">42 photos · Public</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground">Lien de partage</p>
                        <div className="bg-background rounded-lg px-3 py-2 border border-border">
                          <span className="text-xs text-muted-foreground font-mono">photoapp.fr/s/xK92j</span>
                        </div>
                        <Button size="sm" className="w-full rounded-lg">
                          Copier le lien
                        </Button>
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

          {/* CTA final */}
          <section className="flex flex-col items-center gap-6 text-center relative z-10">
            <h2 className="text-5xl font-bold tracking-tight">
              Prêt à voir vos photos
              <br />
              <span className="text-primary">autrement ?</span>
            </h2>
            <p className="text-muted-foreground max-w-md">Rejoignez des milliers d'utilisateurs qui explorent leur galerie par ambiance et couleur.</p>
            <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/30">
              <Link href="#">Créer un compte gratuit</Link>
            </Button>
            <p className="text-xs text-muted-foreground">Gratuit · 500 MB inclus · Sans carte bancaire</p>
          </section>
        </section>
      </main>
    </>
  );
}
