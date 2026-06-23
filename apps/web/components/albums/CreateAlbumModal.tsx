"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreateAlbumSchema, type CreateAlbumDto } from "@repo/shared";

interface CreateAlbumModalProps {
  onClose: () => void;
  onSubmit: (name: string) => void;
  loading?: boolean;
  initialName?: string;
  title?: string;
  submitLabel?: string;
}

export function CreateAlbumModal({
  onClose,
  onSubmit,
  loading = false,
  initialName = "",
  title = "Nouvel album",
  submitLabel = "Créer l'album",
}: Readonly<CreateAlbumModalProps>) {
  const { register, handleSubmit, formState: { errors, isValid } } = useForm<CreateAlbumDto>({
    resolver: zodResolver(CreateAlbumSchema),
    defaultValues: { name: initialName },
    mode: "onChange",
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onValid(data: CreateAlbumDto) {
    onSubmit(data.name);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-[440px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-2xl animate-in slide-in-from-bottom-2">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <span className="text-base font-semibold">{title}</span>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <X className="size-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onValid)}>
          <div className="px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="album-name">Nom de l'album</Label>
              <Input
                id="album-name"
                placeholder="Ex : Vacances d'été"
                disabled={loading}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" className="rounded-full" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" className="rounded-full" disabled={!isValid || loading}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
