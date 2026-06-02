"use client";

import { useEffect, useRef, useState } from "react";
import { X, UserPlus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddAlbumMember, useRemoveAlbumMember, type Album, type AlbumMember } from "@/lib/useAlbums";
import { ERROR_MESSAGES } from "@/lib/error-messages";
import type { ErrorCode } from "@repo/shared";

interface ShareAlbumModalProps {
  album: Album;
  onClose: () => void;
}

function getInitials(firstName: string, lastName: string) {
  return ((firstName[0] ?? "") + (lastName[0] ?? "")).toUpperCase() || "?";
}

export function ShareAlbumModal({ album, onClose }: ShareAlbumModalProps) {
  const [email, setEmail] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const addMember = useAddAlbumMember();
  const removeMember = useRemoveAlbumMember();

  const [members, setMembers] = useState<AlbumMember[]>(album.members ?? []);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || addMember.isPending) return;
    try {
      const newMember = await addMember.mutateAsync({ albumId: album.id, email: email.trim() });
      setMembers((prev) => [...prev.filter((m) => m.id !== newMember.id), newMember]);
      setEmail("");
      toast.success(`Album partagé avec ${newMember.firstName} ${newMember.lastName}`);
    } catch (err) {
      const code = (err as { response?: { data?: { code?: ErrorCode } } })?.response?.data?.code;
      toast.error((code && ERROR_MESSAGES[code]) || "Impossible de partager l'album");
    }
  }

  async function handleRemove(member: AlbumMember) {
    try {
      await removeMember.mutateAsync({ albumId: album.id, memberId: member.id });
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success("Accès retiré");
    } catch {
      toast.error("Impossible de retirer l'accès");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-[480px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-2xl animate-in slide-in-from-bottom-2">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <span className="text-base font-semibold">Partager « {album.name} »</span>
          </div>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <X className="size-3.5" />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <form onSubmit={handleAdd} className="flex flex-col gap-1.5">
            <Label htmlFor="share-email">Inviter par email</Label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                id="share-email"
                type="email"
                placeholder="adresse@exemple.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={addMember.isPending}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!email.trim() || addMember.isPending} aria-label="Inviter">
                <UserPlus className="size-4" />
              </Button>
            </div>
          </form>

          {members.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Membres</span>
              <ul className="flex flex-col divide-y divide-border">
                {members.map((member) => (
                  <li key={member.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {getInitials(member.firstName, member.lastName)}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{member.firstName} {member.lastName}</span>
                      <span className="truncate text-xs text-muted-foreground">{member.email}</span>
                    </div>
                    <button
                      onClick={() => handleRemove(member)}
                      disabled={removeMember.isPending}
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Retirer l'accès">
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {members.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-2">
              Cet album n'est encore partagé avec personne.
            </p>
          )}
        </div>

        <div className="flex justify-end border-t border-border px-6 py-4">
          <Button variant="outline" className="rounded-full" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
