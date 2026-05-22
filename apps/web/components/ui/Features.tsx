import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MacWindow } from "@/components/ui/MacWindow";
import { FeatureText, FeatureRow, CheckList } from "@/components/ui/FeatureSection";

// — Visuals —

function UploadVisual() {
  const files = [
    { name: "vacances_nice.jpg", size: "3,2 MB", w: "100%", done: true },
    { name: "portrait_marie.jpg", size: "2,8 MB", w: "72%", done: false },
    { name: "coucher_soleil.jpg", size: "4,1 MB", w: "40%", done: false },
    { name: "bretagne.jpg", size: "2,6 MB", w: "0%", done: false },
  ];
  return (
    <div className="relative">
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
            <p className="text-xs text-center text-muted-foreground">JPG, PNG, HEIC, RAW · Max 50 MB</p>
          </div>
          <div className="flex-1 flex flex-col gap-2.5 justify-center">
            {files.map((f) => (
              <div key={f.name} className="bg-muted/50 rounded-xl px-4 py-3 flex flex-col gap-2 border border-border/50">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium truncate max-w-[110px]">{f.name}</span>
                  <span className={`text-xs font-medium ${f.done ? "text-primary" : "text-muted-foreground"}`}>{f.done ? "✓" : f.size}</span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: f.w }} />
                </div>
              </div>
            ))}
            <p className="text-xs text-center text-muted-foreground pt-1">4 fichiers · 12,7 MB</p>
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
  );
}

function ChromaVisual() {
  const swatches = [
    { c: "bg-violet-500", active: true },
    { c: "bg-rose-400", active: false },
    { c: "bg-amber-400", active: false },
    { c: "bg-pink-400", active: false },
    { c: "bg-indigo-500", active: false },
    { c: "bg-orange-400", active: false },
    { c: "bg-emerald-400", active: false },
    { c: "bg-sky-400", active: false },
  ];
  return (
    <MacWindow>
      <div className="flex flex-col h-72">
        <div className="flex items-center gap-1 px-4 py-2.5 border-b border-border bg-muted/50">
          <div className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground cursor-pointer">Par date</div>
          <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-background shadow-sm border border-border cursor-pointer text-foreground">Par couleur ✦</div>
        </div>
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 flex-wrap border-b border-border">
          {swatches.map((s, i) => (
            <div key={i} className={`${s.c} rounded-full w-7 h-7 cursor-pointer shrink-0 ${s.active ? "ring-2 ring-offset-2 ring-violet-400 scale-110" : "opacity-60"}`} />
          ))}
        </div>
        <div className="flex-1 p-4 flex flex-col gap-2 overflow-hidden">
          <p className="text-xs text-muted-foreground">
            48 photos · Tonalité <span className="text-violet-500 font-semibold">violette</span>
          </p>
          <div className="grid grid-cols-4 gap-2">
            {["bg-violet-300", "bg-violet-500", "bg-violet-400", "bg-indigo-400", "bg-purple-400", "bg-violet-300", "bg-violet-600", "bg-indigo-300"].map((c, i) => (
              <div key={i} className={`${c} rounded-xl h-14`} />
            ))}
          </div>
        </div>
      </div>
    </MacWindow>
  );
}

