"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { X, Check, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useGalleryPhotos } from "@/lib/useGalleryPhotos";
import { useAddPhotosToAlbum, useAlbumPhotoIds } from "@/lib/useAlbums";
import { ERROR_MESSAGES } from "@/lib/error-messages";
import type { ErrorCode } from "@repo/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_PHOTOS_PER_BATCH = 200;

const SKELETON_KEYS = Array.from({ length: 18 }, (_, index) => `pick-sk-${index}`);
const NEXT_SKELETON_KEYS = Array.from({ length: 6 }, (_, index) => `pick-next-sk-${index}`);

interface PickPhotosModalProps {
  albumId: string;
  onClose: () => void;
}

export function PickPhotosModal({ albumId, onClose }: Readonly<PickPhotosModalProps>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const addPhotos = useAddPhotosToAlbum();
  const { data: existingIds = [] } = useAlbumPhotoIds(albumId);
  const existingSet = useMemo(() => new Set(existingIds), [existingIds]);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useGalleryPhotos("desc");
  const photos = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleSelect(id: string) {
    if (existingSet.has(id)) return;
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_PHOTOS_PER_BATCH) {
          toast.error(`Maximum ${MAX_PHOTOS_PER_BATCH} photos par ajout`);
          return cur;
        }
        next.add(id);
      }
      return next;
    });
  }

  async function handleConfirm() {
    if (selected.size === 0 || addPhotos.isPending) return;
    try {
      await addPhotos.mutateAsync({ albumId, photoIds: Array.from(selected) });
      const count = selected.size;
      toast.success(`${count} photo${count > 1 ? "s" : ""} ajoutée${count > 1 ? "s" : ""} à l'album`);
      onClose();
    } catch (err) {
      const code = (err as { response?: { data?: { code?: ErrorCode } } })?.response?.data?.code;
      toast.error((code && ERROR_MESSAGES[code]) || "Impossible d'ajouter les photos");
    }
  }

  const selectedCount = selected.size;
  const pluralSuffix = selectedCount > 1 ? "s" : "";
  const confirmLabel = selectedCount > 0 ? `Ajouter ${selectedCount} photo${pluralSuffix}` : "Ajouter";

  let gridContent: React.ReactNode;
  if (isLoading) {
    gridContent = (
      <div className="grid grid-cols-4 gap-1 sm:grid-cols-5 md:grid-cols-6">
        {SKELETON_KEYS.map((skeletonKey) => (
          <Skeleton key={skeletonKey} className="aspect-square rounded-md" />
        ))}
      </div>
    );
  } else if (isError) {
    gridContent = (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <ImageOff className="size-8" />
        <p>Impossible de charger les photos.</p>
      </div>
    );
  } else if (photos.length === 0) {
    gridContent = (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
        <ImageOff className="size-8" />
        <p className="text-sm">Aucune photo dans votre galerie.</p>
      </div>
    );
  } else {
    gridContent = (
      <>
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-5 md:grid-cols-6">
          {photos.map((photo) => {
            const alreadyAdded = existingSet.has(photo.id);
            const isSelected = selected.has(photo.id);

            return (
              <button
                key={photo.id}
                onClick={() => toggleSelect(photo.id)}
                disabled={alreadyAdded}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-md bg-muted transition-transform active:scale-95",
                  isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  alreadyAdded && "cursor-default opacity-60",
                )}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.originalName} loading="lazy" className="size-full object-cover" />

                {alreadyAdded ? (
                  /* Déjà dans l'album */
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="flex size-6 items-center justify-center rounded-full bg-primary shadow-sm">
                      <Check className="size-3.5 text-white" />
                    </div>
                  </div>
                ) : (
                  /* Sélectionnable */
                  <>
                    <div className={cn("absolute inset-0 transition-colors", isSelected ? "bg-primary/25" : "group-hover:bg-black/10")} />
                    <div className={cn(
                      "absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full border-2 transition-all",
                      isSelected ? "border-primary bg-primary" : "border-white bg-black/20 opacity-0 group-hover:opacity-100",
                    )}>
                      {isSelected && <Check className="size-3 text-white" />}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
        <div ref={sentinelRef} className="mt-2 h-1" />
        {isFetchingNextPage && (
          <div className="mt-1 grid grid-cols-4 gap-1 sm:grid-cols-5 md:grid-cols-6">
            {NEXT_SKELETON_KEYS.map((skeletonKey) => <Skeleton key={skeletonKey} className="aspect-square rounded-md" />)}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-black/35 backdrop-blur-sm animate-in fade-in" />
      <div className="relative mx-auto mt-12 flex w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-t-2xl bg-background shadow-2xl animate-in slide-in-from-bottom-4 sm:rounded-2xl sm:mt-16 sm:max-h-[80vh]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div>
            <span className="text-base font-semibold">Choisir des photos</span>
            {selectedCount > 0 && (
              <span className="ml-2 text-sm text-muted-foreground">
                {selectedCount} sélectionnée{selectedCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <X className="size-3.5" />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {gridContent}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-border px-6 py-4">
          <span className="text-xs text-muted-foreground">
            {existingSet.size > 0 && `${existingSet.size} photo${existingSet.size > 1 ? "s" : ""} déjà dans l'album`}
          </span>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-full" onClick={onClose} disabled={addPhotos.isPending}>
              Annuler
            </Button>
            <Button className="rounded-full" onClick={handleConfirm} disabled={selectedCount === 0 || addPhotos.isPending}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
