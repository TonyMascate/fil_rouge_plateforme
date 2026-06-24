"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus, FolderPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlbums, useAddPhotosToAlbum, useCreateAlbum } from "@/lib/useAlbums";
import { ERROR_MESSAGES } from "@/lib/error-messages";
import type { ErrorCode } from "@repo/shared";

interface AddToAlbumModalProps {
  photoIds: string[];
  onClose: () => void;
  onDone?: () => void;
}

export function AddToAlbumModal({ photoIds, onClose, onDone }: Readonly<AddToAlbumModalProps>) {
  const { data: albums, isLoading } = useAlbums();
  const addPhotos = useAddPhotosToAlbum();
  const createAlbum = useCreateAlbum();
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const newNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (creatingNew) newNameRef.current?.focus();
  }, [creatingNew]);

  async function handleSelect(albumId: string) {
    try {
      await addPhotos.mutateAsync({ albumId, photoIds });
      const count = photoIds.length;
      toast.success(`${count} photo${count > 1 ? "s" : ""} ajoutée${count > 1 ? "s" : ""} à l'album`);
      onDone?.();
      onClose();
    } catch (err) {
      const code = (err as { response?: { data?: { code?: ErrorCode } } })?.response?.data?.code;
      toast.error((code && ERROR_MESSAGES[code]) || "Impossible d'ajouter les photos à l'album");
    }
  }

  async function handleCreateAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || createAlbum.isPending) return;
    try {
      const album = await createAlbum.mutateAsync(newName.trim());
      await addPhotos.mutateAsync({ albumId: album.id, photoIds });
      const count = photoIds.length;
      toast.success(`Album « ${album.name} » créé avec ${count} photo${count > 1 ? "s" : ""}`);
      onDone?.();
      onClose();
    } catch (err) {
      const code = (err as { response?: { data?: { code?: ErrorCode } } })?.response?.data?.code;
      toast.error((code && ERROR_MESSAGES[code]) || "Impossible de créer l'album");
    }
  }

  const ownedAlbums = albums?.filter((a) => a.isOwner) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-black/35 backdrop-blur-sm animate-in fade-in" />
      <div className="relative w-[400px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-2xl animate-in slide-in-from-bottom-2">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <span className="text-base font-semibold">
            Ajouter {photoIds.length} photo{photoIds.length > 1 ? "s" : ""} à un album
          </span>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <X className="size-3.5" />
          </button>
        </div>

        <div className="flex max-h-80 flex-col overflow-y-auto py-2">
          {isLoading ? (
            ["sk-1", "sk-2", "sk-3"].map((skeletonKey) => (
              <div key={skeletonKey} className="flex items-center gap-3 px-6 py-3">
                <Skeleton className="size-10 rounded-lg" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))
          ) : (
            <>
              {ownedAlbums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => handleSelect(album.id)}
                  disabled={addPhotos.isPending}
                  className="flex w-full items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-muted">
                  <div className="size-10 overflow-hidden rounded-lg bg-muted shrink-0">
                    {album.covers[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={album.covers[0]} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="size-full" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{album.name}</span>
                    <span className="text-xs text-muted-foreground">{album.photoCount} photo{album.photoCount === 1 ? "" : "s"}</span>
                  </div>
                  <Plus className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}

              {ownedAlbums.length === 0 && !creatingNew && (
                <p className="px-6 py-4 text-sm text-muted-foreground text-center">
                  Vous n'avez pas encore d'album.
                </p>
              )}
            </>
          )}
        </div>

        <div className="border-t border-border px-6 py-4">
          {creatingNew ? (
            <form onSubmit={handleCreateAndAdd} className="flex items-center gap-2">
              <Input
                ref={newNameRef}
                placeholder="Nom du nouvel album"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={100}
                disabled={createAlbum.isPending}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!newName.trim() || createAlbum.isPending} aria-label="Créer">
                <Check className="size-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" onClick={() => setCreatingNew(false)}>
                <X className="size-4" />
              </Button>
            </form>
          ) : (
            <button
              onClick={() => setCreatingNew(true)}
              className="flex w-full items-center gap-2 text-sm font-medium text-primary hover:underline">
              <FolderPlus className="size-4" />
              Créer un nouvel album
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
