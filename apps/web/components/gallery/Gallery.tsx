"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, FolderPlus } from "lucide-react";

import { useGalleryPhotos, type GalleryPhoto, type SortOrder } from "@/lib/useGalleryPhotos";
import { useDeletePhoto } from "@/lib/useDeletePhoto";
import { AddToAlbumModal } from "@/components/albums/AddToAlbumModal";
import { Button } from "@/components/ui/button";
import { PhotoGrid } from "./PhotoGrid";

export default function Gallery() {
  const deletePhoto = useDeletePhoto();
  const [order, setOrder] = useState<SortOrder>("desc");
  const [addToAlbumState, setAddToAlbumState] = useState<{ ids: string[]; clear: () => void } | null>(null);

  const query = useGalleryPhotos(order);
  const total = query.data?.pages[0]?.total ?? 0;

  async function handleDelete(ids: string[]) {
    try {
      await Promise.all(ids.map((id) => deletePhoto.mutateAsync(id)));
      toast.success(ids.length > 1 ? `${ids.length} photos supprimées` : "Photo supprimée");
    } catch {
      toast.error("Échec de la suppression");
      throw new Error("delete failed");
    }
  }

  return (
    <>
      <PhotoGrid
        query={query}
        order={order}
        onOrderChange={setOrder}
        toolbarStart={
          <>
            <h1 className="text-lg font-bold tracking-tight">Galerie</h1>
            <span className="hidden text-sm text-muted-foreground sm:inline">{total} photo{total > 1 ? "s" : ""}</span>
          </>
        }
        selectionActions={(selectedIds, requestConfirm, clearSelection) => (
          <>
            <Button variant="outline" size="sm" onClick={() => setAddToAlbumState({ ids: selectedIds, clear: clearSelection })}>
              <FolderPlus className="size-4" />
              <span className="hidden sm:inline">Ajouter à un album</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => requestConfirm(selectedIds)}>
              <Trash2 className="size-4" />
              <span className="hidden sm:inline">Supprimer</span>
            </Button>
          </>
        )}
        destructiveAction={{
          onConfirm: handleDelete,
          singleTitle: "Supprimer cette photo ?",
          bulkTitle: (n) => `Supprimer ${n} photos ?`,
          description: "Cette action est définitive. Les photos seront retirées de votre galerie et du stockage.",
          confirmLabel: "Supprimer",
        }}
        emptyState={{
          title: "Aucune photo",
          description: "Importez des photos pour démarrer votre galerie.",
        }}
        renderCellOverlay={(photo: GalleryPhoto) =>
          photo.shareToken && (
            <span className="absolute right-1.5 top-1.5 z-[2] rounded-full bg-primary/90 px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
              Partagée
            </span>
          )
        }
      />

      {addToAlbumState && (
        <AddToAlbumModal
          photoIds={addToAlbumState.ids}
          onClose={() => setAddToAlbumState(null)}
          onDone={() => { addToAlbumState.clear(); setAddToAlbumState(null); }}
        />
      )}
    </>
  );
}
