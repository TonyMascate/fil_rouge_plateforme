"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImageOff, Palette } from "lucide-react";
import type { ColorAtlasCellDto } from "@repo/shared";

import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import { useColorAtlas, useColorCellPhotos } from "@/lib/useColoredPhotos";
import { useAlbums } from "@/lib/useAlbums";
import type { GalleryPhoto } from "@/lib/useGalleryPhotos";
import { PhotoDetailModal } from "@/components/gallery/PhotoDetailModal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ChromaticExplorer() {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);

  const { data: atlas, isLoading, isError } = useColorAtlas(selectedAlbumId);
  const { data: albums } = useAlbums();
  // On ne propose que les albums dont on est propriétaire : ce sont les seuls qui
  // contiennent nos propres photos (l'exploration est scopée à notre bibliothèque).
  const ownedAlbums = useMemo(() => albums?.filter((album) => album.isOwner) ?? [], [albums]);

  const totalPhotos = useMemo(
    () => atlas?.reduce((sum, cell) => sum + cell.count, 0) ?? 0,
    [atlas],
  );
  const selectedCell = atlas?.find((cell) => cell.cellId === selectedCellId) ?? null;

  // Changer d'album remet la sélection à zéro (les counts ne correspondent plus).
  const handleAlbumChange = (albumId: string | null) => {
    setSelectedAlbumId(albumId);
    setSelectedCellId(null);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <Skeleton className="mb-6 h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <ImageOff className="size-8" />
        <p>Impossible de charger l&apos;exploration chromatique.</p>
      </div>
    );
  }

  const photoPlural = totalPhotos > 1 ? "s" : "";
  const summaryText = totalPhotos > 0
    ? `${totalPhotos} photo${photoPlural} réparties sur votre nuancier · choisissez une teinte`
    : "Aucune photo dans cette vue";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exploration chromatique</h1>
          <p className="mt-1 text-sm text-muted-foreground">{summaryText}</p>
        </div>

        {ownedAlbums.length > 0 && (
          <Select
            value={selectedAlbumId ?? "all"}
            onValueChange={(value) => handleAlbumChange(value === "all" ? null : value)}
          >
            <SelectTrigger className="h-9 w-[200px]" aria-label="Filtrer par album">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les photos</SelectItem>
              {ownedAlbums.map((album) => (
                <SelectItem key={album.id} value={album.id}>
                  {album.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </header>

      {totalPhotos === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
          <Palette className="size-9" strokeWidth={1.2} />
          <div>
            <p className="text-base font-medium text-foreground">
              {selectedAlbumId ? "Aucune photo dans cet album" : "Aucune photo à explorer"}
            </p>
            <p className="text-sm">
              {selectedAlbumId
                ? "Choisissez un autre album ou « Toutes les photos »."
                : "Importez des photos pour révéler votre palette de couleurs."}
            </p>
          </div>
        </div>
      ) : (
        <>
          <ColorAtlas
            cells={atlas ?? []}
            selectedCellId={selectedCellId}
            onSelect={(cellId) => setSelectedCellId((current) => (current === cellId ? null : cellId))}
          />

          {selectedCell && <CellResults cell={selectedCell} albumId={selectedAlbumId} />}
        </>
      )}
    </div>
  );
}

// ─── Le nuancier (grille fixe de cellules) ───────────────────────────────────

function ColorAtlas({
  cells,
  selectedCellId,
  onSelect,
}: Readonly<{
  cells: ColorAtlasCellDto[];
  selectedCellId: string | null;
  onSelect: (cellId: string) => void;
}>) {
  const chromatic = cells.filter((cell) => cell.kind === "chromatic");
  const neutrals = cells.filter((cell) => cell.kind === "neutral");
  const maxCount = Math.max(1, ...cells.map((cell) => cell.count));

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      {/* Cellules chromatiques : 12 teintes (colonnes) × 4 clartés (lignes).
          Placement explicite pour garantir l'agencement quel que soit l'ordre du tableau.
          Sur mobile, 12 colonnes seraient illisibles → colonnes à largeur fixe + scroll
          horizontal ; à partir de `sm`, la grille se répartit sur toute la largeur. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
        <div className="grid grid-cols-[repeat(12,2.5rem)] gap-1.5 sm:grid-cols-[repeat(12,minmax(0,1fr))]">
          {chromatic.map((cell) => (
            <div key={cell.cellId} style={{ gridColumn: (cell.hueIndex ?? 0) + 1, gridRow: cell.lightIndex + 1 }}>
              <Swatch
                cell={cell}
                maxCount={maxCount}
                selected={cell.cellId === selectedCellId}
                onSelect={onSelect}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Neutres (noir → blanc) sur leur propre rangée. */}
      <div className="mt-4 border-t border-border pt-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Noir &amp; blanc
        </div>
        <div className="grid max-w-xs grid-cols-5 gap-1.5">
          {neutrals.map((cell) => (
            <Swatch
              key={cell.cellId}
              cell={cell}
              maxCount={maxCount}
              selected={cell.cellId === selectedCellId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Swatch({
  cell,
  maxCount,
  selected,
  onSelect,
}: Readonly<{
  cell: ColorAtlasCellDto;
  maxCount: number;
  selected: boolean;
  onSelect: (cellId: string) => void;
}>) {
  const isEmpty = cell.count === 0;
  // Les cellules peuplées sont opaques ; les vides s'estompent. L'intensité de
  // la lueur suit le nombre de photos → la collection « éclaire » le nuancier.
  const fill = Math.min(1, cell.count / maxCount);

  return (
    <button
      type="button"
      disabled={isEmpty}
      onClick={() => onSelect(cell.cellId)}
      aria-label={`${cell.label} — ${cell.count} photo${cell.count > 1 ? "s" : ""}`}
      title={`${cell.label} · ${cell.count}`}
      className={cn(
        "group relative aspect-square w-full rounded-md transition-all duration-200",
        isEmpty ? "cursor-default opacity-20" : "cursor-pointer hover:scale-[1.08] hover:z-10",
        selected && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
      )}
      style={{
        backgroundColor: cell.hex,
        boxShadow: isEmpty ? undefined : `0 0 ${4 + fill * 16}px ${cell.hex}`,
      }}
    >
      {!isEmpty && (
        <span className="absolute inset-x-0 bottom-0.5 text-center text-[10px] font-semibold text-white/90 opacity-0 drop-shadow transition-opacity group-hover:opacity-100">
          {cell.count}
        </span>
      )}
    </button>
  );
}

// ─── Résultats : photos de la cellule sélectionnée ──────────────────────────

const CELL_SKELETON_KEYS = Array.from({ length: 12 }, (_, index) => `cell-sk-${index}`);
const CELL_NEXT_SKELETON_KEYS = Array.from({ length: 6 }, (_, index) => `cell-next-sk-${index}`);

function CellResults({ cell, albumId }: Readonly<{ cell: ColorAtlasCellDto; albumId: string | null }>) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useColorCellPhotos(cell.cellId, albumId);

  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const photos: GalleryPhoto[] = useMemo(
    () =>
      data?.pages.flatMap((page) =>
        page.items.map((item) => ({
          id: item.id,
          url: item.url,
          originalName: item.originalName,
          createdAt: String(item.createdAt),
          shareToken: item.shareToken,
        })),
      ) ?? [],
    [data],
  );
  const total = data?.pages[0]?.total ?? 0;

  // Scroll infini
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "600px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  async function confirmDelete() {
    const id = pendingDeleteId;
    if (!id) return;
    setDeleting(true);
    try {
      await api.delete(`/photos/${id}`);
      await queryClient.invalidateQueries({ queryKey: ["colors"] });
      await queryClient.invalidateQueries({ queryKey: ["photos"] });
      if (activePhoto?.id === id) setActivePhoto(null);
      setPendingDeleteId(null);
    } catch {
      toast.error("Échec de la suppression");
    } finally {
      setDeleting(false);
    }
  }

  let resultsBody: React.ReactNode;
  if (isLoading) {
    resultsBody = (
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {CELL_SKELETON_KEYS.map((skeletonKey) => (
          <Skeleton key={skeletonKey} className="aspect-square rounded-md" />
        ))}
      </div>
    );
  } else if (isError) {
    resultsBody = (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <ImageOff className="size-7" />
        <p>Impossible de charger ces photos.</p>
      </div>
    );
  } else {
    resultsBody = (
      <>
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setActivePhoto(photo)}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-md bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.originalName}
                loading="lazy"
                className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 transition-colors group-hover:bg-black/15" />
            </button>
          ))}
        </div>
        <div ref={sentinelRef} className="h-1" />
        {isFetchingNextPage && (
          <div className="mt-1 grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {CELL_NEXT_SKELETON_KEYS.map((skeletonKey) => (
              <Skeleton key={skeletonKey} className="aspect-square rounded-md" />
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-block size-5 rounded-full border border-border" style={{ backgroundColor: cell.hex }} />
        <h2 className="text-lg font-semibold capitalize tracking-tight">{cell.label}</h2>
        <span className="text-sm text-muted-foreground">
          {total} photo{total > 1 ? "s" : ""}
        </span>
      </div>

      {resultsBody}

      {activePhoto && (
        <PhotoDetailModal
          key={activePhoto.id}
          photo={activePhoto}
          photos={photos}
          onClose={() => setActivePhoto(null)}
          onNavigate={setActivePhoto}
          onRequestDelete={() => setPendingDeleteId(activePhoto.id)}
        />
      )}

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => { if (!open && !deleting) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette photo ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est définitive et supprime la photo de votre bibliothèque.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => { event.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
