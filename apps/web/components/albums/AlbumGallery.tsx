"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, FolderMinus, Users, FolderPlus } from "lucide-react";
import Link from "next/link";
import { type SortOrder } from "@/lib/useGalleryPhotos";
import { useAlbumPhotos } from "@/lib/useAlbumPhotos";
import { useAlbum, useRemovePhotoFromAlbum } from "@/lib/useAlbums";
import { PhotoGrid } from "@/components/gallery/PhotoGrid";
import { Button } from "@/components/ui/button";
import { PickPhotosModal } from "./PickPhotosModal";
import { ShareAlbumModal } from "./ShareAlbumModal";

interface AlbumGalleryProps {
  albumId: string;
}

export default function AlbumGallery({ albumId }: AlbumGalleryProps) {
  const { data: album } = useAlbum(albumId);
  const [order, setOrder] = useState<SortOrder>("desc");
  const [sharingOpen, setSharingOpen] = useState(false);
  const [addToAlbumOpen, setAddToAlbumOpen] = useState(false);

  const removePhoto = useRemovePhotoFromAlbum();
  const query = useAlbumPhotos(albumId, order);
  const total = query.data?.pages[0]?.total ?? 0;

  async function handleRemove(ids: string[]) {
    try {
      await Promise.all(ids.map((id) => removePhoto.mutateAsync({ albumId, photoId: id })));
      toast.success(ids.length > 1 ? `${ids.length} photos retirées de l'album` : "Photo retirée de l'album");
    } catch {
      toast.error("Échec du retrait");
      throw new Error("remove failed");
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
            <Button variant="ghost" size="icon-sm" asChild aria-label="Retour aux albums">
              <Link href="/albums"><ChevronLeft className="size-4" /></Link>
            </Button>
            <h1 className="text-lg font-bold tracking-tight truncate">{album?.name ?? "Album"}</h1>
            <span className="text-sm text-muted-foreground shrink-0">{total} photo{total !== 1 ? "s" : ""}</span>
          </>
        }
        ownerActions={album?.isOwner && (
          <>
            <Button variant="outline" size="sm" onClick={() => setAddToAlbumOpen(true)}>
              <FolderPlus className="size-4" />
              <span className="hidden sm:inline">Ajouter des photos</span>
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setSharingOpen(true)} aria-label="Partager">
              <Users className="size-4" />
            </Button>
          </>
        )}
        selectionActions={(selectedIds, requestConfirm) => (
          <Button variant="outline" size="sm" onClick={() => requestConfirm(selectedIds)}>
            <FolderMinus className="size-4" />
            <span className="hidden sm:inline">Retirer de l'album</span>
          </Button>
        )}
        destructiveAction={{
          onConfirm: handleRemove,
          singleTitle: "Retirer cette photo de l'album ?",
          bulkTitle: (n) => `Retirer ${n} photos de l'album ?`,
          description: "Les photos restent dans votre galerie. Seule leur appartenance à cet album sera supprimée.",
          confirmLabel: "Retirer",
        }}
        emptyState={{
          title: "Aucune photo dans cet album",
          description: "Ajoutez des photos depuis votre galerie.",
          cta: album?.isOwner ? (
            <Button variant="outline" className="rounded-full" onClick={() => setAddToAlbumOpen(true)}>
              <FolderPlus className="size-4" />
              Ajouter des photos
            </Button>
          ) : undefined,
        }}
      />

      {sharingOpen && album && <ShareAlbumModal album={album} onClose={() => setSharingOpen(false)} />}

      {addToAlbumOpen && (
        <PickPhotosModal albumId={albumId} onClose={() => setAddToAlbumOpen(false)} />
      )}
    </>
  );
}
