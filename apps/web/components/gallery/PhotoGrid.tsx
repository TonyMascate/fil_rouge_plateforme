"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, CheckCheck, LayoutGrid, Grid3x3, ImageOff, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { type GalleryPhoto, type PhotoListPage, type SortOrder } from "@/lib/useGalleryPhotos";
import { usePhotoSelection } from "@/lib/usePhotoSelection";
import { groupByMonth, groupByYear } from "./group-by-month";
import { GallerySidebar } from "./GallerySidebar";
import { PhotoDetailModal } from "./PhotoDetailModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Density = "dense" | "large";

const GRID_CLASS: Record<Density, string> = {
  dense: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
  large: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
};

interface InfiniteQueryLike {
  data: { pages: PhotoListPage[] } | undefined;
  isLoading: boolean;
  isError: boolean;
  fetchNextPage: () => unknown;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
}

interface DestructiveActionConfig {
  /** Action déclenchée par la modale de confirmation */
  onConfirm: (ids: string[]) => Promise<void>;
  singleTitle: string;
  bulkTitle: (count: number) => string;
  description: string;
  confirmLabel: string;
}

interface EmptyStateConfig {
  title: string;
  description: string;
  /** Bouton optionnel affiché sous le message (ex : "Ajouter des photos") */
  cta?: ReactNode;
}

interface PhotoGridProps {
  query: InfiniteQueryLike;
  order: SortOrder;
  onOrderChange: (order: SortOrder) => void;

  /** Élément(s) injecté(s) à gauche de la toolbar en mode normal (titre, retour, count, etc.) */
  toolbarStart: ReactNode;
  /**
   * Action(s) en mode sélection.
   * - `requestConfirm(ids)` : ouvre la modale destructive
   * - `clearSelection()` : vide la sélection (utile après une action non-destructive comme "Ajouter à un album")
   */
  selectionActions: (
    selectedIds: string[],
    requestConfirm: (ids: string[]) => void,
    clearSelection: () => void,
  ) => ReactNode;
  /** Bouton(s) supplémentaires en mode normal (ex : partager album, ajouter photos) */
  ownerActions?: ReactNode;
  /** Configuration de l'action destructive (suppression définitive OU retrait album) */
  destructiveAction: DestructiveActionConfig;
  /** Quels IDs déclencher quand on supprime depuis la modale photo */
  emptyState: EmptyStateConfig;
  /** Surcharges spécifiques à la galerie principale (badge "Partagée" sur chaque photo) */
  renderCellOverlay?: (photo: GalleryPhoto) => ReactNode;
}

const GRID_SKELETON_KEYS = Array.from({ length: 18 }, (_, index) => `grid-sk-${index}`);
const NEXT_GRID_SKELETON_KEYS = Array.from({ length: 6 }, (_, index) => `grid-next-sk-${index}`);

