import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MacWindow } from "@/components/ui/MacWindow";
import { FeatureText, FeatureRow, CheckList } from "@/components/ui/FeatureSection";

function AppPreviewImage() {
  return <Image src="/boilerplate.png" alt="Aperçu de PhotoApp" width={1902} height={915} className="w-full h-auto block" />;
}

// — Visuals —

function UploadVisual() {
  return (
    <div className="relative">
      <MacWindow>
        <AppPreviewImage />
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

// Aperçu générique partagé par les sections Chroma / Partage / Albums
// (UploadVisual reste distinct car il porte le badge d'optimisation).
function PreviewVisual() {
  return (
    <MacWindow>
      <AppPreviewImage />
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
      <div className="flex-[1.4] mt-8">
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
        <PreviewVisual />
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
        <PreviewVisual />
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
        <PreviewVisual />
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
