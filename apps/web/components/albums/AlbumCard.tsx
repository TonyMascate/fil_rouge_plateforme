"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Album } from "@/lib/useAlbums";

interface AlbumCardProps {
  album: Album;
  onRename: (album: Album) => void;
  onShare: (album: Album) => void;
  onDelete: (album: Album) => void;
}

export function AlbumCard({ album, onRename, onShare, onDelete }: Readonly<AlbumCardProps>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cnt = Math.min(album.covers.length, 4) as 0 | 1 | 2 | 3 | 4;

  return (
    <div className="group relative">
      <Link href={`/albums/${album.id}`} className="block cursor-pointer">
        {cnt > 0 ? (
          <div
            className={cn(
              "aspect-square overflow-hidden rounded-xl bg-muted transition-[box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg",
              cnt === 1 && "grid grid-cols-1",
              cnt === 2 && "grid grid-cols-2 gap-0.5",
              cnt === 3 && "grid grid-cols-2 gap-0.5",
              cnt === 4 && "grid grid-cols-2 gap-0.5",
            )}>
            {album.covers.slice(0, cnt).map((src, coverIndex) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt=""
                loading="lazy"
                className={cn(
                  "size-full object-cover",
                  cnt === 3 && coverIndex === 0 && "row-span-2",
                )}
              />
            ))}
          </div>
        ) : (
          <div className="aspect-square rounded-xl border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground transition-[box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
            <ImageIcon className="size-6" strokeWidth={1.2} />
            <span className="text-xs">Vide</span>
          </div>
        )}

        <div className="mt-2 flex flex-col gap-0.5">
          <span className="truncate text-sm font-semibold text-foreground">{album.name}</span>
          <span className="text-xs text-muted-foreground">
            {album.photoCount} photo{album.photoCount === 1 ? "" : "s"}
            {!album.isOwner && " · Partagé avec moi"}
          </span>
        </div>
      </Link>

      {album.isOwner && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); setMenuOpen((v) => !v); }}
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-md border border-black/8 bg-white/85 text-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:opacity-100 focus-visible:opacity-100"
            aria-label="Options de l'album">
            <MoreHorizontal className="size-3.5" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-2 top-10 z-50 min-w-40 overflow-hidden rounded-xl border border-border bg-white shadow-xl">
                <button
                  className="block w-full px-3.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                  onClick={() => { onRename(album); setMenuOpen(false); }}>
                  Renommer
                </button>
                <button
                  className="block w-full px-3.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                  onClick={() => { onShare(album); setMenuOpen(false); }}>
                  Partager
                </button>
                <button
                  className="block w-full px-3.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-muted"
                  onClick={() => { onDelete(album); setMenuOpen(false); }}>
                  Supprimer
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
