"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, LayoutGrid, Grid3x3, Trash2, ImageOff, X } from "lucide-react";

import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import { useGalleryPhotos, type GalleryPhoto, type SortOrder } from "@/lib/useGalleryPhotos";
import { groupByMonth, groupByYear } from "./group-by-month";
import { GallerySidebar } from "./GallerySidebar";
import { PhotoDetailModal } from "./PhotoDetailModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Density = "dense" | "large";

const GRID_CLASS: Record<Density, string> = {
  dense: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
  large: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
};

// Long-press tactile : durée minimum d'appui et tolérance de mouvement avant annulation (scroll).
const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE_PX = 10;

export default function Gallery() {
  const queryClient = useQueryClient();
  const [order, setOrder] = useState<SortOrder>("desc");
  const [density, setDensity] = useState<Density>("dense");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);
  // Suppression unifiée : un seul état liste pour single (modale) et bulk (sélection).
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useGalleryPhotos(order);

  const photos = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;
  const monthGroups = useMemo(() => groupByMonth(photos), [photos]);
  const yearGroups = useMemo(() => groupByYear(monthGroups), [monthGroups]);

  // Scroll infini : sentinelle en bas de liste.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((current) => {
      const nextSelection = new Set(current);
      if (nextSelection.has(id)) nextSelection.delete(id);
      else nextSelection.add(id);
      return nextSelection;
    });
  }, []);

  // Sélection tactile : long-press pour entrer en mode sélection. Une fois dedans,
  // chaque tap sur une autre photo la sélectionne/désélectionne (logique mode iOS Photos).
  // Mode dérivé de selected.size > 0 (pas d'état séparé à synchroniser).
  const selectionMode = selected.size > 0;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClick = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressStart.current = null;
  }, []);

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  function handlePointerDown(event: React.PointerEvent, photoId: string) {
    if (event.pointerType !== "touch") return; // long-press = tactile uniquement
    clearLongPress();
    longPressStart.current = { x: event.clientX, y: event.clientY };
    longPressTimer.current = setTimeout(() => {
      setSelected((current) => {
        const nextSelection = new Set(current);
        nextSelection.add(photoId);
        return nextSelection;
      });
      suppressNextClick.current = true;
      if ("vibrate" in navigator) navigator.vibrate(15);
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (event.pointerType !== "touch") return;
    // Le doigt a bougé avant que le long-press n'expire → c'est un scroll, on annule.
    if (longPressStart.current && longPressTimer.current) {
      const deltaX = event.clientX - longPressStart.current.x;
      const deltaY = event.clientY - longPressStart.current.y;
      if (Math.hypot(deltaX, deltaY) > MOVE_TOLERANCE_PX) clearLongPress();
    }
  }

  function handlePointerUp(event: React.PointerEvent) {
    if (event.pointerType !== "touch") return;
    clearLongPress();
  }

  function handleCellClick(photo: GalleryPhoto) {
    // Le click qui suit un long-press est ignoré (sinon ouvre la modale).
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    if (selectionMode) toggleSelect(photo.id);
    else setActivePhoto(photo);
  }

  function jumpToMonth(key: string) {
    document.getElementById(`month-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Suppression unifiée : gère aussi bien un seul id (depuis la modale) qu'une sélection bulk.
  async function confirmDelete() {
    const ids = pendingDeleteIds;
    if (!ids || ids.length === 0) return;
    setDeleting(true);
    try {
      await Promise.all(ids.map((id) => api.delete(`/photos/${id}`)));
      toast.success(ids.length > 1 ? `${ids.length} photos supprimées` : "Photo supprimée");
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      setSelected((current) => {
        const next = new Set(current);
        for (const id of ids) next.delete(id);
        return next;
      });
      if (activePhoto && ids.includes(activePhoto.id)) setActivePhoto(null);
      setPendingDeleteIds(null);
    } catch {
      toast.error("Échec de la suppression");
    } finally {
      setDeleting(false);
    }
  }

  const selectedCount = selected.size;

  return (
    <div className="flex flex-1">
      <GallerySidebar total={total} years={yearGroups} onJumpToMonth={jumpToMonth} />

      <main className="min-w-0 flex-1 px-4 pb-16 sm:px-8">
        {/* Toolbar — deux modes exclusifs pour rester lisible sur mobile */}
        <div className="sticky top-16 z-20 -mx-4 mb-6 flex h-14 items-center gap-3 border-b border-border bg-background px-4 sm:-mx-8 sm:px-8">
          {selectionMode ? (
            // --- Mode sélection : occupe toute la barre ---
            <>
              <Button variant="ghost" size="icon-sm" onClick={() => setSelected(new Set())} aria-label="Annuler la sélection">
                <X className="size-4" />
              </Button>
              <span className="text-sm font-medium">
                {selectedCount} sélectionnée{selectedCount > 1 ? "s" : ""}
              </span>
              <div className="flex-1" />
              <Button variant="destructive" size="sm" onClick={() => setPendingDeleteIds(Array.from(selected))}>
                <Trash2 className="size-4" />
                <span className="hidden sm:inline">Supprimer</span>
              </Button>
            </>
          ) : (
            // --- Mode normal ---
            <>
              <h1 className="text-lg font-bold tracking-tight">Galerie</h1>
              <span className="text-sm text-muted-foreground">
                {total} photo{total > 1 ? "s" : ""}
              </span>
              <div className="flex-1" />

              <select value={order} onChange={(event) => setOrder(event.target.value as SortOrder)} className="h-8 rounded-lg border border-border bg-card px-2 text-sm outline-none" aria-label="Trier">
                <option value="desc">Plus récentes</option>
                <option value="asc">Plus anciennes</option>
              </select>

              {/* Toggle densité : desktop uniquement (peu utile sur mobile, gain de place) */}
              <div className="hidden items-center gap-1 md:flex">
                <Button variant="ghost" size="icon-sm" className={cn(density === "dense" && "bg-primary/8 text-primary")} onClick={() => setDensity("dense")} aria-label="Grille serrée">
                  <Grid3x3 className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" className={cn(density === "large" && "bg-primary/8 text-primary")} onClick={() => setDensity("large")} aria-label="Grille large">
                  <LayoutGrid className="size-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Contenu */}
        {isLoading ? (
          <div className={cn("grid gap-1", GRID_CLASS[density])}>
            {Array.from({ length: 18 }).map((_, skeletonIndex) => (
              <Skeleton key={skeletonIndex} className="aspect-square rounded-md" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
            <ImageOff className="size-8" />
            <p>Impossible de charger vos photos.</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-24 text-center text-muted-foreground">
            <ImageOff className="size-8" />
            <p className="text-base font-medium text-foreground">Aucune photo</p>
            <p className="text-sm">Importez des photos pour démarrer votre galerie.</p>
          </div>
        ) : (
          <>
            {monthGroups.map((group) => (
              <section key={group.key} id={`month-${group.key}`} className="mb-8 scroll-mt-32">
                <div className="mb-3.5 flex items-baseline gap-2">
                  <h2 className="text-base font-semibold tracking-tight">{group.label}</h2>
                  <span className="text-sm text-muted-foreground">
                    · {group.photos.length} photo{group.photos.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className={cn("grid gap-1", GRID_CLASS[density])}>
                  {group.photos.map((photo) => {
                    const isSelected = selected.has(photo.id);
                    return (
                      <div key={photo.id} onClick={() => handleCellClick(photo)} onPointerDown={(event) => handlePointerDown(event, photo.id)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} className={cn("group relative aspect-square cursor-pointer overflow-hidden rounded-md bg-muted select-none touch-pan-y [-webkit-touch-callout:none]", isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={photo.originalName} loading="lazy" className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                        <div className={cn("absolute inset-0 transition-colors", isSelected ? "bg-primary/25" : "group-hover:bg-black/15")} />

                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleSelect(photo.id);
                          }}
                          className={cn("absolute left-1.5 top-1.5 z-[2] flex size-5 items-center justify-center rounded-full border-2 transition-opacity", isSelected ? "border-primary bg-primary opacity-100" : selectionMode ? "border-white bg-black/40 opacity-100" : "border-white bg-black/20 opacity-0 group-hover:opacity-100")}
                          aria-label={isSelected ? "Désélectionner" : "Sélectionner"}>
                          {isSelected && <Check className="size-3 text-white" />}
                        </button>

                        {photo.shareToken && <span className="absolute right-1.5 top-1.5 z-[2] rounded-full bg-primary/90 px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">Partagée</span>}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            <div ref={sentinelRef} className="h-1" />
            {isFetchingNextPage && (
              <div className={cn("mt-1 grid gap-1", GRID_CLASS[density])}>
                {Array.from({ length: 6 }).map((_, skeletonIndex) => (
                  <Skeleton key={skeletonIndex} className="aspect-square rounded-md" />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {activePhoto && <PhotoDetailModal key={activePhoto.id} photo={activePhoto} photos={photos} onClose={() => setActivePhoto(null)} onNavigate={setActivePhoto} onRequestDelete={() => setPendingDeleteIds([activePhoto.id])} />}

      {/* AlertDialog unifié : single (depuis la modale) ET bulk (depuis la sélection).
          Le contenu s'adapte au nombre d'ids. Monté au niveau Gallery (pas dans la modale)
          pour éviter le conflit de z-index et le bug de cleanup Radix au démontage parent. */}
      <AlertDialog
        open={pendingDeleteIds !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDeleteIds(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{(pendingDeleteIds?.length ?? 0) > 1 ? `Supprimer ${pendingDeleteIds?.length} photos ?` : "Supprimer cette photo ?"}</AlertDialogTitle>
            <AlertDialogDescription>Cette action est définitive. {(pendingDeleteIds?.length ?? 0) > 1 ? "Les photos seront retirées" : "La photo sera retirée"} de votre galerie et du stockage.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
