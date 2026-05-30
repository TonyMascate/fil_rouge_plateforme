"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, ChevronLeft, ChevronRight, Download, Trash2, Share2, Copy, Check, Globe, Lock, FolderPlus } from "lucide-react";

import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import type { GalleryPhoto } from "@/lib/useGalleryPhotos";
import { AddToAlbumModal } from "@/components/albums/AddToAlbumModal";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
}

// Bouton icône du header de la modale (close / download / delete) — même style partout.
function HeaderIconButton({ onClick, ariaLabel, children }: { onClick: () => void; ariaLabel: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={ariaLabel} className="flex size-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white">
      {children}
    </button>
  );
}

interface PhotoDetailModalProps {
  photo: GalleryPhoto;
  photos: GalleryPhoto[];
  onClose: () => void;
  onNavigate: (photo: GalleryPhoto) => void;
  onRequestDelete: () => void;
}

export function PhotoDetailModal({ photo, photos, onClose, onNavigate, onRequestDelete }: PhotoDetailModalProps) {
  const queryClient = useQueryClient();
  const index = useMemo(() => photos.findIndex((candidate) => candidate.id === photo.id), [photos, photo.id]);
  const previous = index > 0 ? photos[index - 1] : null;
  const next = index < photos.length - 1 ? photos[index + 1] : null;

  const [shareToken, setShareToken] = useState<string | null>(photo.shareToken);
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addToAlbumOpen, setAddToAlbumOpen] = useState(false);

  const isShared = shareToken !== null;
  const shareUrl = shareToken ? `${window.location.origin}/p/${shareToken}` : "";

  // Note : le parent monte la modale avec key={photo.id} → changer de photo la remonte,
  // ce qui réinitialise shareToken/sharePanelOpen depuis les props. Pas d'effet de resync.

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && previous) onNavigate(previous);
      if (event.key === "ArrowRight" && next) onNavigate(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previous, next, onClose, onNavigate]);

  // Bloque le scroll de la galerie en arrière-plan tant que la modale est ouverte.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(photo.url);
      if (!response.ok) throw new Error("fetch failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = photo.originalName || "photo";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback si CORS bloque le fetch : ouvre l'image dans un onglet.
      window.open(photo.url, "_blank");
    }
  }, [photo.url, photo.originalName]);

  async function toggleShare(nextShared: boolean) {
    setBusy(true);
    try {
      if (nextShared) {
        const response = await api.post<{ shareToken: string }>(`/photos/${photo.id}/share`);
        setShareToken(response.data.shareToken);
      } else {
        await api.delete(`/photos/${photo.id}/share`);
        setShareToken(null);
      }
      queryClient.invalidateQueries({ queryKey: ["photos"] });
    } catch {
      toast.error("Échec de la mise à jour du partage");
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const stripStart = Math.max(0, index - 3);
  const stripEnd = Math.min(photos.length, index + 4);
  const strip = photos.slice(stripStart, stripEnd);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/92"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <HeaderIconButton onClick={onClose} ariaLabel="Fermer">
            <X className="size-5" />
          </HeaderIconButton>
          <span className="text-sm text-white/50">
            {index + 1} / {photos.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Partage */}
          <div className="relative">
            <button onClick={() => setSharePanelOpen((open) => !open)} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", isShared ? "border-primary/40 bg-primary/15 text-white" : "border-white/15 text-white/70 hover:bg-white/10 hover:text-white")}>
              <Share2 className="size-3.5" />
              {isShared ? "Partagée" : "Partager"}
            </button>

            {sharePanelOpen && (
              <div className="fixed right-3 top-[64px] z-10 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl sm:right-4 sm:top-[68px]" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isShared ? <Globe className="size-4 text-primary" /> : <Lock className="size-4 text-muted-foreground" />}
                    <div>
                      <div className="text-sm font-medium">{isShared ? "Lien public actif" : "Photo privée"}</div>
                      <div className="text-xs text-muted-foreground">{isShared ? "Toute personne avec le lien peut voir" : "Visible par vous seul"}</div>
                    </div>
                  </div>
                  <Switch checked={isShared} disabled={busy} onCheckedChange={toggleShare} />
                </div>

                {isShared && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-1.5 pl-3">
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{shareUrl}</span>
                    <Button size="icon-sm" variant="ghost" onClick={copyLink} aria-label="Copier le lien">
                      {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setAddToAlbumOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white">
            <FolderPlus className="size-3.5" />
            Album
          </button>

          <HeaderIconButton onClick={handleDownload} ariaLabel="Télécharger">
            <Download className="size-[18px]" />
          </HeaderIconButton>

          <HeaderIconButton onClick={onRequestDelete} ariaLabel="Supprimer">
            <Trash2 className="size-[18px]" />
          </HeaderIconButton>
        </div>
      </div>

      {/* Image + navigation */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 sm:px-16">
        {previous && (
          <button onClick={() => onNavigate(previous)} className="absolute left-4 z-10 flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20" aria-label="Précédente">
            <ChevronLeft className="size-5" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={photo.id} src={photo.url} alt={photo.originalName} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl select-none" />

        {next && (
          <button onClick={() => onNavigate(next)} className="absolute right-4 z-10 flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20" aria-label="Suivante">
            <ChevronRight className="size-5" />
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-between gap-4 px-6 py-4">
        <span className="text-sm text-white/60">{formatDate(photo.createdAt)}</span>
        <div className="flex items-center gap-1">
          {strip.map((thumb) => (
            <button key={thumb.id} onClick={() => onNavigate(thumb)} className={cn("overflow-hidden rounded-md border-2 transition-all", thumb.id === photo.id ? "size-11 border-white opacity-100" : "size-9 border-transparent opacity-50 hover:opacity-80")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {addToAlbumOpen && (
        <AddToAlbumModal
          photoIds={[photo.id]}
          onClose={() => setAddToAlbumOpen(false)}
        />
      )}
    </div>
  );
}
