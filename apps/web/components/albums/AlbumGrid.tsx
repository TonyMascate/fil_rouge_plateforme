"use client";

import { useMemo, useState } from "react";
import { Plus, FolderOpen, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAlbums, useCreateAlbum, useRenameAlbum, useDeleteAlbum, type Album } from "@/lib/useAlbums";
import { AlbumCard } from "./AlbumCard";
import { CreateAlbumModal } from "./CreateAlbumModal";
import { ShareAlbumModal } from "./ShareAlbumModal";

type SortKey = "date" | "alpha" | "count";

export default function AlbumGrid() {
  const { data: albums, isLoading, isError } = useAlbums();
  const createAlbum = useCreateAlbum();
  const renameAlbum = useRenameAlbum();
  const deleteAlbum = useDeleteAlbum();

  const [sort, setSort] = useState<SortKey>("date");
  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<Album | null>(null);
  const [sharing, setSharing] = useState<Album | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Album | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sorted = useMemo(() => [...(albums ?? [])].sort((a, b) => {
    if (sort === "date") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === "alpha") return a.name.localeCompare(b.name, "fr");
    if (sort === "count") return b.photoCount - a.photoCount;
    return 0;
  }), [albums, sort]);

  async function handleCreate(name: string) {
    try {
      await createAlbum.mutateAsync(name);
      setCreateOpen(false);
      toast.success(`Album « ${name} » créé`);
    } catch {
      toast.error("Impossible de créer l'album");
    }
  }

  async function handleRename(name: string) {
    if (!renaming) return;
    try {
      await renameAlbum.mutateAsync({ id: renaming.id, name });
      setRenaming(null);
      toast.success("Album renommé");
    } catch {
      toast.error("Impossible de renommer l'album");
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteAlbum.mutateAsync(pendingDelete.id);
      toast.success(`Album « ${pendingDelete.name} » supprimé`);
      setPendingDelete(null);
    } catch {
      toast.error("Impossible de supprimer l'album");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* Toolbar */}
      <div className="sticky top-16 z-20 flex h-14 items-center gap-2 border-b border-border bg-background px-4 sm:gap-3 sm:px-8">
        <h1 className="shrink-0 text-lg font-bold tracking-tight">Albums</h1>
        {albums && (
          <span className="hidden shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground sm:inline">
            {albums.length} album{albums.length !== 1 ? "s" : ""}
          </span>
        )}
        <div className="flex-1" />

        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger size="sm" className="min-w-0" aria-label="Trier">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Plus récents</SelectItem>
            <SelectItem value="alpha">Alphabétique</SelectItem>
            <SelectItem value="count">Nombre de photos</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => setCreateOpen(true)} className="shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/85">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nouvel album</span>
        </Button>
      </div>

      {/* Contenu */}
      <main className="flex-1 overflow-y-auto px-4 pb-16 sm:px-8 pt-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
            <ImageOff className="size-8" />
            <p>Impossible de charger vos albums.</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center text-muted-foreground">
            <FolderOpen className="size-12" strokeWidth={1} />
            <div>
              <p className="text-base font-semibold text-foreground">Aucun album</p>
              <p className="text-sm">Créez votre premier album pour organiser vos photos.</p>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="rounded-full">
              <Plus className="size-4" />
              Créer un album
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {sorted.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onRename={(a) => setRenaming(a)}
                onShare={(a) => setSharing(a)}
                onDelete={(a) => setPendingDelete(a)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {createOpen && (
        <CreateAlbumModal
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          loading={createAlbum.isPending}
        />
      )}

      {renaming && (
        <CreateAlbumModal
          title="Renommer l'album"
          submitLabel="Renommer"
          initialName={renaming.name}
          onClose={() => setRenaming(null)}
          onSubmit={handleRename}
          loading={renameAlbum.isPending}
        />
      )}

      {sharing && (
        <ShareAlbumModal album={sharing} onClose={() => setSharing(null)} />
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open && !deleting) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {pendingDelete?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'album sera supprimé définitivement. Les photos restent dans votre galerie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
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