export function PhotoGrid({
  query,
  order,
  onOrderChange,
  toolbarStart,
  selectionActions,
  ownerActions,
  destructiveAction,
  emptyState,
  renderCellOverlay,
}: Readonly<PhotoGridProps>) {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  const [density, setDensity] = useState<Density>("dense");
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);
  const [pendingIds, setPendingIds] = useState<string[] | null>(null);
  const [running, setRunning] = useState(false);

  const { selected, selectionMode, toggleSelect, clearSelection, selectAll, removeFromSelection, handlePointerDown, handlePointerMove, handlePointerUp, handleCellClick } = usePhotoSelection();

  const photos = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const allSelected = photos.length > 0 && selected.size === photos.length;
  const total = data?.pages[0]?.total ?? 0;
  const monthGroups = useMemo(() => groupByMonth(photos), [photos]);
  const yearGroups = useMemo(() => groupByYear(monthGroups), [monthGroups]);

  // Scroll infini
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { rootMargin: "600px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  async function confirm() {
    const ids = pendingIds;
    if (!ids || ids.length === 0) return;
    setRunning(true);
    try {
      // Le parent gère le toast d'erreur via son propre try/catch dans onConfirm.
      // Ici on se contente de ne pas nettoyer la sélection si ça a échoué.
      await destructiveAction.onConfirm(ids);
      removeFromSelection(ids);
      if (activePhoto && ids.includes(activePhoto.id)) setActivePhoto(null);
      setPendingIds(null);
    } catch {
      // Volontairement silencieux : onConfirm a déjà toasté
    } finally {
      setRunning(false);
    }
  }

  let body: ReactNode;
  if (isLoading) {
    body = (
      <div className={cn("grid gap-1", GRID_CLASS[density])}>
        {GRID_SKELETON_KEYS.map((skeletonKey) => <Skeleton key={skeletonKey} className="aspect-square rounded-md" />)}
      </div>
    );
  } else if (isError) {
    body = (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
        <ImageOff className="size-8" />
        <p>Impossible de charger les photos.</p>
      </div>
    );
  } else if (photos.length === 0) {
    body = (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center text-muted-foreground">
        <ImageOff className="size-8" />
        <div>
          <p className="text-base font-medium text-foreground">{emptyState.title}</p>
          <p className="text-sm">{emptyState.description}</p>
        </div>
        {emptyState.cta}
      </div>
    );
  } else {
    body = (
      <>
        {monthGroups.map((group) => (
          <section key={group.key} id={`month-${group.key}`} className="mb-8 scroll-mt-32">
            <div className="mb-3.5 flex items-baseline gap-2">
              <h2 className="text-base font-semibold tracking-tight">{group.label}</h2>
              <span className="text-sm text-muted-foreground">· {group.photos.length} photo{group.photos.length > 1 ? "s" : ""}</span>
            </div>
            <div className={cn("grid gap-1", GRID_CLASS[density])}>
              {group.photos.map((photo) => {
                const isSelected = selected.has(photo.id);
                let checkboxClass = "border-white bg-black/20 opacity-0 group-hover:opacity-100";
                if (isSelected) checkboxClass = "border-primary bg-primary opacity-100";
                else if (selectionMode) checkboxClass = "border-white bg-black/40 opacity-100";
                return (
                  <div
                    key={photo.id}
                    onClick={() => handleCellClick(photo, setActivePhoto)}
                    onPointerDown={(e) => handlePointerDown(e, photo.id)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className={cn("group relative aspect-square cursor-pointer overflow-hidden rounded-md bg-muted select-none touch-pan-y [-webkit-touch-callout:none]", isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.originalName} loading="lazy" className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                    <div className={cn("absolute inset-0 transition-colors", isSelected ? "bg-primary/25" : "group-hover:bg-black/15")} />
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id); }}
                      className={cn("absolute left-1.5 top-1.5 z-[2] flex size-5 items-center justify-center rounded-full border-2 transition-opacity", checkboxClass)}
                      aria-label={isSelected ? "Désélectionner" : "Sélectionner"}>
                      {isSelected && <Check className="size-3 text-white" />}
                    </button>
                    {renderCellOverlay?.(photo)}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        <div ref={sentinelRef} className="h-1" />
        {isFetchingNextPage && (
          <div className={cn("mt-1 grid gap-1", GRID_CLASS[density])}>
            {NEXT_GRID_SKELETON_KEYS.map((skeletonKey) => <Skeleton key={skeletonKey} className="aspect-square rounded-md" />)}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-1 min-h-0">
      <GallerySidebar total={total} years={yearGroups} onJumpToMonth={(key) => document.getElementById(`month-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" })} />

      <main className="min-w-0 flex-1 px-4 pb-16 sm:px-8">
        {/* Toolbar */}
        <div className="sticky top-16 z-20 -mx-4 mb-6 flex h-14 items-center gap-3 border-b border-border bg-background px-4 sm:-mx-8 sm:px-8">
          {selectionMode ? (
            <>
              <Button variant="ghost" size="icon-sm" onClick={clearSelection} aria-label="Annuler la sélection">
                <X className="size-4" />
              </Button>
              <span className="text-sm font-medium">
                {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => (allSelected ? clearSelection() : selectAll(photos.map((photo) => photo.id)))}
              >
                <CheckCheck className="size-4" />
                <span className="hidden sm:inline">{allSelected ? "Tout désélectionner" : "Tout sélectionner"}</span>
              </Button>
              <div className="flex-1" />
              {selectionActions(Array.from(selected), setPendingIds, clearSelection)}
            </>
          ) : (
            <>
              {toolbarStart}
              <div className="flex-1" />
              {ownerActions}
              <Select value={order} onValueChange={(value) => onOrderChange(value as SortOrder)}>
                <SelectTrigger size="sm" className="min-w-0" aria-label="Trier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Plus récentes</SelectItem>
                  <SelectItem value="asc">Plus anciennes</SelectItem>
                </SelectContent>
              </Select>
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
        {body}
      </main>

      {activePhoto && (
        <PhotoDetailModal
          key={activePhoto.id}
          photo={activePhoto}
          photos={photos}
          onClose={() => setActivePhoto(null)}
          onNavigate={setActivePhoto}
          onRequestDelete={() => setPendingIds([activePhoto.id])}
        />
      )}

      {/* Confirmation unifiée : single (modale photo) OU bulk (sélection) */}
      <AlertDialog open={pendingIds !== null} onOpenChange={(open) => { if (!open && !running) setPendingIds(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {(pendingIds?.length ?? 0) > 1
                ? destructiveAction.bulkTitle(pendingIds?.length ?? 0)
                : destructiveAction.singleTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>{destructiveAction.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirm(); }}
              disabled={running}
              className="bg-destructive text-white hover:bg-destructive/90">
              {destructiveAction.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