function ShareVisual() {
  return (
    <MacWindow>
      <div className="p-5 flex flex-col gap-4 h-72">
        <div className="rounded-2xl overflow-hidden flex-1 relative flex items-end" style={{ background: "linear-gradient(135deg,#6366f1 0%,#a78bfa 50%,#c084fc 100%)" }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </div>
          </div>
          <div className="p-3 w-full" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.45), transparent)" }}>
            <p className="text-xs text-white/90 font-medium">album_été_2025.zip</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 border border-border">
          <span className="flex-1 text-xs text-muted-foreground font-mono truncate">photoapp.fr/s/xK92j</span>
          <Button size="sm" className="h-6 text-xs px-3 rounded-md shrink-0">
            Copier
          </Button>
        </div>
        <div className="flex gap-2">
          {[
            { val: "12", label: "vues aujourd'hui" },
            { val: "5", label: "téléchargements" },
            { val: "✓", label: "sans inscription" },
          ].map((s) => (
            <div key={s.label} className="flex-1 bg-muted/50 rounded-xl p-3 border border-border flex flex-col gap-0.5">
              <span className="text-base font-bold text-foreground">{s.val}</span>
              <span className="text-[10px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </MacWindow>
  );
}

function AlbumsVisual() {
  const albums = [
    { name: "Été 2025", count: "84 photos", colors: ["bg-orange-400", "bg-amber-300", "bg-yellow-400", "bg-orange-300"] },
    { name: "Bretagne", count: "37 photos", colors: ["bg-sky-400", "bg-blue-500", "bg-cyan-300", "bg-sky-300"] },
    { name: "Portrait studio", count: "22 photos", colors: ["bg-violet-400", "bg-purple-500", "bg-violet-300", "bg-indigo-400"] },
    { name: "Architecture", count: "51 photos", colors: ["bg-zinc-400", "bg-slate-500", "bg-zinc-300", "bg-slate-400"] },
  ];
  return (
    <MacWindow>
      <div className="flex flex-col h-72">
        <div className="px-4 py-2.5 border-b border-border bg-muted/50 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">Mes albums</span>
          <span className="text-xs text-primary font-medium cursor-pointer">+ Nouvel album</span>
        </div>
        <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
          {albums.map((a) => (
            <div key={a.name} className="flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-2.5 border border-border/50">
              <div className="grid grid-cols-2 gap-0.5 w-10 h-10 rounded-lg overflow-hidden shrink-0">
                {a.colors.map((c, j) => (
                  <div key={j} className={`${c} w-full h-full`} />
                ))}
              </div>
              <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">{a.name}</span>
                <span className="text-xs text-muted-foreground">{a.count}</span>
              </div>
              <button className="flex items-center gap-1 px-2.5 py-1 bg-background border border-border rounded-full text-xs font-medium text-foreground shrink-0">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Partager
              </button>
            </div>
          ))}
        </div>
      </div>
    </MacWindow>
  );
}

// — Feature sections —

export function UploadFeature() {
  return (
    <FeatureRow>
      <FeatureText
        tag="Upload"
        title={
          <>
            Glissez, déposez,
            <br />
            c'est fait.
          </>
        }
        description="Importez vos photos en quelques secondes par glisser-déposer ou sélection multiple. PhotoApp accepte JPG, PNG, HEIC et RAW jusqu'à 50 MB par fichier.">
        <CheckList items={["Import par lot jusqu'à 200 photos à la fois", "Formats JPG, PNG, HEIC, RAW supportés", "Progression en temps réel avec aperçu immédiat", "Stockage sécurisé, photos conservées indéfiniment"]} />
        <Link href="/register" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all">
          Essayer l'upload →
        </Link>
      </FeatureText>
      <div className="flex-[1.4]">
        <UploadVisual />
      </div>
    </FeatureRow>
  );
}

export function ChromaFeature() {
  return (
    <FeatureRow reverse>
      <FeatureText
        tag="Killer Feature"
        title={
          <>
            Explorez par
            <br />
            <span className="text-primary">ambiance.</span>
          </>
        }
        description="Fini les galeries chronologiques. PhotoApp analyse automatiquement la palette de chaque photo et vous permet de naviguer par teinte — retrouvez toutes vos photos « heure dorée » en un clic.">
        <CheckList items={["Analyse colorimétrique automatique à l'import", "Navigation par ambiance : violet, doré, bleu, vert…", "Regroupement intelligent de photos similaires", "Aucune action manuelle requise"]} />
        <Button asChild className="w-fit rounded-full bg-foreground text-background hover:bg-foreground/80">
          <Link href="#">Découvrir la feature →</Link>
        </Button>
      </FeatureText>
      <div className="flex-[1.4]">
        <ChromaVisual />
      </div>
    </FeatureRow>
  );
}

export function ShareFeature() {
  return (
    <FeatureRow>
      <FeatureText
        tag="Partage"
        title={
          <>
            Partagez en
            <br />
            un lien.
          </>
        }
        description="Générez un lien de partage en un clic. Vos destinataires accèdent directement à la photo ou à l'album, sans inscription, sans friction.">
        <CheckList items={["Lien unique par photo ou par album", "Aucun compte requis pour les destinataires", "Statistiques de vues et de téléchargements", "Lien désactivable à tout moment"]} />
        <Link href="#" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all">
          Voir la démo →
        </Link>
      </FeatureText>
      <div className="flex-[1.4]">
        <ShareVisual />
      </div>
    </FeatureRow>
  );
}

export function AlbumsFeature() {
  return (
    <FeatureRow reverse>
      <FeatureText
        tag="Albums & Organisation"
        title={
          <>
            Organisez à<br />
            votre façon.
          </>
        }
        description="Créez des albums thématiques, par événement ou par projet. Chaque album génère sa propre mosaïque et son propre lien de partage.">
        <CheckList items={["Albums illimités, même en offre gratuite", "Mosaïque générée automatiquement", "Partage d'album en un lien unique", "Réorganisation par glisser-déposer"]} />
        <Link href="#" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all">
          Voir les albums →
        </Link>
      </FeatureText>
      <div className="flex-[1.4]">
        <AlbumsVisual />
      </div>
    </FeatureRow>
  );
}

export function GlowBoxes() {
  return (
    <>
      <div className="absolute top-0 right-[5%] w-[1100px] h-[1100px] bg-violet-300/15 rounded-full blur-[200px] pointer-events-none" />
      <div className="absolute top-[35%] left-0 w-[1000px] h-[1000px] bg-violet-200/15 rounded-full blur-[200px] pointer-events-none" />
      <div className="absolute top-[70%] right-[5%] w-[900px] h-[900px] bg-violet-300/15 rounded-full blur-[200px] pointer-events-none" />
    </>
  );
}
